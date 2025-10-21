/**
 * College Agent
 *
 * Handles queries related to University of Hawaii programs.
 * Returns college program recommendations with campus and degree information.
 */

import { BaseAgent, CIPContext, AgentResponse, RelevanceFactors } from './base-agent';
import { ExtractedProfile } from '@/app/components/AIPathwaysChat/types';

export interface CollegeProgram {
  cipCode: string;
  programName: string;
  campus: string;
  degree?: string;
  cip2Digit?: string;
  relevanceScore?: number;
  matchReason?: string;
}

export class CollegeAgent extends BaseAgent<CollegeProgram> {
  private readonly DEFAULT_LIMIT = 30;

  constructor() {
    super('college');
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

    console.log('College Agent initialized');
  }

  /**
   * Process a request and return college programs
   */
  async process(
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): Promise<AgentResponse<CollegeProgram>> {
    const startTime = Date.now();

    try {
      await this.ensureInitialized();

      // Generate cache key
      const cacheKey = this.generateCacheKey(cipContext, userProfile);

      // Try to get from cache
      return await this.cacheOrExecute(
        cacheKey,
        async () => {
          // Get all college programs from CIP context
          const programs = await this.buildProgramList(cipContext, userProfile);

          // Sort by relevance
          this.sortByRelevance(programs);

          // Limit results
          const limitedPrograms = this.limitResults(programs, this.DEFAULT_LIMIT);

          const processingTime = Date.now() - startTime;

          return this.buildSuccessResponse(
            limitedPrograms,
            cipContext.fullCodes,
            programs.length,
            processingTime
          );
        },
        3600 // Cache for 1 hour
      );
    } catch (error) {
      console.error('College Agent error:', error);
      return this.buildErrorResponse(`Failed to process college programs: ${error}`);
    }
  }

  /**
   * Build list of college programs from CIP context
   */
  private async buildProgramList(
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): Promise<CollegeProgram[]> {
    const programs: CollegeProgram[] = [];
    const processedPrograms = new Set<string>();

    // Get programs for each full CIP code
    for (const cipCode of cipContext.fullCodes) {
      const programNames = this.cipIndex.getProgramsForCIP(cipCode);
      const campuses = this.cipIndex.getCampusesForCIP(cipCode);
      const cip2 = this.cipIndex.getCIP2ForFullCIP(cipCode);

      for (const programName of programNames) {
        for (const campus of campuses) {
          const programKey = `${cipCode}-${programName}-${campus}`;

          if (!processedPrograms.has(programKey)) {
            const program = this.buildProgram(
              cipCode,
              programName,
              campus,
              cip2,
              cipContext,
              userProfile
            );

            programs.push(program);
            processedPrograms.add(programKey);
          }
        }

        // If no campus data, create entry with just program name
        if (campuses.length === 0) {
          const programKey = `${cipCode}-${programName}-unknown`;

          if (!processedPrograms.has(programKey)) {
            const program = this.buildProgram(
              cipCode,
              programName,
              'University of Hawaii',
              cip2,
              cipContext,
              userProfile
            );

            programs.push(program);
            processedPrograms.add(programKey);
          }
        }
      }
    }

    return programs;
  }

  /**
   * Build a complete college program object
   */
  private buildProgram(
    cipCode: string,
    programName: string,
    campus: string,
    cip2Digit: string | undefined,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): CollegeProgram {
    // Extract degree type from program name if possible
    const degree = this.extractDegreeType(programName);

    const program: CollegeProgram = {
      cipCode,
      programName,
      campus,
      degree,
      cip2Digit
    };

    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(program, cipContext, userProfile);
    program.relevanceScore = relevanceScore;

    // Add match reason
    program.matchReason = this.determineMatchReason(program, cipContext, userProfile);

    return program;
  }

  /**
   * Extract degree type from program name
   */
  private extractDegreeType(programName: string): string | undefined {
    const lowerName = programName.toLowerCase();

    if (lowerName.includes('bachelor of arts') || lowerName.includes('(ba)')) {
      return 'Bachelor of Arts';
    }
    if (lowerName.includes('bachelor of science') || lowerName.includes('(bs)')) {
      return 'Bachelor of Science';
    }
    if (lowerName.includes('bachelor of')) {
      return 'Bachelor';
    }
    if (lowerName.includes('associate of arts') || lowerName.includes('(aa)')) {
      return 'Associate of Arts';
    }
    if (lowerName.includes('associate of science') || lowerName.includes('(as)')) {
      return 'Associate of Science';
    }
    if (lowerName.includes('associate of')) {
      return 'Associate';
    }
    if (lowerName.includes('master of')) {
      return 'Master';
    }
    if (lowerName.includes('doctor of') || lowerName.includes('ph.d')) {
      return 'Doctorate';
    }
    if (lowerName.includes('certificate')) {
      return 'Certificate';
    }

    return undefined;
  }

  /**
   * Get relevance factors for a college program
   */
  protected getRelevanceFactors(
    program: CollegeProgram,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): RelevanceFactors {
    let cipMatch = 50; // Base score for being in result set
    let locationMatch = 0;
    let profileAlignment = 0;
    let keywordMatch = 0;
    let gradeLevel = 0;
    let availability = 10; // Base availability score

    // CIP match - exact match gets highest score
    if (cipContext.fullCodes.includes(program.cipCode)) {
      cipMatch = 100;
    } else if (program.cip2Digit && cipContext.twoDigit.includes(program.cip2Digit)) {
      cipMatch = 70; // Category match but not exact
    }

    // Location match - prefer programs on user's island
    if (userProfile?.location) {
      locationMatch = this.calculateLocationMatch(program.campus, userProfile.location);
    }

    // Profile alignment
    if (userProfile) {
      const programText = `${program.programName} ${program.degree || ''}`.toLowerCase();

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

      // Education level match
      if (userProfile.educationLevel) {
        const eduScore = this.calculateEducationLevelMatch(
          program.degree,
          userProfile.educationLevel
        );
        profileAlignment += eduScore;
      }
    }

    // Keyword match
    if (cipContext.keywords && cipContext.keywords.length > 0) {
      const programText = `${program.programName} ${program.campus}`;
      keywordMatch = this.calculateKeywordMatch(programText, cipContext.keywords);
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
   * Calculate education level match score
   */
  private calculateEducationLevelMatch(
    programDegree: string | undefined,
    userEducationLevel: string
  ): number {
    if (!programDegree) return 0;

    const lowerDegree = programDegree.toLowerCase();
    const lowerEducation = userEducationLevel.toLowerCase();

    // High school students -> Associate or Certificate programs
    if (lowerEducation.includes('high_school')) {
      if (lowerDegree.includes('associate') || lowerDegree.includes('certificate')) {
        return 15;
      }
      if (lowerDegree.includes('bachelor')) {
        return 10; // Still relevant but longer path
      }
    }

    // Some college -> Bachelor programs
    if (lowerEducation.includes('some_college')) {
      if (lowerDegree.includes('bachelor')) {
        return 15;
      }
      if (lowerDegree.includes('associate')) {
        return 12; // May want to complete associate first
      }
    }

    // Associate degree holders -> Bachelor programs
    if (lowerEducation.includes('associates')) {
      if (lowerDegree.includes('bachelor')) {
        return 15;
      }
    }

    // Bachelor degree holders -> Master/Doctorate programs
    if (lowerEducation.includes('bachelors')) {
      if (lowerDegree.includes('master') || lowerDegree.includes('doctorate')) {
        return 15;
      }
    }

    return 0;
  }

  /**
   * Determine why this program matched
   */
  private determineMatchReason(
    program: CollegeProgram,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): string {
    const reasons: string[] = [];

    // CIP exact match
    if (cipContext.fullCodes.includes(program.cipCode)) {
      reasons.push('Strong match for your interests');
    } else if (program.cip2Digit && cipContext.twoDigit.includes(program.cip2Digit)) {
      reasons.push('Related to your field of interest');
    }

    // Location match
    if (userProfile?.location && program.campus) {
      const locationScore = this.calculateLocationMatch(program.campus, userProfile.location);
      if (locationScore > 0) {
        reasons.push(`Located on ${userProfile.location}`);
      }
    }

    // Pathway connection
    if (cipContext.relatedPrograms.highschool.length > 0) {
      reasons.push(`Connects to ${cipContext.relatedPrograms.highschool[0]}`);
    }

    // Degree level match
    if (userProfile?.educationLevel && program.degree) {
      const eduScore = this.calculateEducationLevelMatch(
        program.degree,
        userProfile.educationLevel
      );
      if (eduScore > 10) {
        reasons.push(`Appropriate for your education level`);
      }
    }

    return reasons.join(' • ') || 'Related to your search';
  }
}
