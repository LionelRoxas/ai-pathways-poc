/**
 * Base Agent Class
 *
 * Abstract base class for all specialized agents in the orchestrator-agent system.
 * Provides common functionality for data access, relevance scoring, and caching.
 */

import { CIPIndex, getCIPIndex } from '../data/cip-index';
import { CacheService } from '../cache/cache-service';
import { ExtractedProfile } from '@/app/components/AIPathwaysChat/types';

/**
 * CIP Context provided by the CIP Mapper
 */
export interface CIPContext {
  twoDigit: string[];         // 2-digit CIP categories
  fullCodes: string[];        // Full 6-digit CIP codes
  hasHighSchoolPrograms: boolean;
  hasCollegePrograms: boolean;
  hasCareerData: boolean;
  relatedPrograms: {
    highschool: string[];      // Program of Study names
    college: string[];         // Program names
  };
  keywords: string[];         // Extracted keywords from query
}

/**
 * Base response interface for all agents
 */
export interface AgentResponse<T = any> {
  agentType: string;
  data: T[];
  cipCodesUsed: string[];
  metadata: {
    totalFound: number;
    returned: number;
    averageRelevance?: number;
    processingTimeMs?: number;
  };
  error?: string;
}

/**
 * Relevance scoring factors
 */
export interface RelevanceFactors {
  cipMatch: number;           // Base score for CIP code match
  locationMatch: number;      // Bonus for matching user location
  profileAlignment: number;   // Alignment with user profile
  keywordMatch: number;       // Keyword relevance
  gradeLevel: number;         // Grade level appropriateness (for HS programs)
  availability: number;       // Program/course availability
}

/**
 * Abstract base agent class
 */
export abstract class BaseAgent<T = any> {
  protected cipIndex: CIPIndex;
  protected cache: CacheService;
  protected agentType: string;
  protected initialized: boolean = false;

  constructor(agentType: string) {
    this.agentType = agentType;
    this.cipIndex = getCIPIndex();
    this.cache = CacheService.getInstance();
  }

  /**
   * Initialize the agent
   * Must be implemented by subclasses to load agent-specific data
   */
  abstract initialize(): Promise<void>;

  /**
   * Process a request with CIP context and user profile
   * Must be implemented by subclasses
   */
  abstract process(
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): Promise<AgentResponse<T>>;

  /**
   * Calculate relevance score for an item
   * Can be overridden by subclasses for custom scoring
   */
  protected calculateRelevanceScore(
    item: T,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): number {
    const factors = this.getRelevanceFactors(item, cipContext, userProfile);

    // Weighted sum of factors
    const weights = {
      cipMatch: 0.3,
      locationMatch: 0.15,
      profileAlignment: 0.25,
      keywordMatch: 0.15,
      gradeLevel: 0.1,
      availability: 0.05
    };

    return (
      factors.cipMatch * weights.cipMatch +
      factors.locationMatch * weights.locationMatch +
      factors.profileAlignment * weights.profileAlignment +
      factors.keywordMatch * weights.keywordMatch +
      factors.gradeLevel * weights.gradeLevel +
      factors.availability * weights.availability
    );
  }

  /**
   * Get relevance factors for an item
   * Should be overridden by subclasses to provide specific scoring logic
   */
  protected getRelevanceFactors(
    item: T,
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): RelevanceFactors {
    return {
      cipMatch: 50,
      locationMatch: 0,
      profileAlignment: 0,
      keywordMatch: 0,
      gradeLevel: 0,
      availability: 0
    };
  }

  /**
   * Normalize a score to 0-100 range
   */
  protected normalizeScore(score: number): number {
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Sort items by relevance score
   */
  protected sortByRelevance(items: (T & { relevanceScore?: number })[]): void {
    items.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Calculate keyword match score
   */
  protected calculateKeywordMatch(text: string, keywords: string[]): number {
    if (!keywords || keywords.length === 0) return 0;

    const normalizedText = text.toLowerCase();
    let matchCount = 0;

    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    return (matchCount / keywords.length) * 100;
  }

  /**
   * Calculate location match score
   */
  protected calculateLocationMatch(
    itemLocation: string | string[] | undefined,
    userLocation: string | null | undefined
  ): number {
    if (!userLocation || !itemLocation) return 0;

    const normalizedUserLocation = userLocation.toLowerCase();
    const locations = Array.isArray(itemLocation) ? itemLocation : [itemLocation];

    for (const location of locations) {
      if (location.toLowerCase().includes(normalizedUserLocation)) {
        return 25; // Bonus points for location match
      }
    }

    return 0;
  }

  /**
   * Check if interests align
   */
  protected checkInterestsAlignment(
    itemText: string,
    interests: string[] | undefined
  ): number {
    if (!interests || interests.length === 0) return 0;

    const normalizedText = itemText.toLowerCase();
    let matchCount = 0;

    for (const interest of interests) {
      if (normalizedText.includes(interest.toLowerCase())) {
        matchCount++;
      }
    }

    return (matchCount / interests.length) * 30; // Up to 30 points for interest alignment
  }

  /**
   * Generate cache key for agent queries
   */
  protected generateCacheKey(
    cipContext: CIPContext,
    userProfile?: ExtractedProfile
  ): string {
    const cipCodesKey = cipContext.fullCodes.sort().join(',');
    const profileKey = userProfile
      ? JSON.stringify({
          educationLevel: userProfile.educationLevel,
          location: userProfile.location,
          interests: userProfile.interests?.slice(0, 3).sort(),
        })
      : 'no-profile';

    return `${this.agentType}:${cipCodesKey}:${profileKey}`;
  }

  /**
   * Get from cache or execute function
   */
  protected async cacheOrExecute<R>(
    key: string,
    fn: () => Promise<R>,
    ttl: number = 3600
  ): Promise<R> {
    // Try to get from cache
    const cached = await this.cache.get(key);
    if (cached) {
      return cached as R;
    }

    // Execute function
    const result = await fn();

    // Store in cache
    await this.cache.set(key, result, { ttl });

    return result;
  }

  /**
   * Limit results to top N items
   */
  protected limitResults<R>(items: R[], limit: number = 20): R[] {
    return items.slice(0, limit);
  }

  /**
   * Calculate average relevance score
   */
  protected calculateAverageRelevance(
    items: (T & { relevanceScore?: number })[]
  ): number {
    if (items.length === 0) return 0;

    const sum = items.reduce((acc, item) => acc + (item.relevanceScore || 0), 0);
    return sum / items.length;
  }

  /**
   * Ensure the agent is initialized
   */
  protected async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Ensure CIP index is initialized
    if (!this.cipIndex.isInitialized()) {
      await this.cipIndex.initialize();
    }
  }

  /**
   * Build error response
   */
  protected buildErrorResponse(error: string): AgentResponse<T> {
    return {
      agentType: this.agentType,
      data: [],
      cipCodesUsed: [],
      metadata: {
        totalFound: 0,
        returned: 0
      },
      error
    };
  }

  /**
   * Build success response
   */
  protected buildSuccessResponse(
    data: T[],
    cipCodesUsed: string[],
    totalFound: number,
    processingTimeMs?: number
  ): AgentResponse<T> {
    return {
      agentType: this.agentType,
      data,
      cipCodesUsed,
      metadata: {
        totalFound,
        returned: data.length,
        averageRelevance: this.calculateAverageRelevance(
          data as (T & { relevanceScore?: number })[]
        ),
        processingTimeMs
      }
    };
  }

  /**
   * Get agent type
   */
  getAgentType(): string {
    return this.agentType;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
