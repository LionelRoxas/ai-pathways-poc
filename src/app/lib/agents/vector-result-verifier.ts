/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/vector-result-verifier.ts
import OpenAI from "openai";

// Lazy initialization to support testing
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * VECTOR-BASED RESULT VERIFIER
 * 
 * Uses embedding similarity instead of LLM calls for 10-50x faster verification.
 * 
 * Speed comparison:
 * - LLM verification: 30-60 seconds for 30 programs (GPT-4 calls)
 * - Vector verification: 1-3 seconds for 30 programs (embedding similarity)
 * 
 * How it works:
 * 1. Generate embedding for user query + context
 * 2. Generate embeddings for each program (cached!)
 * 3. Calculate cosine similarity
 * 4. Filter by threshold (e.g., >0.4 = relevant)
 * 5. Rank by similarity score
 */

interface ConversationMessage {
  role: string;
  content: string;
}

interface UserProfile {
  profileSummary?: string;
  extracted?: {
    interests?: string[];
    careerGoals?: string[];
    location?: string;
  };
}

interface RankedProgram {
  program: any;
  schools?: string[];
  campuses?: string[];
  relevanceScore: number;
  reasoning?: string;
}

export class VectorResultVerifier {
  private embeddingCache: Map<string, number[]> = new Map();

  /**
   * Verify and rank high school programs using vector similarity
   * Signature matches ResultVerifier for drop-in replacement
   */
  async verifyHighSchoolPrograms(
    userQuery: string,
    programs: Array<{ program: any; schools?: string[] }>,
    conversationHistory?: ConversationMessage[],
    extractedIntent?: string,
    userProfile?: UserProfile
  ): Promise<RankedProgram[]> {
    const verificationQuery = extractedIntent || userQuery;
    const startTime = Date.now();
    console.log(
      `[VectorVerifier] 🚀 Fast-verifying ${programs.length} HS programs against query: "${userQuery}"`
    );

    try {
      // Build query context
      const queryContext = this.buildQueryContext(
        userQuery,
        verificationQuery,
        conversationHistory,
        userProfile
      );

      // Get query embedding (single API call!)
      const queryEmbedding = await this.getEmbedding(queryContext);

      // Calculate similarity for each program
      const scoredPrograms = await Promise.all(
        programs.map(async (item) => {
          const programText = this.extractProgramText(item.program, "high school");
          const programEmbedding = await this.getEmbedding(programText);
          const similarity = this.cosineSimilarity(queryEmbedding, programEmbedding);
          
          // Convert similarity (0-1) to score (0-10)
          const relevanceScore = Math.round(similarity * 10 * 10) / 10;

          return {
            program: item.program,
            schools: item.schools,
            relevanceScore,
            reasoning: `Vector similarity: ${similarity.toFixed(3)}`,
          };
        })
      );

      // Filter by threshold (context-aware)
      const threshold = this.determineThreshold(
        scoredPrograms.map(p => p.relevanceScore),
        verificationQuery
      );
      const effectiveThreshold = threshold; // Threshold is now context-aware
      
      const filtered = scoredPrograms
        .filter((p) => p.relevanceScore >= effectiveThreshold)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      const elapsed = Date.now() - startTime;
      const topScores = filtered.slice(0, 3).map(p => p.relevanceScore.toFixed(1));
      console.log(
        `[VectorVerifier] ✅ Verified ${programs.length} → ${filtered.length} HS programs in ${elapsed}ms (threshold: ${effectiveThreshold}/10, top scores: [${topScores}])`
      );

      return filtered;
    } catch (error) {
      console.error("[VectorVerifier] ❌ Error:", error);
      // Fallback: return all programs with neutral scores
      return programs.map((item) => ({
        program: item.program,
        schools: item.schools,
        relevanceScore: 5,
        reasoning: "Verification failed, using default score",
      }));
    }
  }

  /**
   * Verify and rank college programs using vector similarity
   * Signature matches ResultVerifier for drop-in replacement
   */
  async verifyCollegePrograms(
    userQuery: string,
    programs: Array<{ program: any; campuses?: string[] }>,
    conversationHistory?: ConversationMessage[],
    extractedIntent?: string,
    userProfile?: UserProfile
  ): Promise<RankedProgram[]> {
    const verificationQuery = extractedIntent || userQuery;
    const startTime = Date.now();
    console.log(
      `[VectorVerifier] 🚀 Fast-verifying ${programs.length} college programs`
    );
    console.log(`[VectorVerifier]    Raw query: "${userQuery}"`);
    console.log(`[VectorVerifier]    Verification query: "${verificationQuery}"`);

    try {
      // Build query context
      const queryContext = this.buildQueryContext(
        userQuery,
        verificationQuery,
        conversationHistory,
        userProfile
      );

      // Get query embedding (single API call!)
      const queryEmbedding = await this.getEmbedding(queryContext);

      // Calculate similarity for each program
      const scoredPrograms = await Promise.all(
        programs.map(async (item) => {
          const programText = this.extractProgramText(item.program, "college");
          const programEmbedding = await this.getEmbedding(programText);
          const similarity = this.cosineSimilarity(queryEmbedding, programEmbedding);
          
          // Convert similarity (0-1) to score (0-10)
          const relevanceScore = Math.round(similarity * 10 * 10) / 10;

          return {
            program: item.program,
            campuses: item.campuses,
            relevanceScore,
            reasoning: `Vector similarity: ${similarity.toFixed(3)}`,
          };
        })
      );

      // Filter by threshold (context-aware)
      const threshold = this.determineThreshold(
        scoredPrograms.map(p => p.relevanceScore),
        verificationQuery
      );
      const effectiveThreshold = threshold; // Threshold is now context-aware
      
      const filtered = scoredPrograms
        .filter((p) => p.relevanceScore >= effectiveThreshold)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      const elapsed = Date.now() - startTime;
      const topScores = filtered.slice(0, 3).map(p => p.relevanceScore.toFixed(1));
      
      // Determine threshold type for logging
      const words = verificationQuery.toLowerCase().split(/[\s,]+/);
      const uniqueWords = new Set(words.filter(w => w.length > 3));
      const isGeneric = uniqueWords.size <= 3;
      const thresholdType = effectiveThreshold >= 6.0 ? 'STRICT (strong matches)' : 
                           isGeneric ? 'LENIENT (generic query)' : 
                           'STANDARD (specific query)';
      
      // DEBUG: Show all scores for testing
      if (scoredPrograms.length <= 10) {
        console.log(`[VectorVerifier] 🔍 All scores:`);
        scoredPrograms.forEach(p => {
          const name = p.program?.PROGRAM_NAME || p.program?.title || 'Unknown';
          console.log(`   ${name.substring(0, 40)}: ${p.relevanceScore.toFixed(1)}/10`);
        });
      }
      
      console.log(
        `[VectorVerifier] ✅ Verified ${programs.length} → ${filtered.length} college programs in ${elapsed}ms (threshold: ${effectiveThreshold.toFixed(1)}/10 ${thresholdType}, top scores: [${topScores}])`
      );

      return filtered;
    } catch (error) {
      console.error("[VectorVerifier] ❌ Error:", error);
      // Fallback: return all programs with neutral scores
      return programs.map((item) => ({
        program: item.program,
        campuses: item.campuses,
        relevanceScore: 5,
        reasoning: "Verification failed, using default score",
      }));
    }
  }

  /**
   * Build query context from user input and conversation
   */
  private buildQueryContext(
    userQuery: string,
    verificationQuery: string,
    conversationHistory?: ConversationMessage[],
    userProfile?: UserProfile
  ): string {
    const parts: string[] = [];

    // Main query
    parts.push(`User is searching for: ${verificationQuery || userQuery}`);

    // Recent conversation context (last 3 user messages)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentContext = conversationHistory
        .filter((m) => m.role === "user")
        .slice(-3)
        .map((m) => m.content)
        .join(". ");
      if (recentContext) {
        parts.push(`Recent conversation: ${recentContext}`);
      }
    }

    // User profile context
    if (userProfile) {
      if (userProfile.extracted?.interests?.length) {
        parts.push(`User interests: ${userProfile.extracted.interests.join(", ")}`);
      }
      if (userProfile.extracted?.careerGoals?.length) {
        parts.push(`Career goals: ${userProfile.extracted.careerGoals.join(", ")}`);
      }
      if (userProfile.extracted?.location) {
        parts.push(`Location: ${userProfile.extracted.location}`);
      }
    }

    return parts.join("\n");
  }

  /**
   * Extract text representation of a program
   */
  private extractProgramText(program: any, type: "high school" | "college"): string {
    if (type === "high school") {
      const parts: string[] = [];
      if (program.PROGRAM_OF_STUDY) parts.push(program.PROGRAM_OF_STUDY);
      if (program.CTE_CLUSTER) parts.push(`Cluster: ${program.CTE_CLUSTER}`);
      if (program.CTE_PATHWAY) parts.push(`Pathway: ${program.CTE_PATHWAY}`);
      if (program.PROGRAM_LEARNING_OUTCOMES) {
        parts.push(`Outcomes: ${program.PROGRAM_LEARNING_OUTCOMES}`);
      }
      return parts.join(". ");
    } else {
      const parts: string[] = [];
      const programName = Array.isArray(program.PROGRAM_NAME)
        ? program.PROGRAM_NAME[0]
        : program.PROGRAM_NAME;
      if (programName) parts.push(programName);
      if (program.PROGRAM_DESC) parts.push(program.PROGRAM_DESC);
      if (program.CIP_CODE) parts.push(`CIP: ${program.CIP_CODE}`);
      if (program.DEGREE_LEVEL) parts.push(`Degree: ${program.DEGREE_LEVEL}`);
      return parts.join(". ");
    }
  }

  /**
   * Get embedding for text (with caching)
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = text.toLowerCase().trim();
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    const response = await getOpenAI().embeddings.create({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000), // Limit text length
    });

    const embedding = response.data[0].embedding;
    this.embeddingCache.set(cacheKey, embedding);
    
    return embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Determine filtering threshold based on score distribution and query context
   * Uses adaptive threshold with CIP verifier as quality control
   * 
   * STRATEGY: Lenient vector threshold (3.0) + Strict CIP verification
   * - Vector verifier casts a wide net (30% similarity minimum)
   * - CIP verifier filters out misaligned programs (e.g., Hawaiian Studies for CS)
   * - This two-stage approach maximizes recall while maintaining precision
   * 
   * CRITICAL BALANCE:
   * - Too high (4.5+): Filters out legitimate programs, especially with conversation history ❌
   * - Too low (<3.0): Returns completely irrelevant programs ❌
   * - Sweet spot (3.0-3.5): Wide net + CIP verification = good results ✅
   * 
   * Score distribution guidance:
   * - 7.0+ = Strong match (very relevant)
   * - 5.0-6.9 = Good match (relevant)
   * - 4.0-4.9 = Moderate match (possibly relevant, needs context)
   * - 3.0-3.9 = Weak match (borderline, relies on CIP verification)
   * - <3.0 = Very weak (likely irrelevant)
   */
  private determineThreshold(scores: number[], verificationQuery: string): number {
    if (scores.length === 0) return 0;

    const sortedScores = [...scores].sort((a, b) => b - a);
    const maxScore = sortedScores[0];
    const hasStrongMatches = maxScore >= 7.0;
    
    // Check if query is very generic (common with affirmative responses using conversation context)
    const words = verificationQuery.toLowerCase().split(/[\s,]+/);
    const uniqueWords = new Set(words.filter(w => w.length > 3)); // Filter out short words
    const isGenericQuery = uniqueWords.size <= 3; // 3 or fewer unique meaningful words

    if (hasStrongMatches) {
      // If we have strong matches (7+), filter aggressively
      return 6.0; // Only keep strong matches
    } else if (isGenericQuery) {
      // Generic queries (e.g., "nursing, healthcare, nursing") need lower threshold
      // because matches are based on broad context, not specific terms
      return 3.5; // More lenient for context-based matching
    } else {
      // Specific queries - use lenient threshold and rely on CIP verifier to catch misalignments
      // Note: 3.0 allows more results but CIP verifier will filter out irrelevant programs
      return 3.0; // Lenient filtering, CIP verifier provides quality control
    }
  }
}

export default VectorResultVerifier;
