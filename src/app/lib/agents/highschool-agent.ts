/**
 * High School Agent
 *
 * Handles queries related to high school Programs of Study (POS).
 * Returns high school program recommendations with course sequences and school information.
 */

import { BaseAgent, CIPContext, AgentResponse, RelevanceFactors } from './base-agent';
import { ExtractedProfile } from '@/app/components/AIPathwaysChat/types';

export interface HighSchoolProgram {
  programOfStudy: string;
  cip2Digit: string[];
  courseSequence: {
    grade9: string[];
    grade10: string[];
    grade11: string[];
    grade12: string[];
  };
  recommendedCourses?: string[];
  level1Courses?: string[];
  level2Courses?: string[];
  level3Courses?: string[];
  level4Courses?: string[];
  schoolsOffering?: string[];
  relevanceScore?: number;
  matchReason?: string;
}

export class HighSchoolAgent extends BaseAgent<HighSchoolProgram> {
  private readonly DEFAULT_LIMIT = 20;

  constructor() {
    super('highschool');
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.ensureInitialized();
    this.initialized = true;

    console.log('High School Agent initialized');
  }

  /**
   * Process a request and return high school programs
   */
  async process(
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): Promise<AgentResponse<HighSchoolProgram>> {
    const startTime = Date.now();

    try {
      await this.ensureInitialized();

      // Generate cache key
      const cacheKey = this.generateCacheKey(cipContext, userProfile);

      // Try to get from cache
      return await this.cacheOrExecute(
        cacheKey,
        async () => {
          // Get all high school programs from CIP context
          const programs = await this.buildProgramList(cipContext, userProfile);

          // Sort by relevance
          this.sortByRelevance(programs);

          // Limit results
          const limitedPrograms = this.limitResults(programs, this.DEFAULT_LIMIT);

          const processingTime = Date.now() - startTime;

          return this.buildSuccessResponse(
            limitedPrograms,
            cipContext.twoDigit,
            programs.length,
            processingTime
          );
        },
        3600 // Cache for 1 hour
      );
    } catch (error) {
      console.error('High School Agent error:', error);
      return this.buildErrorResponse(`Failed to process high school programs: ${error}`);
    }
  }

  /**
   * Build list of high school programs from CIP context
   */
  private async buildProgramList(
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): Promise<HighSchoolProgram[]> {
    const programs: HighSchoolProgram[] = [];
    const processedPrograms = new Set<string>();

    // 1. Get programs directly mentioned in CIP context
    for (const programName of cipContext.relatedPrograms.highschool) {
      if (!processedPrograms.has(programName)) {
        const program = await this.buildProgram(programName, cipContext, userProfile);
        if (program) {
          programs.push(program);
          processedPrograms.add(programName);
        }
      }
    }

    // 2. Get programs from CIP 2-digit codes
    for (const cip2 of cipContext.twoDigit) {
      const programNames = this.cipIndex.getHSProgramsForCIP2(cip2);
      for (const programName of programNames) {
        if (!processedPrograms.has(programName)) {
          const program = await this.buildProgram(programName, cipContext, userProfile);
          if (program) {
            programs.push(program);
            processedPrograms.add(programName);
          }
        }
      }
    }

    // If no programs found, get all programs and score them
    if (programs.length === 0) {
      const allPrograms = this.cipIndex.getAllHSPrograms();
      for (const programName of allPrograms.slice(0, 30)) {
        // Limit to first 30 for performance
        const program = await this.buildProgram(programName, cipContext, userProfile);
        if (program && program.relevanceScore && program.relevanceScore > 30) {
          programs.push(program);
        }
      }
    }

    return programs;
  }

  /**
   * Build a complete high school program object
   */
  private async buildProgram(
    programOfStudy: string,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): Promise<HighSchoolProgram | null> {
    try {
      // Get CIP codes for this program
      const cip2Codes = this.cipIndex.getCIP2ForHSProgram(programOfStudy);

      // Get course sequence
      const courses = this.cipIndex.getCoursesForPOS(programOfStudy);

      // Get recommended courses
      const recommended = this.cipIndex.getRecommendedCoursesForPOS(programOfStudy);

      // Get school info
      const schoolInfo = this.cipIndex.getSchoolInfoForPOS(programOfStudy);

      // Build the program object
      const program: HighSchoolProgram = {
        programOfStudy,
        cip2Digit: cip2Codes,
        courseSequence: {
          grade9: courses?.['9TH_GRADE_COURSES'] || [],
          grade10: courses?.['10TH_GRADE_COURSES'] || [],
          grade11: courses?.['11TH_GRADE_COURSES'] || [],
          grade12: courses?.['12TH_GRADE_COURSES'] || []
        },
        recommendedCourses: recommended?.RECOMMENDED_COURSES,
        level1Courses: recommended?.LEVEL_1_POS_COURSES,
        level2Courses: recommended?.LEVEL_2_POS_COURSES,
        level3Courses: recommended?.LEVEL_3_POS_COURSES,
        level4Courses: recommended?.LEVEL_4_POS_COURSES,
        schoolsOffering: schoolInfo?.HIGH_SCHOOL
      };

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(program, cipContext, userProfile);
      program.relevanceScore = relevanceScore;

      // Add match reason
      program.matchReason = this.determineMatchReason(program, cipContext, userProfile);

      return program;
    } catch (error) {
      console.error(`Error building program ${programOfStudy}:`, error);
      return null;
    }
  }

  /**
   * Get relevance factors for a high school program
   */
  protected getRelevanceFactors(
    program: HighSchoolProgram,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): RelevanceFactors {
    let cipMatch = 50; // Base score for being in result set
    let locationMatch = 0;
    let profileAlignment = 0;
    let keywordMatch = 0;
    let gradeLevel = 0;
    let availability = 0;

    // CIP match - higher score for exact CIP matches
    const programCIPs = new Set(program.cip2Digit);
    const contextCIPs = new Set(cipContext.twoDigit);
    let cipMatchCount = 0;

    for (const cip of contextCIPs) {
      if (programCIPs.has(cip)) {
        cipMatchCount++;
      }
    }

    if (contextCIPs.size > 0) {
      cipMatch = 50 + (cipMatchCount / contextCIPs.size) * 50;
    }

    // Location match
    if (userProfile?.location && program.schoolsOffering) {
      const islandSchools = this.getSchoolsByIsland(userProfile.location);
      const hasLocalSchools = program.schoolsOffering.some(school =>
        islandSchools.some(island => school.includes(island))
      );

      if (hasLocalSchools) {
        locationMatch = 25;
      }
    }

    // Profile alignment - interests and career goals
    if (userProfile) {
      const programText = program.programOfStudy.toLowerCase();

      // Check interests
      if (userProfile.interests) {
        const interestScore = this.checkInterestsAlignment(programText, userProfile.interests);
        profileAlignment += interestScore;
      }

      // Check career goals
      if (userProfile.careerGoals) {
        const careerScore = this.checkInterestsAlignment(programText, userProfile.careerGoals);
        profileAlignment += careerScore;
      }
    }

    // Keyword match
    if (cipContext.keywords && cipContext.keywords.length > 0) {
      const programText = program.programOfStudy;
      keywordMatch = this.calculateKeywordMatch(programText, cipContext.keywords);
    }

    // Grade level appropriateness
    if (userProfile?.gradeLevel) {
      gradeLevel = this.calculateGradeLevelScore(userProfile.gradeLevel);
    }

    // Availability - bonus if many schools offer it
    if (program.schoolsOffering && program.schoolsOffering.length > 0) {
      availability = Math.min(10, program.schoolsOffering.length * 2);
    }

    return {
      cipMatch,
      locationMatch,
      profileAlignment,
      keywordMatch,
      gradeLevel,
      availability
    };
  }

  /**
   * Calculate grade level appropriateness score
   */
  private calculateGradeLevelScore(gradeLevel: number): number {
    // Higher scores for students in grades 9-11 (still have time to start POS)
    // Lower scores for grade 12 (may be too late to start)
    if (gradeLevel <= 9) return 20; // Ideal time to start
    if (gradeLevel === 10) return 18;
    if (gradeLevel === 11) return 15;
    if (gradeLevel === 12) return 10; // Still relevant but less time

    return 0; // Not a high school student
  }

  /**
   * Get schools by island location
   */
  private getSchoolsByIsland(island: string): string[] {
    const normalizedIsland = island.toLowerCase();

    const islandSchools: Record<string, string[]> = {
      oahu: ['Honolulu', 'Pearl City', 'Waipahu', 'Aiea', 'Kapolei', 'Mililani'],
      maui: ['Maui', 'Kahului', 'Wailuku', 'Lahaina'],
      hawaii: ['Hilo', 'Kona', 'Hawaii Island', 'Big Island'],
      kauai: ['Kauai', 'Lihue', 'Kapaa'],
      molokai: ['Molokai'],
      lanai: ['Lanai']
    };

    for (const [key, schools] of Object.entries(islandSchools)) {
      if (normalizedIsland.includes(key)) {
        return schools;
      }
    }

    return [];
  }

  /**
   * Determine why this program matched
   */
  private determineMatchReason(
    program: HighSchoolProgram,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): string {
    const reasons: string[] = [];

    // CIP match
    const programCIPs = new Set(program.cip2Digit);
    const contextCIPs = new Set(cipContext.twoDigit);
    const matchingCIPs = Array.from(contextCIPs).filter(cip => programCIPs.has(cip));

    if (matchingCIPs.length > 0) {
      reasons.push('Matches your area of interest');
    }

    // Location match
    if (userProfile?.location && program.schoolsOffering) {
      const islandSchools = this.getSchoolsByIsland(userProfile.location);
      const hasLocalSchools = program.schoolsOffering.some(school =>
        islandSchools.some(island => school.includes(island))
      );

      if (hasLocalSchools) {
        reasons.push(`Available on ${userProfile.location}`);
      }
    }

    // Interest match
    if (userProfile?.interests) {
      const programText = program.programOfStudy.toLowerCase();
      const matchingInterests = userProfile.interests.filter(interest =>
        programText.includes(interest.toLowerCase())
      );

      if (matchingInterests.length > 0) {
        reasons.push(`Aligns with your interest in ${matchingInterests[0]}`);
      }
    }

    return reasons.join(' • ') || 'Related to your search';
  }
}
