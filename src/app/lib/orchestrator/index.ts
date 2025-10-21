/**
 * Orchestrator
 *
 * Main orchestrator for the education pathways system.
 * Routes user queries to appropriate agents and aggregates responses.
 */

import { CIPMapper } from './cip-mapper';
import { QueryAnalyzer, QueryAnalysis } from './query-analyzer';
import { BaseAgent } from '../agents/base-agent';
import { HighSchoolAgent } from '../agents/highschool-agent';
import { CollegeAgent } from '../agents/college-agent';
import { WorkforceAgent } from '../agents/workforce-agent';
import { CacheService } from '../cache/cache-service';
import { ExtractedProfile } from '@/app/components/AIPathwaysChat/types';
import { getCIPIndex } from '../data/cip-index';

export interface OrchestratorRequest {
  message: string;
  userProfile?: string;
  extractedProfile?: ExtractedProfile;
  focusArea?: 'highschool' | 'college' | 'workforce' | 'general';
  language?: string;
}

export interface OrchestratorResponse {
  relatedHighSchool: any[];
  collegeOptions: any[];
  careerPaths: any[];
  cipCodesUsed: string[];
  cip2DigitUsed: string[];
  suggestedQuestions: string[];
  metadata: {
    intent: string;
    focusArea: string;
    agentsInvoked: string[];
    totalResults: number;
    processingTimeMs: number;
    cipContext: {
      hasHighSchoolPrograms: boolean;
      hasCollegePrograms: boolean;
      hasCareerData: boolean;
    };
  };
}

export class Orchestrator {
  private cipMapper: CIPMapper;
  private queryAnalyzer: QueryAnalyzer;
  private agents: Map<string, BaseAgent>;
  private cache: CacheService;
  private initialized: boolean = false;

  constructor() {
    this.cipMapper = new CIPMapper();
    this.queryAnalyzer = new QueryAnalyzer();
    this.cache = CacheService.getInstance();
    this.agents = new Map();

    // Initialize agents
    this.agents.set('highschool', new HighSchoolAgent());
    this.agents.set('college', new CollegeAgent());
    this.agents.set('workforce', new WorkforceAgent());
  }

  /**
   * Initialize the orchestrator and all components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing Orchestrator...');

    try {
      const startTime = Date.now();

      // Initialize CIP Index first (shared by all components)
      const cipIndex = getCIPIndex();
      await cipIndex.initialize();

      // Initialize CIP Mapper
      await this.cipMapper.initialize();

      // Initialize all agents in parallel
      await Promise.all(
        Array.from(this.agents.values()).map(agent => agent.initialize())
      );

      this.initialized = true;

      const initTime = Date.now() - startTime;
      console.log(`Orchestrator initialized successfully in ${initTime}ms`);
      console.log('CIP Index stats:', cipIndex.getStats());
    } catch (error) {
      console.error('Failed to initialize Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Route a user request through the orchestrator
   */
  async route(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const startTime = Date.now();

    try {
      // Ensure initialization
      await this.ensureInitialized();

      // 1. Analyze the query
      const queryAnalysis = await this.queryAnalyzer.analyze(request.message, {
        language: request.language || 'en',
        userProfile: request.userProfile,
        extractedProfile: request.extractedProfile
      });

      console.log('Query analysis:', {
        intent: queryAnalysis.intent,
        focusArea: queryAnalysis.focusArea,
        keywords: queryAnalysis.keywords,
        searchTerms: queryAnalysis.searchTerms
      });

      // 2. Map to CIP codes
      const cipContext = await this.cipMapper.findRelevantCIPs(queryAnalysis);

      console.log('CIP context:', {
        twoDigit: cipContext.twoDigit,
        fullCodesCount: cipContext.fullCodes.length,
        hasHS: cipContext.hasHighSchoolPrograms,
        hasCollege: cipContext.hasCollegePrograms,
        hasCareer: cipContext.hasCareerData
      });

      // 3. Determine which agents to invoke
      const targetAgents = this.determineAgents(
        queryAnalysis,
        cipContext,
        request.focusArea
      );

      console.log('Invoking agents:', targetAgents);

      // 4. Execute agents in parallel
      const agentResults = await Promise.all(
        targetAgents.map(agentName => {
          const agent = this.agents.get(agentName);
          return agent
            ? agent.process(cipContext, request.extractedProfile)
            : Promise.resolve(null);
        })
      );

      // 5. Aggregate results
      const response = this.aggregateResponses(
        agentResults.filter(r => r !== null),
        cipContext,
        queryAnalysis,
        targetAgents,
        startTime
      );

      // 6. Generate suggested questions
      response.suggestedQuestions = this.generateSuggestedQuestions(
        cipContext,
        queryAnalysis,
        request.extractedProfile
      );

      return response;
    } catch (error) {
      console.error('Orchestrator routing error:', error);

      // Return empty response with error metadata
      return {
        relatedHighSchool: [],
        collegeOptions: [],
        careerPaths: [],
        cipCodesUsed: [],
        cip2DigitUsed: [],
        suggestedQuestions: [],
        metadata: {
          intent: 'unknown',
          focusArea: 'general',
          agentsInvoked: [],
          totalResults: 0,
          processingTimeMs: Date.now() - startTime,
          cipContext: {
            hasHighSchoolPrograms: false,
            hasCollegePrograms: false,
            hasCareerData: false
          }
        }
      };
    }
  }

  /**
   * Determine which agents to invoke based on analysis
   */
  private determineAgents(
    analysis: QueryAnalysis,
    cipContext: any,
    focusArea?: string
  ): string[] {
    const agents = new Set<string>();

    // Add agents based on focus area
    if (focusArea && focusArea !== 'general') {
      agents.add(focusArea);
    }

    // Add agents based on detected focus area
    if (analysis.focusArea && analysis.focusArea !== 'general') {
      agents.add(analysis.focusArea);
    }

    // Add agents based on CIP context
    if (cipContext.hasHighSchoolPrograms) {
      agents.add('highschool');
    }
    if (cipContext.hasCollegePrograms) {
      agents.add('college');
    }
    if (cipContext.hasCareerData) {
      agents.add('workforce');
    }

    // If no specific agents determined, invoke all
    if (agents.size === 0) {
      agents.add('highschool');
      agents.add('college');
      agents.add('workforce');
    }

    return Array.from(agents);
  }

  /**
   * Aggregate responses from multiple agents
   */
  private aggregateResponses(
    agentResults: any[],
    cipContext: any,
    queryAnalysis: QueryAnalysis,
    agentsInvoked: string[],
    startTime: number
  ): OrchestratorResponse {
    const response: OrchestratorResponse = {
      relatedHighSchool: [],
      collegeOptions: [],
      careerPaths: [],
      cipCodesUsed: cipContext.fullCodes,
      cip2DigitUsed: cipContext.twoDigit,
      suggestedQuestions: [],
      metadata: {
        intent: queryAnalysis.intent,
        focusArea: queryAnalysis.focusArea || 'general',
        agentsInvoked,
        totalResults: 0,
        processingTimeMs: Date.now() - startTime,
        cipContext: {
          hasHighSchoolPrograms: cipContext.hasHighSchoolPrograms,
          hasCollegePrograms: cipContext.hasCollegePrograms,
          hasCareerData: cipContext.hasCareerData
        }
      }
    };

    // Aggregate results from each agent
    for (const result of agentResults) {
      if (!result || result.error) {
        continue;
      }

      switch (result.agentType) {
        case 'highschool':
          response.relatedHighSchool = result.data;
          break;
        case 'college':
          response.collegeOptions = result.data;
          break;
        case 'workforce':
          response.careerPaths = result.data;
          break;
      }
    }

    // Calculate total results
    response.metadata.totalResults =
      response.relatedHighSchool.length +
      response.collegeOptions.length +
      response.careerPaths.length;

    return response;
  }

  /**
   * Generate suggested follow-up questions
   */
  private generateSuggestedQuestions(
    cipContext: any,
    queryAnalysis: QueryAnalysis,
    userProfile?: ExtractedProfile
  ): string[] {
    const questions: string[] = [];

    // Questions based on what data is available
    if (cipContext.hasHighSchoolPrograms && cipContext.relatedPrograms.highschool.length > 0) {
      const program = cipContext.relatedPrograms.highschool[0];
      questions.push(`What courses do I need for ${program}?`);
      questions.push(`Which schools offer ${program}?`);
    }

    if (cipContext.hasCollegePrograms) {
      questions.push('What university programs can I pursue?');
      questions.push('What are the admission requirements?');
    }

    if (cipContext.hasCareerData) {
      questions.push('What careers can I pursue in this field?');
      questions.push('What is the salary potential?');
    }

    // Questions based on user profile
    if (userProfile) {
      if (userProfile.educationLevel === 'high_school') {
        questions.push('How do I prepare for college in this field?');
        questions.push('What summer programs are available?');
      }

      if (userProfile.location) {
        questions.push(`What programs are available on ${userProfile.location}?`);
      }
    }

    // General exploratory questions
    questions.push('Show me related career pathways');
    questions.push('What are similar programs I could explore?');

    // Return top 5 questions
    return questions.slice(0, 5);
  }

  /**
   * Ensure orchestrator is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Check if orchestrator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      agents: Array.from(this.agents.keys()),
      cipMapperInitialized: this.cipMapper.isInitialized(),
      agentStats: Array.from(this.agents.entries()).map(([name, agent]) => ({
        name,
        initialized: agent.isInitialized()
      }))
    };
  }
}

/**
 * Singleton instance
 */
let orchestratorInstance: Orchestrator | null = null;

export function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
  }
  return orchestratorInstance;
}
