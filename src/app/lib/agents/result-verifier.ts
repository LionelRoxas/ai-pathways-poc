/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/result-verifier.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface VerificationResult {
  isRelevant: boolean;
  relevanceScore: number;
  reasoning: string;
}

interface RankedProgram {
  program: any;
  schools?: string[];
  campuses?: string[];
  relevanceScore: number;
  reasoning: string;
}

interface ConversationMessage {
  role: string;
  content: string;
}

interface UserProfile {
  interests?: string[];
  goals?: string[];
  gradeLevel?: string;
  location?: string;
  [key: string]: any;
}

/**
 * Result Verification Agent
 * Uses LLM to verify that search results actually match the user's query
 * with full conversation context awareness and user profile
 */
export class ResultVerifier {
  /**
   * Verify and rank high school programs against user query with conversation context and profile
   */
  async verifyHighSchoolPrograms(
    userQuery: string,
    programs: Array<{ program: any; schools: string[] }>,
    conversationHistory?: ConversationMessage[],
    extractedIntent?: string,
    userProfile?: UserProfile
  ): Promise<Array<RankedProgram>> {
    if (programs.length === 0) return [];

    const verificationQuery = extractedIntent || userQuery;
    console.log(
      `[ResultVerifier] Verifying ${programs.length} HS programs against query: "${userQuery}"${extractedIntent ? ` (intent: "${extractedIntent}")` : ""}${userProfile ? " with profile context" : ""}`
    );

    const verifiedPrograms: RankedProgram[] = [];

    // Process in batches of 5 to avoid overwhelming the LLM
    const batchSize = 5;
    for (let i = 0; i < Math.min(programs.length, 20); i += batchSize) {
      const batch = programs.slice(i, i + batchSize);
      const batchResults = await this.verifyProgramBatch(
        userQuery,
        verificationQuery,
        batch,
        "high school",
        conversationHistory,
        userProfile
      );
      verifiedPrograms.push(...batchResults);
    }

    // SMART FILTERING: If we have high-scoring programs (8+), use stricter threshold
    const hasStrongMatches = verifiedPrograms.some(p => p.relevanceScore >= 8);
    const threshold = hasStrongMatches ? 7 : 5;
    
    const filtered = verifiedPrograms
      .filter(p => p.relevanceScore >= threshold)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(
      `[ResultVerifier] Filtered ${programs.length} -> ${filtered.length} HS programs (threshold: ${threshold}/10, strong matches: ${hasStrongMatches})`
    );

    return filtered;
  }

  /**
   * Verify and rank college programs against user query with conversation context and profile
   */
  async verifyCollegePrograms(
    userQuery: string,
    programs: Array<{ program: any; campuses: string[] }>,
    conversationHistory?: ConversationMessage[],
    extractedIntent?: string,
    userProfile?: UserProfile
  ): Promise<Array<RankedProgram>> {
    if (programs.length === 0) return [];

    const verificationQuery = extractedIntent || userQuery;
    console.log(
      `[ResultVerifier] Verifying ${programs.length} college programs against query: "${userQuery}"${extractedIntent ? ` (intent: "${extractedIntent}")` : ""}${userProfile ? " with profile context" : ""}`
    );

    const verifiedPrograms: RankedProgram[] = [];

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < Math.min(programs.length, 30); i += batchSize) {
      const batch = programs.slice(i, i + batchSize);
      const batchResults = await this.verifyProgramBatch(
        userQuery,
        verificationQuery,
        batch,
        "college",
        conversationHistory,
        userProfile
      );
      verifiedPrograms.push(...batchResults);
    }

    // SMART FILTERING: If we have high-scoring programs (8+), use stricter threshold
    // This prevents "Information Systems" from showing when user asks for "Computer Science"
    const hasStrongMatches = verifiedPrograms.some(p => p.relevanceScore >= 8);
    const threshold = hasStrongMatches ? 7 : 5; // Stricter when we have clear winners
    
    const filtered = verifiedPrograms
      .filter(p => p.relevanceScore >= threshold)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(
      `[ResultVerifier] Filtered ${programs.length} -> ${filtered.length} college programs (threshold: ${threshold}/10, strong matches: ${hasStrongMatches})`
    );

    return filtered;
  }

  /**
   * Verify a batch of programs using LLM with conversation context and user profile
   */
  private async verifyProgramBatch(
    userQuery: string,
    verificationQuery: string,
    programs: Array<{ program: any; schools?: string[]; campuses?: string[] }>,
    programType: "high school" | "college",
    conversationHistory?: ConversationMessage[],
    userProfile?: UserProfile
  ): Promise<Array<RankedProgram>> {
    const programList = programs
      .map((item, idx) => {
        const name =
          programType === "high school"
            ? item.program.PROGRAM_OF_STUDY
            : Array.isArray(item.program.PROGRAM_NAME)
              ? item.program.PROGRAM_NAME[0]
              : item.program.PROGRAM_NAME;
        return `${idx + 1}. ${name}`;
      })
      .join("\n");

    const conversationContext =
      this.formatConversationHistory(conversationHistory);
    const profileContext = this.formatUserProfile(userProfile);

    const systemPrompt = `You are a relevance verification expert for educational programs. Your job is to determine how relevant each program is to the user's actual search intent based on the FULL conversation context and their personal profile.

CRITICAL INSTRUCTIONS:
1. READ THE CONVERSATION HISTORY CAREFULLY - the user may be referring to previous topics discussed
2. USE THE USER PROFILE - consider their interests, goals, and preferences when scoring relevance
3. If the extracted intent seems wrong, vague, or doesn't make sense (like "ask", "more", "show", "that"), ALWAYS look at the conversation history to understand what the user actually wants
4. Conversational queries like "what did I ask?", "show me more", "is there X at Y?" usually refer to the most recent relevant topic in the conversation history
5. Rate programs based on what the user is REALLY asking for, considering the full context AND their profile

EDUCATIONAL PATHWAY LOGIC:
This is an educational pathway advisor system. When users ask about programs, they typically want to see the COMPLETE PATHWAY, not just one educational level.

Important principles:
- "What high schools offer engineering?" → User wants BOTH high school AND college engineering programs (the pathway)
- "Show me computer science pathways" → User wants programs at ALL levels (high school + college)
- "Where can I study nursing?" → User wants the full pathway from high school to college
- Only filter programs that are in a DIFFERENT subject area, NOT programs at a different educational level

PROFILE-BASED SCORING BOOST:
- If a program aligns with the user's stated interests → +1 to score
- If a program aligns with the user's stated goals → +1 to score
- Maximum base score is still 10, but profile alignment can help borderline programs

Scoring guidelines:
- Same subject, same level as query → Score 9-10 (e.g., HS engineering when asking about HS engineering)
- Same subject, different level → Score 7-8 (e.g., college engineering when asking about HS engineering)
- Related subject, any level → Score 6-7 (e.g., computer engineering when asking about computer science)
- Tangentially related → Score 4-5 (e.g., mathematics when asking about engineering)
- Unrelated subject → Score 0-3 (e.g., culinary arts when asking about engineering)

Examples of using conversation context:
- Conversation History shows: "User: Show me computer science pathways"
  Current query: "what did I ask?" → Extracted intent: "ask" 
  → CORRECT ACTION: The user wants to recall their previous query. Rate programs against "computer science" from the conversation history, NOT "ask"
  
- Conversation History shows: "Assistant: Here are engineering programs... User: show me more"
  Current query: "show me more" → Extracted intent: "more"
  → CORRECT ACTION: The user wants more results from the previous topic. Rate programs against "engineering" from history, NOT "more"

- Conversation History shows: "User: cybersecurity programs"
  Current query: "is there cyber at manoa?" → Extracted intent: "cybersecurity manoa"
  → CORRECT ACTION: The intent makes sense. Rate programs against "cybersecurity" with location filter

- Conversation History shows: "User: Show me nursing programs"
  Current query: "what about UH Hilo?" → Extracted intent: "UH Hilo"
  → CORRECT ACTION: User is asking about location for the previous topic. Rate programs against "nursing" from history

META-QUERY DETECTION:
If the current query is clearly a meta-question about the conversation itself (not about educational programs), look at the MOST RECENT substantive educational query in the history and use that as your reference point.

SCORING SCALE:
- 10: Perfect match - exact subject, exact level, aligns with profile
- 9: Excellent match - exact subject, related level, may align with profile
- 8: Strong match - exact subject, any level OR very related subject, same level
- 7: Good match - related subject, any level
- 6: Moderate match - tangentially related subject
- 5: Weak match - loosely connected
- 0-4: Not relevant - different subject area

Return ONLY valid JSON array with this exact structure:
[
  {"index": 1, "score": 8, "reasoning": "brief reason"},
  {"index": 2, "score": 3, "reasoning": "brief reason"}
]`;

    const queryContext =
      userQuery === verificationQuery
        ? `Current User Query: "${userQuery}"`
        : `Current User Query: "${userQuery}"\nExtracted Search Intent: "${verificationQuery}"`;

    const userPrompt = `${conversationContext}

${profileContext}

${queryContext}

${programType === "high school" ? "High School" : "College"} Programs to verify:
${programList}

IMPORTANT: 
1. If the extracted intent is vague or doesn't make sense, refer to the conversation history to understand the user's actual search intent.
2. Consider the user's profile when scoring - programs that align with their interests/goals should score higher.
3. Rate each program's relevance (0-10) based on the true search intent and profile fit. Return JSON array only.`;

    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
      });

      const content = response.choices[0].message.content || "[]";
      
      // Debug: Log the raw response for troubleshooting
      if (process.env.DEBUG_VERIFIER) {
        console.log("[ResultVerifier] Raw LLM response:", content);
      }

      // Extract JSON from response with better parsing
      let scores;
      try {
        // First, try to find JSON array with non-greedy matching
        const jsonMatch = content.match(/\[[\s\S]*?\](?=\s*$|\s*[^,\]\}])/);
        if (!jsonMatch) {
          console.warn("[ResultVerifier] No JSON found in response");
          return this.fallbackRanking(programs);
        }

        // Clean the matched JSON (remove any trailing text)
        let jsonStr = jsonMatch[0];
        
        // If there's a closing bracket, find the actual end of the array
        const arrayDepth = (jsonStr.match(/\[/g) || []).length;
        const closingBrackets = (jsonStr.match(/\]/g) || []).length;
        
        if (arrayDepth !== closingBrackets) {
          // Find the proper closing bracket
          const firstOpen = jsonStr.indexOf('[');
          let depth = 0;
          let properEnd = -1;
          
          for (let i = firstOpen; i < jsonStr.length; i++) {
            if (jsonStr[i] === '[') depth++;
            if (jsonStr[i] === ']') {
              depth--;
              if (depth === 0) {
                properEnd = i + 1;
                break;
              }
            }
          }
          
          if (properEnd > 0) {
            jsonStr = jsonStr.substring(0, properEnd);
          }
        }

        scores = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("[ResultVerifier] JSON parse error:", parseError);
        console.error("[ResultVerifier] Attempted to parse:", content.substring(0, 500));
        return this.fallbackRanking(programs);
      }

      // Map scores back to programs
      const rankedPrograms: RankedProgram[] = [];
      for (const scoreData of scores) {
        const idx = scoreData.index - 1;
        if (idx >= 0 && idx < programs.length) {
          rankedPrograms.push({
            program: programs[idx].program,
            schools: programs[idx].schools,
            campuses: programs[idx].campuses,
            relevanceScore: scoreData.score,
            reasoning: scoreData.reasoning || "No reasoning provided",
          });
        }
      }

      return rankedPrograms;
    } catch (error) {
      console.error("[ResultVerifier] Error verifying batch:", error);
      return this.fallbackRanking(programs);
    }
  }

  /**
   * Format user profile for context
   */
  private formatUserProfile(userProfile?: UserProfile): string {
    if (!userProfile || Object.keys(userProfile).length === 0) {
      return "User Profile: (No profile information available)";
    }

    const parts = ["User Profile:"];

    if (userProfile.interests && userProfile.interests.length > 0) {
      parts.push(`- Interests: ${userProfile.interests.join(", ")}`);
    }

    if (userProfile.goals && userProfile.goals.length > 0) {
      parts.push(`- Goals: ${userProfile.goals.join(", ")}`);
    }

    if (userProfile.gradeLevel) {
      parts.push(`- Grade Level: ${userProfile.gradeLevel}`);
    }

    if (userProfile.location) {
      parts.push(`- Location: ${userProfile.location}`);
    }

    // Add any other profile fields
    const standardFields = ["interests", "goals", "gradeLevel", "location"];
    const otherFields = Object.keys(userProfile).filter(
      key => !standardFields.includes(key)
    );

    for (const field of otherFields) {
      const value = userProfile[field];
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        parts.push(
          `- ${field}: ${Array.isArray(value) ? value.join(", ") : value}`
        );
      }
    }

    return parts.join("\n");
  }

  /**
   * Format conversation history for context - enhanced to highlight most recent topic
   */
  private formatConversationHistory(
    conversationHistory?: ConversationMessage[]
  ): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return "Conversation History: (No previous messages)";
    }

    // Take last 6 messages for context (to avoid token limits but ensure we capture enough context)
    const recentHistory = conversationHistory.slice(-6);
    const formatted = recentHistory
      .map(
        msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    // Extract the most recent user query about educational topics (not meta-queries)
    const recentUserQueries = recentHistory
      .filter(msg => msg.role === "user")
      .reverse();

    let mostRecentTopic = "";
    for (const query of recentUserQueries) {
      const content = query.content.toLowerCase();
      // Skip meta-queries
      if (
        !content.includes("what did") &&
        !content.includes("show me more") &&
        !content.includes("tell me") &&
        content.length > 10
      ) {
        mostRecentTopic = query.content;
        break;
      }
    }

    return `Conversation History (Most Recent First):
${formatted}

${mostRecentTopic ? `Most Recent Educational Topic: "${mostRecentTopic}"` : ""}
`;
  }

  /**
   * Fallback ranking when LLM fails - keep all programs with neutral score
   */
  private fallbackRanking(
    programs: Array<{ program: any; schools?: string[]; campuses?: string[] }>
  ): Array<RankedProgram> {
    return programs.map(item => ({
      program: item.program,
      schools: item.schools,
      campuses: item.campuses,
      relevanceScore: 7, // Neutral score to keep them in results
      reasoning: "Fallback ranking",
    }));
  }

  /**
   * Quick verification for small result sets with conversation context and profile
   */
  async quickVerify(
    userQuery: string,
    programName: string,
    programType: "high school" | "college",
    conversationHistory?: ConversationMessage[],
    extractedIntent?: string,
    userProfile?: UserProfile
  ): Promise<VerificationResult> {
    const conversationContext =
      this.formatConversationHistory(conversationHistory);
    const profileContext = this.formatUserProfile(userProfile);
    const verificationQuery = extractedIntent || userQuery;

    const systemPrompt = `You are verifying if a program matches a user's search intent for an educational pathway advisor system. 

KEY PRINCIPLE: Users typically want to see COMPLETE PATHWAYS, not just one educational level. If someone asks about "high school engineering", they likely also want to see college engineering programs as part of the pathway.

PROFILE AWARENESS: Consider the user's stated interests and goals when scoring relevance. Programs that align with their profile should score higher.

Scoring:
- Same subject, same level → Score 9-10
- Same subject, different level → Score 7-8 (still relevant - it's the pathway!)
- Related subject → Score 6-7
- Unrelated subject → Score 0-4
- Profile alignment can boost scores by +1

Consider the FULL conversation history and user profile - if the current query is vague or a meta-question, refer to previous messages to understand the actual intent. Respond ONLY with valid JSON.`;

    const queryContext =
      userQuery === verificationQuery
        ? `Current User Query: "${userQuery}"`
        : `Current User Query: "${userQuery}"\nExtracted Search Intent: "${verificationQuery}"`;

    const userPrompt = `${conversationContext}

${profileContext}

${queryContext}
Program: "${programName}"
Program Type: ${programType}

IMPORTANT: 
1. If the extracted intent is vague (like "ask", "more", "show"), look at the conversation history to determine the actual topic.
2. Consider the user's profile - does this program align with their interests or goals?
3. Remember this is a pathway advisor - programs at different educational levels but same subject are still relevant (score 7-8).
4. Only mark as irrelevant if it's a completely different subject area.

Is this program relevant to the user's true search intent and profile? Respond with JSON:
{"isRelevant": true/false, "score": 0-10, "reasoning": "brief reason"}`;

    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
      });

      const content = response.choices[0].message.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          isRelevant: result.isRelevant ?? true,
          relevanceScore: result.score ?? 5,
          reasoning: result.reasoning ?? "No reasoning",
        };
      }
    } catch (error) {
      console.error("[ResultVerifier] Quick verify error:", error);
    }

    return {
      isRelevant: true,
      relevanceScore: 5,
      reasoning: "Fallback verification",
    };
  }
}

export default ResultVerifier;
