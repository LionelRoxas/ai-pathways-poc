/**
 * Workforce Agent
 *
 * Handles queries related to career pathways and workforce data.
 * Returns career options with SOC codes and labor market information.
 */

import { BaseAgent, CIPContext, AgentResponse, RelevanceFactors } from './base-agent';
import { ExtractedProfile } from '@/app/components/AIPathwaysChat/types';

export interface CareerPathway {
  cipCode: string;
  socCode: string;
  cip2Digit?: string;
  title?: string;
  medianSalary?: number;
  jobOpenings?: number;
  companies?: number;
  relevanceScore?: number;
  matchReason?: string;
  relatedPrograms?: {
    highschool: string[];
    college: string[];
  };
}

export class WorkforceAgent extends BaseAgent<CareerPathway> {
  private readonly DEFAULT_LIMIT = 25;

  constructor() {
    super('workforce');
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

    console.log('Workforce Agent initialized');
  }

  /**
   * Process a request and return career pathways
   */
  async process(
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): Promise<AgentResponse<CareerPathway>> {
    const startTime = Date.now();

    try {
      await this.ensureInitialized();

      // Generate cache key
      const cacheKey = this.generateCacheKey(cipContext, userProfile);

      // Try to get from cache
      return await this.cacheOrExecute(
        cacheKey,
        async () => {
          // Get all career pathways from CIP context
          const pathways = await this.buildPathwayList(cipContext, userProfile);

          // Sort by relevance
          this.sortByRelevance(pathways);

          // Limit results
          const limitedPathways = this.limitResults(pathways, this.DEFAULT_LIMIT);

          const processingTime = Date.now() - startTime;

          return this.buildSuccessResponse(
            limitedPathways,
            cipContext.fullCodes,
            pathways.length,
            processingTime
          );
        },
        3600 // Cache for 1 hour
      );
    } catch (error) {
      console.error('Workforce Agent error:', error);
      return this.buildErrorResponse(`Failed to process career pathways: ${error}`);
    }
  }

  /**
   * Build list of career pathways from CIP context
   */
  private async buildPathwayList(
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): Promise<CareerPathway[]> {
    const pathways: CareerPathway[] = [];
    const processedPathways = new Set<string>();

    // Get SOC codes for each full CIP code
    for (const cipCode of cipContext.fullCodes) {
      const socCodes = this.cipIndex.getSOCsForCIP(cipCode);
      const cip2 = this.cipIndex.getCIP2ForFullCIP(cipCode);

      for (const socCode of socCodes) {
        const pathwayKey = `${cipCode}-${socCode}`;

        if (!processedPathways.has(pathwayKey)) {
          const pathway = this.buildPathway(
            cipCode,
            socCode,
            cip2,
            cipContext,
            userProfile
          );

          pathways.push(pathway);
          processedPathways.add(pathwayKey);
        }
      }

      // If no SOC codes found for this CIP, create a placeholder entry
      if (socCodes.length === 0) {
        const pathwayKey = `${cipCode}-unknown`;

        if (!processedPathways.has(pathwayKey)) {
          const pathway: CareerPathway = {
            cipCode,
            socCode: 'N/A',
            cip2Digit: cip2,
            title: 'Career opportunities available',
            relevanceScore: 50,
            matchReason: 'Related to your field of study'
          };

          pathways.push(pathway);
          processedPathways.add(pathwayKey);
        }
      }
    }

    return pathways;
  }

  /**
   * Build a complete career pathway object
   */
  private buildPathway(
    cipCode: string,
    socCode: string,
    cip2Digit: string | undefined,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): CareerPathway {
    // Extract job title from SOC code if available
    const title = this.getSOCTitle(socCode);

    const pathway: CareerPathway = {
      cipCode,
      socCode,
      cip2Digit,
      title,
      relatedPrograms: {
        highschool: cipContext.relatedPrograms.highschool,
        college: cipContext.relatedPrograms.college
      }
    };

    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(pathway, cipContext, userProfile);
    pathway.relevanceScore = relevanceScore;

    // Add match reason
    pathway.matchReason = this.determineMatchReason(pathway, cipContext, userProfile);

    return pathway;
  }

  /**
   * Get SOC title from SOC code
   * This is a simplified mapping - in production, you'd have a full SOC database
   */
  private getSOCTitle(socCode: string): string {
    // For now, return a formatted version of the SOC code
    // In a real implementation, you'd look this up in a SOC code database
    // or use the Lightcast API

    // Extract major group (first 2 digits)
    const majorGroup = socCode.substring(0, 2);

    const majorGroups: Record<string, string> = {
      '11': 'Management Occupations',
      '13': 'Business and Financial Operations',
      '15': 'Computer and Mathematical Occupations',
      '17': 'Architecture and Engineering',
      '19': 'Life, Physical, and Social Science',
      '21': 'Community and Social Service',
      '23': 'Legal Occupations',
      '25': 'Educational Instruction and Library',
      '27': 'Arts, Design, Entertainment, Sports, and Media',
      '29': 'Healthcare Practitioners and Technical',
      '31': 'Healthcare Support',
      '33': 'Protective Service',
      '35': 'Food Preparation and Serving',
      '37': 'Building and Grounds Cleaning and Maintenance',
      '39': 'Personal Care and Service',
      '41': 'Sales and Related',
      '43': 'Office and Administrative Support',
      '45': 'Farming, Fishing, and Forestry',
      '47': 'Construction and Extraction',
      '49': 'Installation, Maintenance, and Repair',
      '51': 'Production Occupations',
      '53': 'Transportation and Material Moving'
    };

    return majorGroups[majorGroup] || `Career in SOC ${socCode}`;
  }

  /**
   * Get relevance factors for a career pathway
   */
  protected getRelevanceFactors(
    pathway: CareerPathway,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): RelevanceFactors {
    let cipMatch = 50; // Base score for being in result set
    let locationMatch = 0;
    let profileAlignment = 0;
    let keywordMatch = 0;
    let gradeLevel = 0;
    let availability = 0;

    // CIP match - exact match gets highest score
    if (cipContext.fullCodes.includes(pathway.cipCode)) {
      cipMatch = 100;
    } else if (pathway.cip2Digit && cipContext.twoDigit.includes(pathway.cip2Digit)) {
      cipMatch = 70;
    }

    // Profile alignment
    if (userProfile) {
      const pathwayText = `${pathway.title || ''} ${pathway.socCode}`.toLowerCase();

      // Check career goals
      if (userProfile.careerGoals) {
        const careerScore = this.checkInterestsAlignment(pathwayText, userProfile.careerGoals);
        profileAlignment += careerScore;
      }

      // Check interests
      if (userProfile.interests) {
        const interestScore = this.checkInterestsAlignment(pathwayText, userProfile.interests);
        profileAlignment += interestScore * 0.7; // Weighted less for workforce
      }

      // Work preferences
      if (userProfile.workPreferences) {
        profileAlignment += this.calculateWorkPreferencesMatch(pathway, userProfile.workPreferences);
      }
    }

    // Keyword match
    if (cipContext.keywords && cipContext.keywords.length > 0) {
      const pathwayText = `${pathway.title || ''} ${pathway.socCode}`;
      keywordMatch = this.calculateKeywordMatch(pathwayText, cipContext.keywords);
    }

    // Salary bonus (if available)
    if (pathway.medianSalary) {
      availability = this.calculateSalaryScore(pathway.medianSalary);
    }

    // Job openings bonus (if available)
    if (pathway.jobOpenings && pathway.jobOpenings > 0) {
      availability += Math.min(10, Math.log10(pathway.jobOpenings) * 2);
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
   * Calculate work preferences match score
   */
  private calculateWorkPreferencesMatch(
    pathway: CareerPathway,
    preferences: any
  ): number {
    let score = 0;

    // Salary preference match
    if (preferences.salary && pathway.medianSalary) {
      const preferredSalary = this.parseSalaryPreference(preferences.salary);
      if (preferredSalary && pathway.medianSalary >= preferredSalary) {
        score += 10;
      }
    }

    // Remote work preference
    if (preferences.remoteWork) {
      // Check if SOC code is likely remote-friendly
      // (Computer, Business, Management occupations)
      const remoteSOCGroups = ['11', '13', '15', '27'];
      const majorGroup = pathway.socCode.substring(0, 2);

      if (remoteSOCGroups.includes(majorGroup)) {
        score += 8;
      }
    }

    return score;
  }

  /**
   * Parse salary preference from text
   */
  private parseSalaryPreference(salaryText: string): number | null {
    const match = salaryText.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return null;
  }

  /**
   * Calculate salary attractiveness score
   */
  private calculateSalaryScore(medianSalary: number): number {
    // Higher salaries get bonus points
    if (medianSalary >= 100000) return 10;
    if (medianSalary >= 80000) return 8;
    if (medianSalary >= 60000) return 6;
    if (medianSalary >= 40000) return 4;
    return 2;
  }

  /**
   * Determine why this pathway matched
   */
  private determineMatchReason(
    pathway: CareerPathway,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): string {
    const reasons: string[] = [];

    // CIP exact match
    if (cipContext.fullCodes.includes(pathway.cipCode)) {
      reasons.push('Direct career path from your field');
    } else if (pathway.cip2Digit && cipContext.twoDigit.includes(pathway.cip2Digit)) {
      reasons.push('Related career opportunity');
    }

    // Pathway connection
    if (pathway.relatedPrograms) {
      if (pathway.relatedPrograms.college.length > 0) {
        reasons.push(`Connects to ${pathway.relatedPrograms.college[0]}`);
      } else if (pathway.relatedPrograms.highschool.length > 0) {
        reasons.push(`Starting from ${pathway.relatedPrograms.highschool[0]}`);
      }
    }

    // Salary information
    if (pathway.medianSalary) {
      const salaryK = Math.round(pathway.medianSalary / 1000);
      reasons.push(`Median salary: $${salaryK}K`);
    }

    // Job availability
    if (pathway.jobOpenings && pathway.jobOpenings > 10) {
      reasons.push(`${pathway.jobOpenings} job openings`);
    }

    return reasons.join(' • ') || 'Career opportunity in this field';
  }
}
