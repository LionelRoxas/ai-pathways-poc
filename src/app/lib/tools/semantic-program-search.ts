/**
 * Semantic Program Search Tool
 * 
 * This implements a search architecture similar to how AI assistants analyze data:
 * 1. Load ALL data first (no pre-filtering)
 * 2. Use2. Generate a COMPREHENSIVE list of related fields/synonyms (minimum 5-8 related terms):
   
   Examples by field:
   - "cybersecurity" OR "cyber security" → ["cybersecurity", "cyber security", "information security", "network security", "computer security", "cyber operations", "security specialist", "information assurance", "cyber defense"]
   - "computer science" → ["computer science", "computing", "information technology", "IT", "software engineering", "computer information systems", "information and computer sciences"]
   - "nursing" → ["nursing", "healthcare", "registered nurse", "RN", "medical", "nursing practice", "health services", "patient care"]
   - "engineering" → ["engineering", "engineer", "technology", "applied science", "technical", "industrial technology"]
   
   CRITICAL: Include ALL possible variations!
   - Word variations: BOTH "cyber security" AND "cybersecurity" (with and without spaces)
   - Abbreviations: "IT" for "information technology", "RN" for "registered nurse"
   - Related specializations: For "cybersecurity", include "network security", "cloud security", etc.
   - Individual words: "cyber" and "security" as separate terms tooderstanding (LLM-based)
 * 3. Rank by actual relevance, not keyword matching
 * 4. Return comprehensive results
 * 
 * Benefits:
 * - More accurate results
 * - Finds related programs (synonyms, similar fields)
 * - Better handling of ambiguous queries
 * - Understands user intent, not just keywords
 */

import Groq from "groq-sdk";
import { getJSONLReader } from "./jsonl-reader";
import { getIslandMappingTool } from "./island-mapping-tools";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface EnhancedProgram {
  iro_institution: string;
  program: string;
  program_desc: string;
  degree_level: string;
  cip_code: string;
}

export interface SemanticSearchResult {
  program: EnhancedProgram;
  campus: string;
  relevanceScore: number;
  reasoning: string;
  matchType: 'exact' | 'synonym' | 'related' | 'broad';
}

export class SemanticProgramSearch {
  private reader = getJSONLReader();
  private islandTool = getIslandMappingTool();
  private programCache: EnhancedProgram[] | null = null;

  /**
   * SEMANTIC SEARCH - Like how AI assistants search
   * 
   * Instead of keyword matching, we:
   * 1. Load ALL programs
   * 2. Use LLM to understand query intent
   * 3. Use LLM to rank programs by relevance
   * 4. Return comprehensive results
   */
  async semanticSearch(
    userQuery: string,
    island?: string,
    options: {
      maxResults?: number;
      minRelevance?: number;
      conversationContext?: string;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    const { 
      maxResults = 50, 
      minRelevance = 5,
      conversationContext = ''
    } = options;

    console.log(`[SemanticSearch] 🧠 Starting semantic search for: "${userQuery}"`);
    
    // STEP 1: Load ALL programs (no pre-filtering!)
    const allPrograms = await this.getAllPrograms();
    console.log(`[SemanticSearch] 📊 Loaded ${allPrograms.length} total programs`);
    
    // STEP 2: Apply island filter if specified (only geographic filter)
    let programsToSearch = allPrograms;
    if (island) {
      const codes = await this.islandTool.getInstitutionCodesByIsland(island);
      const allowedInstitutions = new Set(codes);
      programsToSearch = allPrograms.filter(p => allowedInstitutions.has(p.iro_institution));
      console.log(`[SemanticSearch] 🏝️  Filtered to ${programsToSearch.length} programs on ${island}`);
    }
    
    // STEP 3: Use LLM to understand query intent and extract search criteria
    const searchIntent = await this.extractSearchIntent(userQuery, conversationContext);
    console.log(`[SemanticSearch] 🎯 Intent: ${searchIntent.primaryField} (${searchIntent.intentType})`);
    
    // STEP 4: Two-phase search for efficiency
    // Phase 1: Fast keyword pre-filter (keep 70% of programs)
    const keywordFiltered = this.fastKeywordFilter(programsToSearch, searchIntent);
    console.log(`[SemanticSearch] ⚡ Fast filter: ${keywordFiltered.length} candidate programs`);
    
    // SAFETY NET: If fast filter is too aggressive and returns nothing, try broader search
    if (keywordFiltered.length === 0 && programsToSearch.length > 0) {
      console.log(`[SemanticSearch] ⚠️ Fast filter too strict - falling back to broader search`);
      
      // Try with just the primary field as a single word
      const primaryWords = searchIntent.primaryField.split(/[\s\-_(),&]+/);
      const broadResults = programsToSearch.filter(program => {
        const combinedText = `${program.program_desc} ${program.program}`.toLowerCase();
        return primaryWords.some(word => 
          word.length > 2 && combinedText.includes(word)
        );
      });
      
      console.log(`[SemanticSearch] 🔄 Broader search found ${broadResults.length} candidates`);
      
      // If still nothing, return top programs for LLM to evaluate
      if (broadResults.length === 0) {
        console.log(`[SemanticSearch] ⚠️ No keyword matches - using all programs for LLM evaluation`);
        return programsToSearch.slice(0, 100).map(program => ({
          program,
          campus: this.islandTool.mapInstitutionToCampus(program.iro_institution),
          relevanceScore: 3,  // Low score, but let LLM decide
          reasoning: 'No keyword match - included for broad evaluation',
          matchType: 'broad' as const,
        }));
      }
      
      // Use broader results for ranking
      const semanticRanked = await this.semanticRanking(
        userQuery,
        broadResults.slice(0, 200),
        searchIntent,
        conversationContext
      );
      
      const filtered = semanticRanked
        .filter(r => r.relevanceScore >= minRelevance)
        .slice(0, maxResults);
      
      console.log(`[SemanticSearch] ✅ Returning ${filtered.length} results from broader search`);
      return filtered;
    }
    
    // Phase 2: LLM semantic ranking (process in batches)
    const semanticRanked = await this.semanticRanking(
      userQuery,
      keywordFiltered,
      searchIntent,
      conversationContext
    );
    
    // STEP 5: Filter by minimum relevance and return top results
    // CRITICAL FIX: Ensure campus diversity - don't drop programs from different institutions
    // When multiple programs have the same name (e.g., "Computer Science" at Manoa and Hilo),
    // we need to return ALL of them, not just a subset from one campus.
    const filtered = semanticRanked
      .filter(r => r.relevanceScore >= minRelevance)
      .slice(0, maxResults);
    
    // DEBUG: Log if we have duplicate program names from different campuses
    const programNameGroups = new Map<string, Set<string>>();
    filtered.forEach(r => {
      const name = r.program.program_desc;
      if (!programNameGroups.has(name)) {
        programNameGroups.set(name, new Set());
      }
      programNameGroups.get(name)!.add(r.program.iro_institution);
    });
    
    for (const [name, institutions] of programNameGroups.entries()) {
      if (institutions.size > 1) {
        console.log(`[SemanticSearch] 📍 "${name}" found at ${institutions.size} institutions: ${Array.from(institutions).join(', ')}`);
      }
    }
    
    console.log(`[SemanticSearch] ✅ Returning ${filtered.length} results (min relevance: ${minRelevance})`);
    
    return filtered;
  }

  /**
   * Extract search intent using LLM
   * This is like how I understand what you're really asking for
   */
  private async extractSearchIntent(
    userQuery: string,
    conversationContext: string
  ): Promise<{
    primaryField: string;
    relatedFields: string[];
    intentType: 'specific' | 'exploratory' | 'comparative';
    degreeLevel?: string;
  }> {
    try {
      const prompt = `Analyze this educational program search query and extract the search intent.

Query: "${userQuery}"
${conversationContext ? `\n\nConversation Context:\n${conversationContext}\n` : ''}

Your task:
1. Identify the PRIMARY field of study being discussed
   ${conversationContext ? '(Look at the conversation context if the query alone is unclear)' : ''}
   Examples: "computer science", "nursing", "engineering", "cybersecurity"

2. Generate a COMPREHENSIVE list of related fields/synonyms (minimum 5-8 related terms):
   
   Examples by field:
   - "cybersecurity" → ["information security", "network security", "computer security", "cyber operations", "security specialist", "information assurance", "cyber defense"]
   - "computer science" → ["computing", "information technology", "IT", "software engineering", "computer information systems", "information and computer sciences"]
   - "nursing" → ["healthcare", "registered nurse", "RN", "medical", "nursing practice", "health services", "patient care"]
   - "engineering" → ["engineer", "technology", "applied science", "technical", "industrial technology"]
   
   CRITICAL: Include ALL possible variations, abbreviations, and related terms!
   - Word variations: "cyber security" AND "cybersecurity"
   - Abbreviations: "IT" for "information technology", "RN" for "registered nurse"
   - Related specializations: For "cybersecurity", include "network security", "cloud security", etc.

3. Determine intent type:
   - "specific": Looking for exact program
   - "exploratory": Browsing/exploring options  
   - "comparative": Comparing programs

4. Check for degree level: "2-Year", "4-Year", "Non-Credit", or null

Return as JSON:
{
  "primaryField": "main field (extract from context if needed)",
  "relatedFields": ["term1", "term2", "term3", "term4", "term5", "term6", "term7", "term8"],
  "intentType": "exploratory",
  "degreeLevel": null
}

REMEMBER: More related fields = better coverage! Include 5-8 minimum.`;

      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "openai/gpt-oss-20b", // Fast intent extraction: 1000 tps, 87% cheaper
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      console.log(`[SemanticSearch] 🎯 Intent extracted:`);
      console.log(`[SemanticSearch]    Primary: ${result.primaryField || userQuery}`);
      console.log(`[SemanticSearch]    Related: ${(result.relatedFields || []).join(", ")}`);
      console.log(`[SemanticSearch]    Type: ${result.intentType || 'specific'}`);
      
      const primaryField = result.primaryField || userQuery;
      let relatedFields = result.relatedFields || [];
      
      // SAFETY NET: If LLM didn't provide related fields, generate some basic ones
      if (relatedFields.length === 0) {
        console.log(`[SemanticSearch] ⚠️ No related fields from LLM - generating fallback synonyms`);
        relatedFields = this.generateFallbackRelatedFields(primaryField);
        console.log(`[SemanticSearch] 📝 Fallback: ${relatedFields.join(", ")}`);
      }
      
      return {
        primaryField,
        relatedFields,
        intentType: result.intentType || 'specific',
        degreeLevel: result.degreeLevel,
      };
    } catch (error) {
      console.error(`[SemanticSearch] Intent extraction failed:`, error);
      return {
        primaryField: userQuery,
        relatedFields: [],
        intentType: 'specific',
      };
    }
  }

  /**
   * Generate fallback related fields when LLM doesn't provide them
   */
  private generateFallbackRelatedFields(primaryField: string): string[] {
    const fieldLower = primaryField.toLowerCase().trim();
    const relatedFields: string[] = [];
    
    // Common synonym map as fallback - INCLUDES BOTH SPACED AND NON-SPACED VERSIONS
    const synonymMap: Record<string, string[]> = {
      'cybersecurity': ['cyber security', 'cybersecurity', 'information security', 'network security', 'computer security', 'security specialist', 'information assurance', 'cyber operations', 'cyber', 'security'],
      'cyber security': ['cybersecurity', 'cyber security', 'information security', 'network security', 'computer security', 'security specialist', 'information assurance', 'cyber operations', 'cyber', 'security'],
      'cyber': ['cybersecurity', 'cyber security', 'information security', 'network security', 'security', 'computer security'],
      'security': ['cybersecurity', 'cyber security', 'information security', 'network security', 'computer security', 'security specialist'],
      'computer science': ['computer science', 'computing', 'information technology', 'IT', 'software engineering', 'computer information systems', 'information and computer sciences', 'software'],
      'computing': ['computer science', 'computing', 'information technology', 'IT', 'software', 'computer information systems'],
      'information technology': ['information technology', 'IT', 'computer science', 'computing', 'information systems', 'technology'],
      'it': ['information technology', 'IT', 'computer science', 'computing', 'information systems', 'technology'],
      'nursing': ['nursing', 'healthcare', 'registered nurse', 'RN', 'medical', 'nursing practice', 'health services', 'patient care'],
      'healthcare': ['healthcare', 'nursing', 'medical', 'health services', 'patient care', 'registered nurse'],
      'engineering': ['engineering', 'engineer', 'technology', 'applied science', 'technical'],
      'business': ['business', 'business administration', 'management', 'entrepreneurship', 'commerce'],
      'education': ['education', 'teaching', 'educator', 'instruction', 'pedagogy'],
    };
    
    // Check for exact matches first
    if (synonymMap[fieldLower]) {
      relatedFields.push(...synonymMap[fieldLower]);
    } else {
      // Check for partial matches
      for (const [key, synonyms] of Object.entries(synonymMap)) {
        if (fieldLower.includes(key) || key.includes(fieldLower)) {
          relatedFields.push(...synonyms);
          break;
        }
      }
    }
    
    // If no matches, extract individual words as related fields
    if (relatedFields.length === 0) {
      const words = primaryField.split(/[\s\-_(),&]+/).filter(w => w.length > 2);
      relatedFields.push(...words);
      
      // Also add compound version (no spaces)
      const compound = words.join('').toLowerCase();
      if (compound.length > 3) {
        relatedFields.push(compound);
      }
    }
    
    return [...new Set(relatedFields)]; // Deduplicate
  }

  /**
   * Fast keyword filter - keep programs that might be relevant
   * This is like my first pass when scanning data
   * 
   * IMPORTANT: Be VERY lenient here - we want to keep lots of candidates
   * The LLM ranking will filter out irrelevant ones later
   */
  private fastKeywordFilter(
    programs: EnhancedProgram[],
    intent: { primaryField: string; relatedFields: string[] }
  ): EnhancedProgram[] {
    const allSearchTerms = [
      intent.primaryField,
      ...intent.relatedFields,
    ].map(t => t.toLowerCase());

    // Extract individual words from search terms for more lenient matching
    const searchWords = new Set<string>();
    allSearchTerms.forEach(term => {
      // Add the full term as-is
      searchWords.add(term);
      
      // ALSO add version without spaces for compound words
      // "cyber security" → "cybersecurity"
      const noSpaces = term.replace(/\s+/g, '');
      if (noSpaces !== term) {
        searchWords.add(noSpaces);
      }
      
      // Split on spaces, hyphens, and other separators to get individual words
      term.split(/[\s\-_(),&]+/).forEach(word => {
        if (word.length > 2) {  // Skip very short words
          searchWords.add(word);
        }
      });
    });

    console.log(`[SemanticSearch] 🔍 Fast filter search terms (${searchWords.size} total):`);
    console.log(`[SemanticSearch]    ${Array.from(searchWords).slice(0, 15).join(", ")}${searchWords.size > 15 ? '...' : ''}`);

    return programs.filter(program => {
      const desc = program.program_desc.toLowerCase();
      const code = program.program.toLowerCase();
      const combinedText = `${desc} ${code}`;
      
      // Keep if ANY search word appears in program text
      // This is intentionally very lenient - LLM will rank properly later
      const matches = Array.from(searchWords).some(word => 
        combinedText.includes(word)
      );
      
      return matches;
    });
  }

  /**
   * Semantic ranking using LLM
   * This is how I actually rank relevance - by understanding meaning
   */
  private async semanticRanking(
    userQuery: string,
    programs: EnhancedProgram[],
    intent: any,
    conversationContext: string
  ): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];
    
    // Process in batches for efficiency
    const batchSize = 20; // LLM can handle more programs per call
    
    for (let i = 0; i < Math.min(programs.length, 200); i += batchSize) {
      const batch = programs.slice(i, i + batchSize);
      
      try {
        const batchResults = await this.rankProgramBatch(
          userQuery,
          batch,
          intent,
          conversationContext
        );
        results.push(...batchResults);
      } catch (error) {
        console.error(`[SemanticSearch] Batch ranking failed:`, error);
        // Fallback: assign moderate scores to this batch
        results.push(...batch.map(p => ({
          program: p,
          campus: this.islandTool.mapInstitutionToCampus(p.iro_institution),
          relevanceScore: 5,
          reasoning: 'Batch ranking failed, assigned default score',
          matchType: 'broad' as const,
        })));
      }
    }
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Rank a batch of programs using LLM intelligence
   */
  private async rankProgramBatch(
    userQuery: string,
    programs: EnhancedProgram[],
    intent: any,
    conversationContext: string
  ): Promise<SemanticSearchResult[]> {
    const programList = programs.map((p, idx) => 
      `${idx + 1}. ${p.program_desc} (${p.degree_level}, CIP: ${p.cip_code})`
    ).join('\n');

    const prompt = `You are an expert at matching educational programs to student needs.

User's Search: "${userQuery}"
Search Intent: Looking for programs in "${intent.primaryField}"
${conversationContext ? `Context: ${conversationContext}` : ''}

Programs to rank:
${programList}

For each program, rate its relevance on a scale of 1-10:
- 10: Perfect match (exactly what the user is looking for)
- 8-9: Strong match (highly relevant, directly related)
- 6-7: Good match (relevant, related field)
- 4-5: Moderate match (somewhat related, could be useful)
- 1-3: Weak match (tangentially related, probably not helpful)

Return as JSON array:
{
  "rankings": [
    {
      "index": 1,
      "score": 9,
      "reasoning": "brief explanation",
      "matchType": "exact|synonym|related|broad"
    }
  ]
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b", // Program ranking needs powerful reasoning: 500 tps, 74% cheaper
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"rankings":[]}');
    
    // CRITICAL FIX: Ensure ALL programs get scored, not just the ones the LLM returned
    // If LLM skips some programs (e.g., duplicate names), they would be dropped entirely!
    const rankedPrograms = new Set<number>();
    const scoredResults: SemanticSearchResult[] = [];
    
    // First, add all programs that the LLM explicitly ranked
    result.rankings.forEach((ranking: any) => {
      const idx = ranking.index - 1;
      if (idx >= 0 && idx < programs.length) {
        rankedPrograms.add(idx);
        const program = programs[idx];
        scoredResults.push({
          program,
          campus: this.islandTool.mapInstitutionToCampus(program.iro_institution),
          relevanceScore: ranking.score || 5,
          reasoning: ranking.reasoning || 'No reasoning provided',
          matchType: ranking.matchType || 'broad',
        });
      }
    });
    
    // Then, add any programs the LLM skipped with a moderate default score
    // This is critical for programs with identical names at different campuses
    programs.forEach((program, idx) => {
      if (!rankedPrograms.has(idx)) {
        console.log(`[SemanticSearch] ⚠️ LLM skipped program ${idx + 1}: ${program.program_desc} at ${program.iro_institution} - assigning default score`);
        scoredResults.push({
          program,
          campus: this.islandTool.mapInstitutionToCampus(program.iro_institution),
          relevanceScore: 7, // Assume moderate relevance since it passed the fast filter
          reasoning: 'LLM did not explicitly rank this program, assigned moderate score',
          matchType: 'related',
        });
      }
    });
    
    return scoredResults;
  }

  /**
   * Load all programs from dataset
   */
  private async getAllPrograms(): Promise<EnhancedProgram[]> {
    if (this.programCache) {
      return this.programCache;
    }

    try {
      const data = await this.reader.readFile(
        "programs_2yr_4yr_noncredit_11_16_2025_cipfilled.json"
      ) as EnhancedProgram[];

      this.programCache = data;
      console.log(`[SemanticSearch] 📚 Cached ${this.programCache.length} programs`);
      
      return this.programCache;
    } catch (error) {
      console.error("[SemanticSearch] Failed to load programs:", error);
      return [];
    }
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.programCache = null;
  }
}

// Export singleton
let semanticSearchInstance: SemanticProgramSearch | null = null;

export function getSemanticProgramSearch(): SemanticProgramSearch {
  if (!semanticSearchInstance) {
    semanticSearchInstance = new SemanticProgramSearch();
  }
  return semanticSearchInstance;
}
