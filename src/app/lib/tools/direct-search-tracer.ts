/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/lib/tools/direct-search-tracer.ts
// Simple, direct search approach - just filter the actual data!

/**
 * Direct Search PathwayTracer
 *
 * Simple approach:
 * 1. Search college programs directly by name (they have "Computer Science" in them!)
 * 2. Collect CIP codes from found programs
 * 3. Use those CIP codes to find high school programs
 * 4. Also search high school programs directly by name
 */
export class DirectSearchTracer {
  private hsDataTool: any;
  private collegeDataTool: any;
  private cipMappingTool: any;
  private careerDataTool: any;

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
   * Simple keyword search - just look at the actual program names!
   */
  async traceFromKeywords(keywords: string[]): Promise<any> {
    console.log(`[DirectSearchTracer] Searching for: ${keywords.join(", ")}`);

    // STEP 1: Search college programs DIRECTLY by name
    // This is the key fix - search the actual data first!
    const allCollegePrograms = await this.collegeDataTool.getAllPrograms();
    const collegeResults = this.searchProgramsByName(
      allCollegePrograms,
      keywords,
      "college"
    );

    console.log(
      `[DirectSearchTracer] Found ${collegeResults.length} college programs by direct name search`
    );

    // CRITICAL FILTER: If we have exact phrase matches (score >= 50), ONLY keep those
    // This fixes the issue where "computer science" returns "Information Systems", etc.
    const hasExactPhraseMatches = collegeResults.some(r => r.matchScore >= 50);
    let filteredCollegeResults = collegeResults;
    
    if (hasExactPhraseMatches) {
      // Keep only exact phrase matches + very high scoring programs
      filteredCollegeResults = collegeResults.filter(r => r.matchScore >= 40);
      console.log(
        `[DirectSearchTracer] Filtered to ${filteredCollegeResults.length} high-scoring programs (phrase match detected)`
      );
    }

    // STEP 2: Collect CIP codes from found college programs
    const cipCodesFromCollege = new Set<string>();
    const cip2DigitsFromCollege = new Set<string>();

    for (const result of filteredCollegeResults) {
      const cipCode = result.program.CIP_CODE;
      if (cipCode) {
        cipCodesFromCollege.add(cipCode);
        // Extract 2-digit CIP (first 2 digits)
        const cip2Digit = cipCode.substring(0, 2);
        cip2DigitsFromCollege.add(cip2Digit);
      }
    }

    console.log(
      `[DirectSearchTracer] Collected CIP 2-digit codes: ${Array.from(cip2DigitsFromCollege).join(", ")}`
    );

    // STEP 3: Search high school programs by name
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

    // Merge HS results (remove duplicates by program name)
    const hsMap = new Map();

    // CRITICAL FIX: Fetch schools for programs found by direct name search
    // This fixes the bug where "Nursing Services" showed "no schools found"
    for (const result of hsResults) {
      const schools = await this.hsDataTool.getSchoolsForProgram(
        result.program.PROGRAM_OF_STUDY
      );
      hsMap.set(result.program.PROGRAM_OF_STUDY, {
        program: result.program,
        schools,
        matchScore: result.matchScore,
      });
    }

    // Add programs found via CIP codes (if not already added)
    for (const program of hsFromCIP) {
      if (!hsMap.has(program.PROGRAM_OF_STUDY)) {
        const schools = await this.hsDataTool.getSchoolsForProgram(
          program.PROGRAM_OF_STUDY
        );
        hsMap.set(program.PROGRAM_OF_STUDY, {
          program,
          schools,
          matchScore: 1,
        });
      }
    }

    const mergedHSResults = Array.from(hsMap.values());
    console.log(
      `[DirectSearchTracer] Total unique HS programs: ${mergedHSResults.length}`
    );

    // STEP 5: Collect all CIP codes (from HS and college)
    const allCIP2Digits = new Set<string>(cip2DigitsFromCollege);
    for (const result of mergedHSResults) {
      result.program.CIP_2DIGIT?.forEach((cip: string) =>
        allCIP2Digits.add(cip)
      );
    }

    // STEP 6: Get campuses for college programs
    const collegeWithCampuses = [];
    for (const result of filteredCollegeResults) {
      const campuses = await this.collegeDataTool.getCampusesByCIP(
        result.program.CIP_CODE
      );
      collegeWithCampuses.push({
        program: result.program,
        campuses,
      });
    }

    // STEP 7: Get careers from CIP codes
    const allFullCIPs = Array.from(cipCodesFromCollege);
    const careers = await this.careerDataTool.getSOCCodesByCIP(allFullCIPs);

    console.log(`[DirectSearchTracer] Found ${careers.length} career paths`);
    console.log(
      `[DirectSearchTracer] Final: ${mergedHSResults.length} HS, ${collegeWithCampuses.length} college, ${careers.length} careers`
    );

    return {
      highSchoolPrograms: mergedHSResults.slice(0, 10).map(result => ({
        program: result.program,
        schools: result.schools,
        courses: null,
      })),
      collegePrograms: collegeWithCampuses.slice(0, 30),
      careers: careers.slice(0, 30),
      cipMappings: [
        {
          CIP_2DIGIT: Array.from(allCIP2Digits).join(","),
          CIP_CODE: allFullCIPs,
        },
      ],
    };
  }

  /**
   * Simple name-based search - no fancy synonyms, just look for keywords in names
   */
  private searchProgramsByName(
    programs: any[],
    keywords: string[],
    type: "college" | "highschool"
  ): Array<{ program: any; matchScore: number; schools?: string[] }> {
    const results = [];

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
