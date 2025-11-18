/**
 * Enhanced Program Tool
 * 
 * Provides access to the comprehensive program dataset:
 * programs_2yr_4yr_noncredit_11_16_2025_cipfilled.json
 * 
 * Features:
 * - Search programs by keywords with optional island filtering
 * - Get programs by CIP codes
 * - Get programs by institution
 * - Associates programs with campus names
 */

import { getJSONLReader } from "./jsonl-reader";
import { getIslandMappingTool } from "./island-mapping-tools";

/**
 * Enhanced program data structure from the comprehensive dataset
 */
export interface EnhancedProgram {
  iro_institution: string;  // Institution code (e.g., "HAW", "HON")
  program: string;          // Program code (e.g., "AA-HWST-HULA")
  program_desc: string;     // Full program description
  degree_level: string;     // "2-Year", "4-Year", "Non-Credit"
  cip_code: string;        // CIP code (e.g., "05.0202")
}

/**
 * Program search result with additional metadata
 */
export interface ProgramSearchResult {
  program: EnhancedProgram;
  campus: string;          // Full campus name
  matchScore: number;      // Relevance score (0-100)
  matchedKeywords: string[]; // Which keywords matched
}

export class EnhancedProgramTool {
  private reader = getJSONLReader();
  private islandTool = getIslandMappingTool();
  private programCache: EnhancedProgram[] | null = null;

  /**
   * Search programs by keywords with optional island filter
   * 
   * @param keywords Array of search terms
   * @param island Optional island name to filter by
   * @returns Array of matching programs with metadata
   */
  async searchPrograms(
    keywords: string[], 
    island?: string
  ): Promise<ProgramSearchResult[]> {
    const allPrograms = await this.getAllPrograms();
    
    // Get allowed institution codes if island is specified
    let allowedInstitutions: Set<string> | null = null;
    if (island) {
      const codes = await this.islandTool.getInstitutionCodesByIsland(island);
      allowedInstitutions = new Set(codes);
      console.log(`[EnhancedProgram] Island filter: ${island} → institutions: ${Array.from(allowedInstitutions).join(', ')}`);
    }

    // Detect if this is a broad/location-only query
    const isBroadQuery = keywords.some(kw => 
      ['all', 'available', 'programs', 'what', 'show'].includes(kw.toLowerCase())
    );
    
    const results: ProgramSearchResult[] = [];

    for (const program of allPrograms) {
      // Apply island filter first
      if (allowedInstitutions && !allowedInstitutions.has(program.iro_institution)) {
        continue;
      }

      // For broad queries with island filter, include ALL programs from that island
      if (isBroadQuery && island) {
        const campus = this.islandTool.mapInstitutionToCampus(program.iro_institution);
        results.push({
          program,
          campus,
          matchScore: 10, // Lower score for broad matches
          matchedKeywords: ['location']
        });
      } else {
        // Calculate match score for specific queries
        const { score, matchedKeywords } = this.calculateMatchScore(program, keywords);
        
        if (score > 0) {
          const campus = this.islandTool.mapInstitutionToCampus(program.iro_institution);
          results.push({
            program,
            campus,
            matchScore: score,
            matchedKeywords
          });
        }
      }
    }

    // Sort by match score (highest first)
    results.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`[EnhancedProgram] Found ${results.length} matching programs${island ? ` on ${island}` : ''}${isBroadQuery ? ' (broad search)' : ''}`);
    
    return results;
  }

  /**
   * Get programs by CIP code(s) with optional island filter
   * 
   * @param cipCodes Array of CIP codes (can be 2-digit or full)
   * @param island Optional island name to filter by
   * @returns Array of matching programs
   */
  async getProgramsByCIP(
    cipCodes: string[], 
    island?: string
  ): Promise<ProgramSearchResult[]> {
    const allPrograms = await this.getAllPrograms();
    
    // Get allowed institution codes if island is specified
    let allowedInstitutions: Set<string> | null = null;
    if (island) {
      const codes = await this.islandTool.getInstitutionCodesByIsland(island);
      allowedInstitutions = new Set(codes);
    }

    const results: ProgramSearchResult[] = [];

    for (const program of allPrograms) {
      // Apply island filter
      if (allowedInstitutions && !allowedInstitutions.has(program.iro_institution)) {
        continue;
      }

      // Check if program's CIP code matches any of the search codes
      const matches = cipCodes.some(code => {
        const searchCode = code.replace(/\./g, ''); // Remove dots
        const programCode = program.cip_code.replace(/\./g, '');
        
        // Support both exact match and prefix match (for 2-digit CIP codes)
        return programCode === searchCode || programCode.startsWith(searchCode);
      });

      if (matches) {
        const campus = this.islandTool.mapInstitutionToCampus(program.iro_institution);
        results.push({
          program,
          campus,
          matchScore: 100, // Direct CIP match = perfect score
          matchedKeywords: [`CIP: ${program.cip_code}`]
        });
      }
    }

    console.log(`[EnhancedProgram] Found ${results.length} programs for CIP codes: ${cipCodes.join(', ')}`);
    
    return results;
  }

  /**
   * Get all programs for a specific institution
   * 
   * @param institutionCode Institution code (e.g., "HAW", "HON")
   * @returns Array of programs at that institution
   */
  async getProgramsByInstitution(institutionCode: string): Promise<EnhancedProgram[]> {
    const allPrograms = await this.getAllPrograms();
    
    return allPrograms.filter(p => 
      p.iro_institution.toUpperCase() === institutionCode.toUpperCase()
    );
  }

  /**
   * Get programs by degree level with optional island filter
   * 
   * @param degreeLevel "2-Year", "4-Year", or "Non-Credit"
   * @param island Optional island name to filter by
   * @returns Array of matching programs
   */
  async getProgramsByDegreeLevel(
    degreeLevel: string,
    island?: string
  ): Promise<ProgramSearchResult[]> {
    const allPrograms = await this.getAllPrograms();
    
    // Get allowed institution codes if island is specified
    let allowedInstitutions: Set<string> | null = null;
    if (island) {
      const codes = await this.islandTool.getInstitutionCodesByIsland(island);
      allowedInstitutions = new Set(codes);
    }

    const results: ProgramSearchResult[] = [];

    for (const program of allPrograms) {
      // Apply island filter
      if (allowedInstitutions && !allowedInstitutions.has(program.iro_institution)) {
        continue;
      }

      if (program.degree_level.toLowerCase() === degreeLevel.toLowerCase()) {
        const campus = this.islandTool.mapInstitutionToCampus(program.iro_institution);
        results.push({
          program,
          campus,
          matchScore: 100,
          matchedKeywords: [degreeLevel]
        });
      }
    }

    console.log(`[EnhancedProgram] Found ${results.length} ${degreeLevel} programs${island ? ` on ${island}` : ''}`);
    
    return results;
  }

  /**
   * Get all unique CIP codes from the dataset
   */
  async getAllCIPCodes(): Promise<string[]> {
    const allPrograms = await this.getAllPrograms();
    const cipCodes = new Set<string>();
    
    for (const program of allPrograms) {
      if (program.cip_code) {
        cipCodes.add(program.cip_code);
      }
    }
    
    return Array.from(cipCodes).sort();
  }

  /**
   * Get all unique institutions from the dataset
   */
  async getAllInstitutions(): Promise<Array<{ code: string; name: string; count: number }>> {
    const allPrograms = await this.getAllPrograms();
    const institutionCounts = new Map<string, number>();
    
    for (const program of allPrograms) {
      const count = institutionCounts.get(program.iro_institution) || 0;
      institutionCounts.set(program.iro_institution, count + 1);
    }
    
    const results = Array.from(institutionCounts.entries()).map(([code, count]) => ({
      code,
      name: this.islandTool.mapInstitutionToCampus(code),
      count
    }));
    
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    return results;
  }

  // ========== Private Helper Methods ==========

  /**
   * Load all programs from the comprehensive dataset
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
      console.log(`[EnhancedProgram] Loaded ${this.programCache.length} programs from comprehensive dataset`);
      
      return this.programCache;
    } catch (error) {
      console.error("[EnhancedProgram] Failed to load program data:", error);
      return [];
    }
  }

  /**
   * Calculate match score for a program against search keywords
   * 
   * Scoring:
   * - Exact phrase match in description: 100 points
   * - Exact word match in description: 50 points
   * - Partial word match in description: 25 points
   * - Match in program code: 30 points
   * - CIP code match: 20 points
   * 
   * IMPROVEMENTS:
   * - Normalize text (handle "&" → "and", remove extra spaces)
   * - Better tokenization (split on more delimiters)
   * - Word boundary matching for accuracy
   * - Synonym matching for related terms
   */
  private calculateMatchScore(
    program: EnhancedProgram, 
    keywords: string[]
  ): { score: number; matchedKeywords: string[] } {
    let score = 0;
    const matchedKeywords: string[] = [];
    
    // Normalize program description: fix spacing around &, convert to lowercase
    const descNormalized = program.program_desc
      .replace(/&/g, ' and ')           // "Information&Computer" → "Information and Computer"
      .replace(/\s+/g, ' ')             // Multiple spaces → single space
      .toLowerCase()
      .trim();
    
    const programCodeLower = program.program.toLowerCase();
    
    // Create search phrase from keywords
    const searchPhrase = keywords.join(' ').toLowerCase();
    
    // SYNONYM MAPPING: Expand search terms to include related concepts
    const synonymMap: Record<string, string[]> = {
      'cybersecurity': ['cyber security', 'information security', 'network security', 'security specialist', 'computer security'],
      'cyber': ['cybersecurity', 'information security', 'network security', 'security'],
      'computer science': ['computing', 'information and computer sciences', 'information technology'],
      'programming': ['software development', 'coding', 'software engineering'],
      'nursing': ['healthcare', 'registered nurse', 'rn', 'nursing practice'],
      'business': ['business administration', 'management', 'entrepreneurship'],
      'engineering': ['engineer'],
      // AI and Data Science related expansions
      'artificial intelligence': ['computer science', 'data science', 'machine learning', 'information and computer sciences', 'computing'],
      'ai': ['artificial intelligence', 'computer science', 'data science', 'machine learning'],
      'machine learning': ['artificial intelligence', 'computer science', 'data science', 'computing'],
      'data science': ['computer science', 'information and computer sciences', 'data analytics', 'statistics'],
      // Art-related expansions
      'graphic design': ['art', 'digital media', 'design', 'visual arts', 'creative media'],
      'fashion design': ['art', 'design', 'fashion', 'visual arts'],
      'digital design': ['art', 'digital media', 'graphic design', 'creative media'],
      'web design': ['digital media', 'information technology', 'creative media'],
      'music production': ['music', 'audio', 'creative media'],
      'audio engineering': ['music', 'audio', 'creative media'],
      'film production': ['cinematic arts', 'digital cinema', 'creative media'],
      'multimedia art': ['art', 'digital media', 'creative media'],
    };
    
    // Expand keywords with synonyms
    const expandedKeywords = [...keywords];
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (synonymMap[keywordLower]) {
        expandedKeywords.push(...synonymMap[keywordLower]);
      }
    }
    
    // PRIORITY 1: Exact phrase match (highest score)
    if (searchPhrase.length > 3 && descNormalized.includes(searchPhrase)) {
      score += 100;
      matchedKeywords.push(searchPhrase);
      console.log(`[EnhancedProgram] Exact phrase match: "${searchPhrase}" in "${program.program_desc}"`);
    }
    
    // Also check expanded phrases
    for (const synonym of expandedKeywords) {
      if (synonym !== searchPhrase && synonym.length > 3 && descNormalized.includes(synonym.toLowerCase())) {
        score += 80; // Slightly lower than exact phrase but still high
        if (!matchedKeywords.includes(synonym)) {
          matchedKeywords.push(synonym);
          console.log(`[EnhancedProgram] Synonym match: "${synonym}" in "${program.program_desc}"`);
        }
      }
    }
    
    // PRIORITY 2: Individual keyword matching
    // Split description into words for better matching
    const descWords = descNormalized.split(/[\s\-_(),&]+/).filter(w => w.length > 0);
    
    for (const keyword of expandedKeywords) {
      const keywordLower = keyword.toLowerCase().trim();
      
      // Skip very short keywords (noise) and common words
      if (keywordLower.length < 2) {
        continue;
      }
      
      // Skip common filler words
      const fillerWords = ['and', 'or', 'the', 'of', 'in', 'at', 'to', 'for', 'a', 'an'];
      if (fillerWords.includes(keywordLower)) {
        continue;
      }
      
      let keywordMatched = false;
      
      // Check for exact word match in description
      if (descWords.includes(keywordLower)) {
        score += 50;
        keywordMatched = true;
      }
      // Check for word that starts with keyword (e.g., "engineer" matches "engineering")
      else if (descWords.some(word => word.startsWith(keywordLower))) {
        score += 40;
        keywordMatched = true;
      }
      // Check for substring match (less precise)
      else if (descNormalized.includes(keywordLower)) {
        score += 25;
        keywordMatched = true;
      }
      
      // Check in program code
      if (programCodeLower.includes(keywordLower)) {
        score += 30;
        keywordMatched = true;
      }
      
      // Check in CIP code (for specific technical searches)
      if (program.cip_code.replace(/\./g, '').includes(keywordLower.replace(/\./g, ''))) {
        score += 20;
        keywordMatched = true;
      }
      
      if (keywordMatched && !matchedKeywords.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
    
    return { score, matchedKeywords };
  }

  /**
   * Clear the program cache (useful for testing or updates)
   */
  clearCache(): void {
    this.programCache = null;
  }
}

// Export singleton instance
let enhancedProgramTool: EnhancedProgramTool | null = null;

export function getEnhancedProgramTool(): EnhancedProgramTool {
  if (!enhancedProgramTool) {
    enhancedProgramTool = new EnhancedProgramTool();
  }
  return enhancedProgramTool;
}
