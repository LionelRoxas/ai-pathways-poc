/**
 * CIP Mapper
 *
 * Maps query analysis results to relevant CIP codes and educational contexts.
 * This is the bridge between user queries and the CIP-based data system.
 */

import { CIPIndex, getCIPIndex } from '../data/cip-index';
import { QueryAnalysis } from './query-analyzer';
import { CIPContext } from '../agents/base-agent';

export class CIPMapper {
  private cipIndex: CIPIndex;
  private initialized: boolean = false;

  constructor() {
    this.cipIndex = getCIPIndex();
  }

  /**
   * Initialize the CIP mapper
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Ensure CIP index is initialized
    if (!this.cipIndex.isInitialized()) {
      await this.cipIndex.initialize();
    }

    this.initialized = true;
    console.log('CIP Mapper initialized');
  }

  /**
   * Find relevant CIP codes based on query analysis
   */
  async findRelevantCIPs(queryAnalysis: QueryAnalysis): Promise<CIPContext> {
    await this.ensureInitialized();

    const twoDigitCIPs = new Set<string>();
    const fullCIPs = new Set<string>();
    const relatedHSPrograms = new Set<string>();
    const relatedCollegePrograms = new Set<string>();

    // 1. Search for matching high school programs using keywords
    const hsMatches = this.findMatchingHSPrograms(queryAnalysis.keywords);
    for (const hsProgram of hsMatches) {
      relatedHSPrograms.add(hsProgram);

      // Get CIP 2-digit codes for this program
      const cipCodes = this.cipIndex.getCIP2ForHSProgram(hsProgram);
      cipCodes.forEach(cip => twoDigitCIPs.add(cip));
    }

    // 2. Search for CIP codes directly using keywords
    const cipMatches = this.cipIndex.searchCIPsByKeywords(queryAnalysis.keywords);
    for (const cipCode of cipMatches) {
      fullCIPs.add(cipCode);

      // Get the 2-digit category
      const cip2 = this.cipIndex.getCIP2ForFullCIP(cipCode);
      if (cip2) {
        twoDigitCIPs.add(cip2);
      }
    }

    // 3. Expand 2-digit CIP codes to full CIP codes
    for (const cip2 of twoDigitCIPs) {
      const fullCodes = this.cipIndex.getFullCIPsForCIP2(cip2);
      fullCodes.forEach(code => fullCIPs.add(code));
    }

    // 4. Find college programs for the full CIP codes
    for (const cipCode of fullCIPs) {
      const programs = this.cipIndex.getProgramsForCIP(cipCode);
      programs.forEach(program => relatedCollegePrograms.add(program));
    }

    // 5. Check if we found data in each category
    const hasHighSchoolPrograms = relatedHSPrograms.size > 0;
    const hasCollegePrograms = relatedCollegePrograms.size > 0 || fullCIPs.size > 0;
    const hasCareerData = fullCIPs.size > 0; // Career data available for any CIP

    // If no matches found, try fuzzy matching
    if (twoDigitCIPs.size === 0 && fullCIPs.size === 0) {
      const fuzzyMatches = this.fuzzyMatchPrograms(queryAnalysis);
      for (const match of fuzzyMatches) {
        relatedHSPrograms.add(match);
        const cipCodes = this.cipIndex.getCIP2ForHSProgram(match);
        cipCodes.forEach(cip => twoDigitCIPs.add(cip));
      }

      // Expand fuzzy matches
      for (const cip2 of twoDigitCIPs) {
        const fullCodes = this.cipIndex.getFullCIPsForCIP2(cip2);
        fullCodes.forEach(code => fullCIPs.add(code));
      }
    }

    return {
      twoDigit: Array.from(twoDigitCIPs),
      fullCodes: Array.from(fullCIPs),
      hasHighSchoolPrograms: hasHighSchoolPrograms || relatedHSPrograms.size > 0,
      hasCollegePrograms: hasCollegePrograms || relatedCollegePrograms.size > 0,
      hasCareerData,
      relatedPrograms: {
        highschool: Array.from(relatedHSPrograms),
        college: Array.from(relatedCollegePrograms)
      },
      keywords: queryAnalysis.keywords
    };
  }

  /**
   * Find matching high school programs by keywords
   */
  private findMatchingHSPrograms(keywords: string[]): string[] {
    const matches = this.cipIndex.searchHSProgramsByKeywords(keywords);
    return Array.from(matches);
  }

  /**
   * Fuzzy match programs when exact matching fails
   */
  private fuzzyMatchPrograms(queryAnalysis: QueryAnalysis): string[] {
    const allPrograms = this.cipIndex.getAllHSPrograms();
    const matches: { program: string; score: number }[] = [];

    const queryText = queryAnalysis.improvedQuery.toLowerCase();

    for (const program of allPrograms) {
      const score = this.calculateFuzzyScore(program, queryText, queryAnalysis.keywords);
      if (score > 0.3) {
        // Threshold for fuzzy matching
        matches.push({ program, score });
      }
    }

    // Sort by score and return top matches
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 5).map(m => m.program);
  }

  /**
   * Calculate fuzzy matching score
   */
  private calculateFuzzyScore(
    program: string,
    queryText: string,
    keywords: string[]
  ): number {
    const normalizedProgram = program.toLowerCase();
    let score = 0;

    // Check if query text is contained in program name
    if (normalizedProgram.includes(queryText)) {
      score += 0.8;
    }

    // Check for keyword matches
    let keywordMatches = 0;
    for (const keyword of keywords) {
      if (normalizedProgram.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }

    if (keywords.length > 0) {
      score += (keywordMatches / keywords.length) * 0.6;
    }

    // Check for partial word matches
    const programWords = normalizedProgram.split(/\s+/);
    const queryWords = queryText.split(/\s+/);

    let wordMatches = 0;
    for (const queryWord of queryWords) {
      for (const programWord of programWords) {
        if (programWord.includes(queryWord) || queryWord.includes(programWord)) {
          wordMatches++;
          break;
        }
      }
    }

    if (queryWords.length > 0) {
      score += (wordMatches / queryWords.length) * 0.4;
    }

    return score;
  }

  /**
   * Get CIP context for specific high school program
   */
  async getCIPContextForHSProgram(programOfStudy: string): Promise<CIPContext> {
    await this.ensureInitialized();

    const twoDigitCIPs = this.cipIndex.getCIP2ForHSProgram(programOfStudy);
    const fullCIPs = new Set<string>();
    const collegePrograms = new Set<string>();

    // Expand to full CIP codes
    for (const cip2 of twoDigitCIPs) {
      const fullCodes = this.cipIndex.getFullCIPsForCIP2(cip2);
      fullCodes.forEach(code => fullCIPs.add(code));
    }

    // Get college programs
    for (const cipCode of fullCIPs) {
      const programs = this.cipIndex.getProgramsForCIP(cipCode);
      programs.forEach(program => collegePrograms.add(program));
    }

    return {
      twoDigit: twoDigitCIPs,
      fullCodes: Array.from(fullCIPs),
      hasHighSchoolPrograms: true,
      hasCollegePrograms: fullCIPs.size > 0,
      hasCareerData: fullCIPs.size > 0,
      relatedPrograms: {
        highschool: [programOfStudy],
        college: Array.from(collegePrograms)
      },
      keywords: [programOfStudy.toLowerCase()]
    };
  }

  /**
   * Get CIP context for specific CIP code
   */
  async getCIPContextForCIPCode(cipCode: string): Promise<CIPContext> {
    await this.ensureInitialized();

    const cip2 = this.cipIndex.getCIP2ForFullCIP(cipCode);
    const hsPrograms = cip2 ? this.cipIndex.getHSProgramsForCIP2(cip2) : [];
    const collegePrograms = this.cipIndex.getProgramsForCIP(cipCode);

    return {
      twoDigit: cip2 ? [cip2] : [],
      fullCodes: [cipCode],
      hasHighSchoolPrograms: hsPrograms.length > 0,
      hasCollegePrograms: collegePrograms.length > 0,
      hasCareerData: true,
      relatedPrograms: {
        highschool: hsPrograms,
        college: collegePrograms
      },
      keywords: []
    };
  }

  /**
   * Get CIP context for campus
   */
  async getCIPContextForCampus(campus: string): Promise<CIPContext> {
    await this.ensureInitialized();

    // This would require a reverse lookup in the CIP index
    // For now, return empty context
    // TODO: Implement campus-to-CIP lookup if needed

    return {
      twoDigit: [],
      fullCodes: [],
      hasHighSchoolPrograms: false,
      hasCollegePrograms: false,
      hasCareerData: false,
      relatedPrograms: {
        highschool: [],
        college: []
      },
      keywords: [campus.toLowerCase()]
    };
  }

  /**
   * Ensure initialization
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
