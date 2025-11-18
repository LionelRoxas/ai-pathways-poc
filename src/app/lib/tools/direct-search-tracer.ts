/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/lib/tools/direct-search-tracer.ts
// Simple, direct search approach - just filter the actual data!

import {
  getEnhancedProgramTool,
  type ProgramSearchResult,
} from "./enhanced-program-tool";
import { getIslandMappingTool } from "./island-mapping-tools";
import {
  getSemanticProgramSearch,
  type SemanticSearchResult,
} from "./semantic-program-search";

/**
 * Direct Search PathwayTracer
 *
 * Now uses advanced semantic search:
 * 1. Use LLM-based semantic search for college programs (understands intent, synonyms, relationships)
 * 2. Collect CIP codes from found programs
 * 3. Use those CIP codes to find high school programs
 * 4. Also search high school programs directly by name
 * 5. Support island-based filtering when specified
 */
export class DirectSearchTracer {
  private hsDataTool: any;
  private collegeDataTool: any;
  private cipMappingTool: any;
  private careerDataTool: any;
  private enhancedProgramTool = getEnhancedProgramTool();
  private semanticSearch = getSemanticProgramSearch();
  private islandMappingTool = getIslandMappingTool();

  constructor(
    hsDataTool: any,
    collegeDataTool: any,
    cipMappingTool: any,
    careerDataTool: any
  ) {
    this.hsDataTool = hsDataTool;
    this.collegeDataTool = collegeDataTool;
    this.cipMappingTool = cipMappingTool;
    this.careerDataTool = careerDataTool;
  }

  /**
   * Advanced hybrid search - uses semantic search for better accuracy
   * Falls back to keyword search for simple queries
   *
   * @param keywords Search keywords
   * @param islandFilter Optional island name (Oahu, Maui, Kauai, Hawaii)
   * @param conversationContext Optional conversation context for better understanding
   */
  async traceFromKeywords(
    keywords: string[],
    islandFilter?: string,
    conversationContext?: string
  ): Promise<any> {
    console.log(`[DirectSearchTracer] Searching for: ${keywords.join(", ")}`);
    if (islandFilter) {
      console.log(`[DirectSearchTracer] 🏝️  Island filter: ${islandFilter}`);
    }
    if (conversationContext) {
      console.log(`[DirectSearchTracer] 💬 Conversation context available: ${conversationContext.length} characters`);
      console.log(`[DirectSearchTracer] 📝 Context preview: ${conversationContext.substring(0, 100)}...`);
    } else {
      console.log(`[DirectSearchTracer] ⚠️  No conversation context provided`);
    }

    // Determine if we should use semantic search (for complex/ambiguous queries)
    const shouldUseSemanticSearch = this.shouldUseSemanticSearch(
      keywords,
      conversationContext
    );

    let collegeResults: Array<{
      program: any;
      campus: string;
      matchScore: number;
    }> = [];

    if (shouldUseSemanticSearch) {
      console.log(
        `[DirectSearchTracer] 🧠 Using SEMANTIC search (LLM-powered)`
      );

      // Use semantic search for better understanding
      const semanticResults = await this.semanticSearch.semanticSearch(
        keywords.join(" "),
        islandFilter,
        {
          maxResults: 100,
          minRelevance: 5,
          conversationContext: conversationContext || "",
        }
      );

      console.log(
        `[DirectSearchTracer] Found ${semanticResults.length} college programs via semantic search`
      );

      // DEBUG: Log programs that appear multiple times (different institutions)
      const instGroups = new Map<string, any[]>();
      semanticResults.forEach(result => {
        const desc = result.program.program_desc;
        if (!instGroups.has(desc)) {
          instGroups.set(desc, []);
        }
        instGroups.get(desc)!.push({
          campus: result.campus,
          institution: result.program.iro_institution,
          score: result.relevanceScore
        });
      });
      
      // Log programs found at multiple institutions
      for (const [desc, instances] of instGroups.entries()) {
        if (instances.length > 1) {
          console.log(`[DirectSearchTracer] 🎓 "${desc}" found at ${instances.length} institutions:`);
          instances.forEach((inst: any) => {
            console.log(`[DirectSearchTracer]    - ${inst.institution} (${inst.campus}), score: ${inst.score}`);
          });
        }
      }

      // Convert semantic results to our format
      collegeResults = semanticResults.map(result => ({
        program: result.program,
        campus: result.campus,
        matchScore: result.relevanceScore * 10, // Scale 1-10 to 10-100
      }));
    } else {
      console.log(`[DirectSearchTracer] ⚡ Using FAST keyword search`);

      // Use fast keyword search for simple queries
      const enhancedCollegeResults =
        await this.enhancedProgramTool.searchPrograms(keywords, islandFilter);

      console.log(
        `[DirectSearchTracer] Found ${enhancedCollegeResults.length} college programs${islandFilter ? ` on ${islandFilter}` : ""} by keyword search`
      );

      // Keep results with score >= 10
      collegeResults = enhancedCollegeResults
        .filter(r => r.matchScore >= 10)
        .map(r => ({
          program: r.program,
          campus: r.campus,
          matchScore: r.matchScore,
        }));
    }

    // STEP 2: Collect CIP codes from found college programs
    const cipCodesFromCollege = new Set<string>();
    const cip2DigitsFromCollege = new Set<string>();

    for (const result of collegeResults) {
      const cipCode = result.program.cip_code;
      if (cipCode) {
        cipCodesFromCollege.add(cipCode);
        // Extract 2-digit CIP (first 2 digits, remove dots)
        const cleanCip = cipCode.replace(/\./g, "");
        const cip2Digit = cleanCip.substring(0, 2);
        cip2DigitsFromCollege.add(cip2Digit);
      }
    }

    console.log(
      `[DirectSearchTracer] Collected CIP 2-digit codes: ${Array.from(cip2DigitsFromCollege).join(", ")}`
    );

    // STEP 3: Search high school programs by name (with optional island filtering)
    const allHSPrograms = await this.hsDataTool.getAllPrograms();
    const hsResults = this.searchProgramsByName(
      allHSPrograms,
      keywords,
      "highschool"
    );

    console.log(
      `[DirectSearchTracer] Found ${hsResults.length} HS programs by direct name search`
    );

    // STEP 4: Also get HS programs by CIP codes from college programs
    const hsFromCIP = await this.hsDataTool.getProgramsByCIP2Digit(
      Array.from(cip2DigitsFromCollege)
    );

    console.log(
      `[DirectSearchTracer] Found ${hsFromCIP.length} additional HS programs via CIP codes`
    );

    // Get allowed schools if island filter is active
    let allowedSchools: Set<string> | null = null;
    if (islandFilter) {
      const schoolList =
        await this.islandMappingTool.getHighSchoolsByIsland(islandFilter);
      allowedSchools = new Set(schoolList);
      console.log(
        `[DirectSearchTracer] Island filter: ${schoolList.length} schools on ${islandFilter}`
      );
    }

    // Merge HS results (remove duplicates by program name)
    const hsMap = new Map();

    // CRITICAL FIX: Fetch schools for programs found by direct name search
    // This fixes the bug where "Nursing Services" showed "no schools found"
    for (const result of hsResults) {
      const schools = await this.hsDataTool.getSchoolsForProgram(
        result.program.PROGRAM_OF_STUDY
      );

      // Apply island filter to schools if specified
      const filteredSchools = allowedSchools
        ? schools.filter((school: string) => allowedSchools.has(school))
        : schools;

      // Only add if there are schools available (after filtering)
      if (filteredSchools.length > 0) {
        hsMap.set(result.program.PROGRAM_OF_STUDY, {
          program: result.program,
          schools: filteredSchools,
          matchScore: result.matchScore,
        });
      }
    }

    // Add programs found via CIP codes (if not already added)
    for (const program of hsFromCIP) {
      if (!hsMap.has(program.PROGRAM_OF_STUDY)) {
        const schools = await this.hsDataTool.getSchoolsForProgram(
          program.PROGRAM_OF_STUDY
        );

        // Apply island filter to schools if specified
        const filteredSchools = allowedSchools
          ? schools.filter((school: string) => allowedSchools.has(school))
          : schools;

        // Only add if there are schools available (after filtering)
        if (filteredSchools.length > 0) {
          hsMap.set(program.PROGRAM_OF_STUDY, {
            program,
            schools: filteredSchools,
            matchScore: 1,
          });
        }
      }
    }

    const mergedHSResults = Array.from(hsMap.values());
    console.log(
      `[DirectSearchTracer] Total unique HS programs${islandFilter ? ` on ${islandFilter}` : ""}: ${mergedHSResults.length}`
    );

    // STEP 5: Collect all CIP codes (from HS and college)
    const allCIP2Digits = new Set<string>(cip2DigitsFromCollege);
    for (const result of mergedHSResults) {
      result.program.CIP_2DIGIT?.forEach((cip: string) =>
        allCIP2Digits.add(cip)
      );
    }

    // STEP 6: Format college programs with campuses (already filtered by island via enhancedProgramTool)
    const collegeWithCampuses = collegeResults.map(result => ({
      program: {
        PROGRAM_NAME: [result.program.program_desc],
        CIP_CODE: result.program.cip_code,
        DEGREE_LEVEL: result.program.degree_level,
      },
      campuses: [result.campus],
    }));

    // STEP 7: Get careers from CIP codes
    const allFullCIPs = Array.from(cipCodesFromCollege);

    const careers = await this.careerDataTool.getSOCCodesByCIP(allFullCIPs);

    console.log(`[DirectSearchTracer] Found ${careers.length} career paths`);
    console.log(
      `[DirectSearchTracer] Final: ${mergedHSResults.length} HS, ${collegeWithCampuses.length} college, ${careers.length} careers`
    );

    return {
      highSchoolPrograms: mergedHSResults.map(result => ({
        program: result.program,
        schools: result.schools,
        courses: null,
      })),
      collegePrograms: collegeWithCampuses, // Removed .slice(0, 30) limit
      careers: careers, // Removed .slice(0, 30) limit
      cipMappings: [
        {
          CIP_2DIGIT: Array.from(allCIP2Digits).join(","),
          CIP_CODE: allFullCIPs,
        },
      ],
    };
  }

  /**
   * Determine if we should use semantic search vs fast keyword search
   * 
   * Use semantic search when:
   * - Query is complex (multiple words)
   * - Query is ambiguous (yes, interested, more, etc.)
   * - User provided conversation context
   * - Query looks exploratory (what, show, find, etc.)
   * 
   * Use fast keyword search when:
   * - Query is simple (1-2 specific words)
   * - Query is very specific (exact program name)
   */
  private shouldUseSemanticSearch(keywords: string[], conversationContext?: string): boolean {
    // ALWAYS use semantic if we have substantial conversation context
    // This catches "yes" responses where keywords were extracted from context
    if (conversationContext && conversationContext.length > 50) {
      console.log(`[DirectSearchTracer] 💬 Substantial conversation context (${conversationContext.length} chars) - using semantic search`);
      return true;
    }
    
    const queryText = keywords.join(" ").toLowerCase();
    
    // Ambiguous/affirmative responses (in case they weren't extracted yet)
    const ambiguousTerms = ['yes', 'yeah', 'yep', 'sure', 'interested', 'more', 'tell me'];
    if (ambiguousTerms.some(term => queryText.includes(term))) {
      console.log(`[DirectSearchTracer] 🗣️  Ambiguous/affirmative term detected - using semantic search`);
      return true;
    }
    
    // Exploratory queries
    const exploratoryTerms = ['what', 'show', 'find', 'available', 'options', 'all', 'list'];
    if (exploratoryTerms.some(term => queryText.includes(term))) {
      console.log(`[DirectSearchTracer] 🔍 Exploratory term detected - using semantic search`);
      return true;
    }
    
    // Complex queries (5+ keywords)
    if (keywords.length >= 5) {
      console.log(`[DirectSearchTracer] 📚 Complex query (${keywords.length} keywords) - using semantic search`);
      return true;
    }
    
    // For security/cybersecurity queries, always use semantic to catch related programs
    const securityRelated = ['security', 'cybersecurity', 'cyber', 'information security', 'network security'];
    if (securityRelated.some(term => queryText.includes(term))) {
      console.log(`[DirectSearchTracer] 🔐 Security-related query - using semantic search for better synonym matching`);
      return true;
    }
    
    console.log(`[DirectSearchTracer] ⚡ Simple specific query - using fast keyword search`);
    // Default: use fast keyword search for simple, specific queries
    return false;
  }

  /**
   * Simple name-based search - no fancy synonyms, just look for keywords in names
   * Supports broad queries when keywords include generic terms
   */
  private searchProgramsByName(
    programs: any[],
    keywords: string[],
    type: "college" | "highschool"
  ): Array<{ program: any; matchScore: number; schools?: string[] }> {
    const results = [];

    // Detect broad queries
    const isBroadQuery = keywords.some(kw =>
      ["all", "available", "programs", "what", "show"].includes(
        kw.toLowerCase()
      )
    );

    for (const program of programs) {
      let score = 0;
      let programNames: string[] = [];

      if (type === "college") {
        programNames = Array.isArray(program.PROGRAM_NAME)
          ? program.PROGRAM_NAME
          : [program.PROGRAM_NAME];
      } else {
        programNames = [program.PROGRAM_OF_STUDY];
      }

      // For broad queries, include all programs with low score
      if (isBroadQuery) {
        score = 1; // Minimal score for all programs
      }

      // CRITICAL FIX: Check for multi-word phrase match first!
      // If user searches "computer science", prioritize programs with that exact phrase
      const searchPhrase = keywords.join(" ");
      let hasExactPhrase = false;

      // Check each program name variant
      for (const name of programNames) {
        const nameLower = name.toLowerCase();

        // HIGHEST PRIORITY: Exact phrase match (e.g., "computer science" in "Computer Science (BS)")
        if (nameLower.includes(searchPhrase)) {
          score += 50; // MUCH higher score for exact phrase
          hasExactPhrase = true;
        }

        // Check individual keywords
        for (const keyword of keywords) {
          const keywordLower = keyword.toLowerCase();

          // Exact program name match
          if (nameLower === keywordLower) {
            score += 10;
          }
          // Contains keyword
          else if (nameLower.includes(keywordLower)) {
            score += 3; // Reduced from 5 to prioritize phrase matches
          }
          // Word match
          else if (
            nameLower.split(/[\s\-_(),&]+/).some(word => word === keywordLower)
          ) {
            score += 2; // Reduced from 4
          }
          // Word starts with keyword
          else if (
            nameLower
              .split(/[\s\-_(),&]+/)
              .some(word => word.startsWith(keywordLower))
          ) {
            score += 1; // Reduced from 2
          }
        }
      }

      if (score > 0) {
        results.push({
          program,
          matchScore: score,
        });
      }
    }

    // Sort by score
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Trace from high school program (unchanged)
   */
  async traceFromHighSchool(programName: string): Promise<any> {
    const hsInfo = await this.hsDataTool.getCompleteProgramInfo(programName);

    if (!hsInfo.program) {
      return {
        highSchoolPrograms: [],
        collegePrograms: [],
        careers: [],
        cipMappings: [],
      };
    }

    const cip2Digits = hsInfo.program.CIP_2DIGIT || [];
    const cipInfo = await this.cipMappingTool.getCompleteCIPInfo(cip2Digits);

    const collegePrograms = await this.collegeDataTool.getProgramsWithCampuses(
      cipInfo.fullCIPs
    );

    const careers = await this.careerDataTool.getSOCCodesByCIP(
      cipInfo.fullCIPs
    );

    return {
      highSchoolPrograms: [
        {
          program: hsInfo.program,
          schools: hsInfo.schools,
          courses: hsInfo.coursesByGrade,
        },
      ],
      collegePrograms,
      careers,
      cipMappings: [
        {
          CIP_2DIGIT: cip2Digits.join(","),
          CIP_CODE: cipInfo.fullCIPs,
        },
      ],
    };
  }
}
