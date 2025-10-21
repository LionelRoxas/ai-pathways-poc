/**
 * Query Analyzer
 *
 * Analyzes user queries to extract intent, keywords, and context
 * for the orchestrator routing system.
 */

import { analyzeAndImproveQuery, expandSearchTerms } from '@/app/utils/groqClient';
import { ExtractedProfile } from '@/app/components/AIPathwaysChat/types';

export interface QueryAnalysis {
  improvedQuery: string;
  searchTerms: string[];
  keywords: string[];
  intent: 'search' | 'profile_based' | 'mixed';
  ignoreProfile: boolean;
  expandedTerms: Record<string, string[]>;
  focusArea?: 'highschool' | 'college' | 'workforce' | 'general';
  language: string;
}

export interface QueryAnalyzerOptions {
  language?: string;
  userProfile?: string;
  extractedProfile?: ExtractedProfile;
}

export class QueryAnalyzer {
  /**
   * Analyze a user query to extract intent and keywords
   */
  async analyze(
    message: string,
    options: QueryAnalyzerOptions = {}
  ): Promise<QueryAnalysis> {
    const { language = 'en', userProfile, extractedProfile } = options;

    try {
      // Use existing Groq-based query analysis
      const analysis = await analyzeAndImproveQuery(
        message,
        userProfile,
        extractedProfile,
        language
      );

      // Extract keywords from the improved query
      const keywords = this.extractKeywords(analysis.improvedQuery, analysis.searchTerms);

      // Detect focus area from the query
      const focusArea = this.detectFocusArea(message, analysis.improvedQuery);

      return {
        ...analysis,
        keywords,
        focusArea,
        language
      };
    } catch (error) {
      console.error('Query analysis failed:', error);

      // Fallback to simple analysis
      return this.fallbackAnalysis(message, language);
    }
  }

  /**
   * Extract keywords from query and search terms
   */
  private extractKeywords(improvedQuery: string, searchTerms: string[]): string[] {
    const keywords = new Set<string>();

    // Add search terms
    for (const term of searchTerms) {
      const words = this.tokenize(term);
      words.forEach(word => keywords.add(word));
    }

    // Add words from improved query
    const queryWords = this.tokenize(improvedQuery);
    queryWords.forEach(word => keywords.add(word));

    return Array.from(keywords);
  }

  /**
   * Tokenize text into keywords
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out short words
  }

  /**
   * Detect focus area from the query
   */
  private detectFocusArea(
    originalMessage: string,
    improvedQuery: string
  ): 'highschool' | 'college' | 'workforce' | 'general' {
    const combined = `${originalMessage} ${improvedQuery}`.toLowerCase();

    // High school indicators
    const hsIndicators = [
      'high school',
      'grade 9',
      'grade 10',
      'grade 11',
      'grade 12',
      'freshman',
      'sophomore',
      'junior',
      'senior',
      'doe',
      'program of study'
    ];

    // College indicators
    const collegeIndicators = [
      'college',
      'university',
      'uh',
      'bachelor',
      'associate',
      'degree',
      'campus',
      'manoa',
      'hilo'
    ];

    // Workforce indicators
    const workforceIndicators = [
      'career',
      'job',
      'work',
      'salary',
      'employment',
      'occupation',
      'workforce'
    ];

    // Count matches
    let hsCount = 0;
    let collegeCount = 0;
    let workforceCount = 0;

    for (const indicator of hsIndicators) {
      if (combined.includes(indicator)) hsCount++;
    }

    for (const indicator of collegeIndicators) {
      if (combined.includes(indicator)) collegeCount++;
    }

    for (const indicator of workforceIndicators) {
      if (combined.includes(indicator)) workforceCount++;
    }

    // Determine focus area based on highest count
    const max = Math.max(hsCount, collegeCount, workforceCount);

    if (max === 0) return 'general';

    if (hsCount === max) return 'highschool';
    if (collegeCount === max) return 'college';
    if (workforceCount === max) return 'workforce';

    return 'general';
  }

  /**
   * Fallback analysis when Groq fails
   */
  private fallbackAnalysis(message: string, language: string): QueryAnalysis {
    const lowerMessage = message.toLowerCase();

    // Detect intent
    const isSearch =
      lowerMessage.includes('show me') ||
      lowerMessage.includes('search') ||
      lowerMessage.includes('find') ||
      lowerMessage.includes('programs for') ||
      lowerMessage.includes('programs in');

    // Extract basic keywords
    const keywords = this.tokenize(message);

    // Expand common abbreviations
    const searchTerms = expandSearchTerms(message);

    return {
      improvedQuery: message,
      searchTerms,
      keywords,
      intent: isSearch ? 'search' : 'profile_based',
      ignoreProfile: isSearch,
      expandedTerms: {},
      focusArea: this.detectFocusArea(message, message),
      language
    };
  }

  /**
   * Check if query is asking for specific programs
   */
  isSpecificProgramQuery(analysis: QueryAnalysis): boolean {
    return analysis.intent === 'search' && analysis.ignoreProfile;
  }

  /**
   * Check if query is profile-based
   */
  isProfileBasedQuery(analysis: QueryAnalysis): boolean {
    return analysis.intent === 'profile_based' || analysis.intent === 'mixed';
  }

  /**
   * Get all search keywords including expansions
   */
  getAllSearchKeywords(analysis: QueryAnalysis): string[] {
    const allKeywords = new Set<string>(analysis.keywords);

    // Add expanded terms
    for (const expansions of Object.values(analysis.expandedTerms)) {
      expansions.forEach(term => {
        const words = this.tokenize(term);
        words.forEach(word => allKeywords.add(word));
      });
    }

    return Array.from(allKeywords);
  }
}
