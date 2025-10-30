/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/reflection-agent.ts

interface ReflectionResult {
  isGoodEnough: boolean;
  qualityScore: number;
  issues: string[];
  suggestions: string[];
  reasoning: string;
}

interface CollectedData {
  highSchoolPrograms: any[];
  collegePrograms: any[];
  careers: any[];
  cipMappings: any[];
  schools: string[] | Set<string>;
  campuses: string[] | Set<string>;
}

interface UserProfile {
  educationLevel: string | null;
  interests: string[];
  careerGoals: string[];
  location: string | null;
}

/**
 * Reflection Agent - Simplified and Optimized
 * Fast heuristic-based quality checks with smart keyword expansion
 * No LLM calls - pure logic for speed
 */
export class ReflectionAgent {
  private maxRetries: number = 2; // Maximum number of reruns allowed
  private minQualityScore: number = 6; // Minimum acceptable score

  /**
   * Fast heuristic-based reflection - NO LLM CALLS for speed
   */
  async reflect(
    userQuery: string,
    collectedData: CollectedData,
    userProfile?: UserProfile,
    conversationHistory?: any[],
    attemptNumber: number = 1
  ): Promise<ReflectionResult> {
    console.log(
      `[ReflectionAgent] 🔍 Attempt ${attemptNumber}: Fast evaluation for "${userQuery}"`
    );

    const stats = this.calculateStats(collectedData);
    
    // FAST HEURISTIC SCORING
    let qualityScore = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 1. Completeness (0-3 points)
    if (stats.hsCount > 0 && stats.collegeCount > 0 && stats.careerCount > 0) {
      qualityScore += 3; // Full pathway
    } else if (stats.hsCount > 0 && stats.collegeCount > 0) {
      qualityScore += 2; // HS + College
      suggestions.push("Add career pathways");
    } else if (stats.collegeCount > 0) {
      qualityScore += 1; // Just college
      suggestions.push("Include high school preparation programs");
    } else {
      issues.push("Missing educational pathway data");
    }

    // 2. Quantity (0-2 points)
    const totalPrograms = stats.hsCount + stats.collegeCount;
    if (totalPrograms >= 8) {
      qualityScore += 2;
    } else if (totalPrograms >= 3) {
      qualityScore += 1;
      suggestions.push("Expand search to find more programs");
    } else if (totalPrograms === 0) {
      issues.push("No programs found");
      suggestions.push("Try broader keywords or related fields");
    }

    // 3. Relevance (0-3 points) - Simple keyword matching
    const keywords = this.extractMainKeywords(userQuery);
    const profileKeywords = userProfile?.interests || [];
    const allKeywords = [...keywords, ...profileKeywords].map(k => k.toLowerCase());
    
    let relevanceCount = 0;
    // Check if program names contain query keywords
    for (const hsProgram of collectedData.highSchoolPrograms.slice(0, 5)) {
      const programName = (hsProgram.program?.PROGRAM_OF_STUDY || "").toLowerCase();
      if (allKeywords.some(kw => programName.includes(kw))) {
        relevanceCount++;
      }
    }
    for (const collegeProgram of collectedData.collegePrograms.slice(0, 5)) {
      const programName = (Array.isArray(collegeProgram.program?.PROGRAM_NAME) 
        ? collegeProgram.program.PROGRAM_NAME[0] 
        : collegeProgram.program?.PROGRAM_NAME || "").toLowerCase();
      if (allKeywords.some(kw => programName.includes(kw))) {
        relevanceCount++;
      }
    }
    
    if (relevanceCount >= 5) {
      qualityScore += 3;
    } else if (relevanceCount >= 3) {
      qualityScore += 2;
    } else if (relevanceCount >= 1) {
      qualityScore += 1;
      suggestions.push("Search more specifically for related programs");
    } else {
      issues.push("Results may not match your interests");
      suggestions.push("Try different keywords or broader categories");
    }

    // 4. Profile Alignment (0-2 points)
    if (userProfile?.interests && userProfile.interests.length > 0) {
      const alignmentScore = this.checkProfileAlignment(collectedData, userProfile);
      qualityScore += alignmentScore;
      if (alignmentScore < 2) {
        suggestions.push("Include profile interests in search");
      }
    }

    const isGoodEnough = qualityScore >= this.minQualityScore || attemptNumber > this.maxRetries;

    console.log(
      `[ReflectionAgent] ${isGoodEnough ? "✅" : "❌"} Score: ${qualityScore}/10 | Programs: ${totalPrograms} | Attempts: ${attemptNumber}/${this.maxRetries + 1}`
    );

    if (!isGoodEnough) {
      console.log(`[ReflectionAgent] 💡 Will retry with: ${suggestions.slice(0, 2).join(", ")}`);
    }

    return {
      isGoodEnough,
      qualityScore,
      issues,
      suggestions,
      reasoning: `Fast heuristic: ${totalPrograms} programs, ${qualityScore}/10 quality`,
    };
  }

  /**
   * Check profile alignment with results
   */
  private checkProfileAlignment(collectedData: CollectedData, userProfile: UserProfile): number {
    const interests = (userProfile.interests || []).map(i => i.toLowerCase());
    if (interests.length === 0) return 0;

    let matches = 0;
    const allPrograms = [
      ...collectedData.highSchoolPrograms.slice(0, 5),
      ...collectedData.collegePrograms.slice(0, 5)
    ];

    for (const program of allPrograms) {
      const programName = (
        program.program?.PROGRAM_OF_STUDY || 
        (Array.isArray(program.program?.PROGRAM_NAME) ? program.program.PROGRAM_NAME[0] : program.program?.PROGRAM_NAME) || 
        ""
      ).toLowerCase();
      
      if (interests.some(interest => programName.includes(interest))) {
        matches++;
      }
    }

    return matches >= 3 ? 2 : matches >= 1 ? 1 : 0;
  }

  /**
   * Calculate statistics about the collected data
   */
  private calculateStats(collectedData: CollectedData) {
    const hsCount = collectedData.highSchoolPrograms?.length || 0;
    const collegeCount = collectedData.collegePrograms?.length || 0;
    const careerCount = collectedData.careers?.length || 0;
    const schoolCount = Array.isArray(collectedData.schools)
      ? collectedData.schools.length
      : collectedData.schools?.size || 0;
    const campusCount = Array.isArray(collectedData.campuses)
      ? collectedData.campuses.length
      : collectedData.campuses?.size || 0;

    const hsPrograms = collectedData.highSchoolPrograms?.map((item: any) => {
      const name = item.program?.PROGRAM_OF_STUDY || item.name || "Unknown";
      return `- ${name}`;
    }) || [];

    const collegePrograms = collectedData.collegePrograms?.map((item: any) => {
      const name = Array.isArray(item.program?.PROGRAM_NAME)
        ? item.program.PROGRAM_NAME[0]
        : item.program?.PROGRAM_NAME || item.name || "Unknown";
      return `- ${name}`;
    }) || [];

    const careers = collectedData.careers?.map((item: any) => {
      const title = item.SOC_TITLE || item.title || "Unknown Career";
      return `- ${title}`;
    }) || [];

    return {
      hsCount,
      collegeCount,
      careerCount,
      schoolCount,
      campusCount,
      hsPrograms,
      collegePrograms,
      careers,
      totalResults: hsCount + collegeCount + careerCount,
    };
  }

  /**
   * SMART KEYWORD EXPANSION - Progressive enhancement based on attempt number
   */
  generateRerunContext(
    originalQuery: string,
    reflection: ReflectionResult,
    userProfile?: UserProfile,
    attemptNumber: number = 1
  ): {
    enhancedQuery: string;
    searchStrategy: {
      expandKeywords: boolean;
      useCIPSearch: boolean;
      broadenScope: boolean;
      includeRelatedFields: boolean;
      additionalKeywords: string[];
    };
  } {
    const baseKeywords = this.extractMainKeywords(originalQuery);
    const profileKeywords = userProfile?.interests || [];
    
    const strategy = {
      expandKeywords: attemptNumber >= 2,
      useCIPSearch: attemptNumber === 3,
      broadenScope: attemptNumber === 3,
      includeRelatedFields: attemptNumber >= 2,
      additionalKeywords: [] as string[],
    };

    if (attemptNumber === 2) {
      // Attempt 2: Add related terms + profile interests
      const relatedTerms = this.getRelatedTerms(baseKeywords);
      strategy.additionalKeywords = [
        ...relatedTerms.slice(0, 3),
        ...profileKeywords.slice(0, 2)
      ];
      
      return {
        enhancedQuery: `${baseKeywords.join(" ")} ${strategy.additionalKeywords.join(" ")}`,
        searchStrategy: strategy
      };
    } 
    
    if (attemptNumber === 3) {
      // Attempt 3: Go broad with categories
      const categories = this.getSimpleCategories(baseKeywords, profileKeywords);
      strategy.additionalKeywords = categories;
      
      return {
        enhancedQuery: categories.join(" "),
        searchStrategy: strategy
      };
    }

    // Attempt 1: Use original query
    return {
      enhancedQuery: originalQuery,
      searchStrategy: strategy
    };
  }

  /**
   * Get related terms for a keyword (simplified mapping)
   */
  private getRelatedTerms(keywords: string[]): string[] {
    const relatedMap: Record<string, string[]> = {
      // Technology & Computers
      computer: ["technology", "IT", "programming", "software"],
      technology: ["computer", "IT", "digital", "tech"],
      programming: ["coding", "software", "computer science"],
      cyber: ["security", "networking", "information technology"],
      
      // Arts & Creative
      arts: ["creative", "design", "visual", "performing"],
      music: ["audio", "performance", "arts"],
      dance: ["performance", "arts", "theatre"],
      design: ["creative", "art", "graphic", "visual"],
      
      // Health & Medical
      health: ["medical", "nursing", "healthcare"],
      medical: ["health", "nursing", "healthcare"],
      nursing: ["health", "medical", "healthcare"],
      
      // Business
      business: ["management", "finance", "entrepreneurship"],
      management: ["business", "leadership", "administration"],
      
      // Engineering & Trades
      engineering: ["technical", "mechanical", "electrical"],
      construction: ["building", "trades", "carpentry"],
      automotive: ["mechanic", "repair", "transportation"],
      
      // Education & Social
      education: ["teaching", "learning", "school"],
      teaching: ["education", "instruction", "learning"],
      
      // Culinary & Hospitality
      culinary: ["cooking", "food", "chef", "hospitality"],
      cooking: ["culinary", "food service", "chef"],
      hospitality: ["tourism", "hotel", "culinary"],
    };

    const related = new Set<string>();
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      if (relatedMap[kw]) {
        relatedMap[kw].forEach(term => related.add(term));
      }
    }

    return Array.from(related);
  }

  /**
   * Get broad category keywords (simplified from 27 to 10 core categories)
   */
  private getSimpleCategories(keywords: string[], profileKeywords: string[]): string[] {
    const allKeywords = [...keywords, ...profileKeywords].map(k => k.toLowerCase());
    const categories = new Set<string>();

    // Simplified category map - only 10 major categories
    const categoryMap: Record<string, string[]> = {
      technology: ["computer", "tech", "IT", "software", "programming", "cyber", "network", "data"],
      arts: ["art", "music", "dance", "theatre", "theater", "creative", "design", "visual", "media", "film"],
      health: ["health", "medical", "nursing", "dental", "pharmacy", "therapy"],
      business: ["business", "management", "marketing", "finance", "accounting", "entrepreneurship"],
      engineering: ["engineering", "mechanical", "electrical", "civil", "construction"],
      education: ["education", "teaching", "learning", "school"],
      culinary: ["culinary", "cooking", "food", "chef", "hospitality", "restaurant"],
      science: ["science", "biology", "chemistry", "physics", "environmental"],
      trades: ["automotive", "welding", "carpentry", "plumbing", "HVAC"],
      social: ["psychology", "sociology", "social work", "counseling"],
    };

    // Find matching categories
    for (const [category, terms] of Object.entries(categoryMap)) {
      if (allKeywords.some(kw => terms.some(term => kw.includes(term) || term.includes(kw)))) {
        // Add category name + first 3 related terms
        categories.add(category);
        terms.slice(0, 3).forEach(term => categories.add(term));
      }
    }

    // Fallback to original keywords if no categories found
    if (categories.size === 0) {
      keywords.forEach(kw => categories.add(kw));
    }

    return Array.from(categories).slice(0, 6); // Max 6 keywords for attempt 3
  }

  /**
   * Extract main keywords from query (ignore filler words)
   */
  private extractMainKeywords(query: string): string[] {
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "about", "what", "which", "where", "how",
      "is", "are", "was", "were", "been", "be", "have", "has", "had", "do",
      "does", "did", "will", "would", "could", "should", "may", "might",
      "i", "me", "my", "we", "you", "it", "that", "this", "these", "those",
      "not", "no", "yes", "can", "cant", "always", "never", "thought",
      "amazing", "sure", "look", "like", "enough", "still", "exploring",
      "options", "want", "need", "show", "tell", "find"
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 3);
  }

  /**
   * Check if we should attempt a rerun
   */
  shouldRerun(attemptNumber: number): boolean {
    return attemptNumber <= this.maxRetries;
  }
}

export default ReflectionAgent;
