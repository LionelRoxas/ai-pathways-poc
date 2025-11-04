/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/lib/agents/conversational-agent.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface UserProfile {
  educationLevel: string | null;
  interests: string[];
  careerGoals: string[];
  location: string | null;
}

interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ConversationalResponse {
  markdown: string;
  plainText: string;
  hasProfile: boolean;
  queryType: string;
  // NEW: Enhanced context for next search
  extractedContext?: {
    interests?: string[];
    careerGoals?: string[];
    educationLevel?: string;
    location?: string;
    keywords?: string[];
    suggestedProfileUpdates?: {
      interests?: string[];
      careerGoals?: string[];
      educationLevel?: string;
      location?: string;
    };
  };
}

/**
 * Conversational Agent
 * Handles non-search queries with natural conversation and markdown formatting
 */
export class ConversationalAgent {
  /**
   * Generate a conversational response with markdown formatting
   * NOW WITH INTELLIGENCE EXTRACTION
   */
  async generateResponse(
    message: string,
    conversationHistory: ConversationMessage[] = [],
    profile?: UserProfile,
    queryType?: string
  ): Promise<ConversationalResponse> {
    const recentHistory = conversationHistory.slice(-6);

    // Debug: Log profile to see what we have
    console.log("[ConversationalAgent] Profile received:", JSON.stringify(profile, null, 2));

    // Build profile context for more personalized responses
    const profileInfo = this.buildProfileContext(profile);
    const hasProfile = profileInfo.hasProfile;
    const profileContext = profileInfo.context;

    const systemPrompt = this.buildSystemPrompt(queryType, profileContext, hasProfile);

    try {
      // STEP 1: Extract intelligence from user message
      const extractedContext = await this.extractIntelligence(message, profile, conversationHistory);
      console.log("[ConversationalAgent] 🧠 Extracted context:", extractedContext);

      // STEP 2: Generate conversational response
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...recentHistory,
          { role: "user", content: message },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
      });

      const rawResponse = response.choices[0].message.content || this.getFallbackResponse(queryType, hasProfile);
      
      // Format the response as markdown
      const markdown = this.formatAsMarkdown(rawResponse, queryType, profile);
      const plainText = this.stripMarkdown(markdown);

      return {
        markdown,
        plainText,
        hasProfile,
        queryType: queryType || 'general',
        extractedContext, // RETURN EXTRACTED INTELLIGENCE
      };
    } catch (error) {
      console.error("[ConversationalAgent] Error generating response:", error);
      
      const fallback = this.getFallbackResponse(queryType, hasProfile);
      return {
        markdown: this.formatAsMarkdown(fallback, queryType, profile),
        plainText: fallback,
        hasProfile,
        queryType: queryType || 'general',
      };
    }
  }

  /**
   * Build profile context from user profile data
   */
  private buildProfileContext(profile?: UserProfile): { hasProfile: boolean; context: string } {
    let profileContext = "";
    let hasProfile = false;

    if (profile) {
      const parts = [];
      
      if (profile.interests && profile.interests.length > 0) {
        parts.push(`Interests: ${profile.interests.join(", ")}`);
        hasProfile = true;
      }
      
      if (profile.careerGoals && profile.careerGoals.length > 0) {
        parts.push(`Career goals: ${profile.careerGoals.join(", ")}`);
        hasProfile = true;
      }
      
      if (profile.educationLevel) {
        parts.push(`Education level: ${profile.educationLevel.replace(/_/g, ' ')}`);
        hasProfile = true;
      }
      
      if (profile.location) {
        parts.push(`Location: ${profile.location}`);
        hasProfile = true;
      }

      if (parts.length > 0) {
        profileContext = `\n\nUser Profile Context:\n${parts.join("\n")}`;
      }
    }

    return { hasProfile, context: profileContext };
  }

  /**
   * INTELLIGENCE EXTRACTION
   * Extract structured information from user messages using LLM
   */
  private async extractIntelligence(
    message: string,
    profile?: UserProfile,
    conversationHistory: ConversationMessage[] = []
  ): Promise<{
    interests?: string[];
    careerGoals?: string[];
    educationLevel?: string;
    location?: string;
    keywords?: string[];
    suggestedProfileUpdates?: {
      interests?: string[];
      careerGoals?: string[];
      educationLevel?: string;
      location?: string;
    };
  }> {
    try {
      const extractionPrompt = `Extract structured information from this user message.

User message: "${message}"

${profile ? `Current profile:
- Interests: ${profile.interests?.join(", ") || "none"}
- Career goals: ${profile.careerGoals?.join(", ") || "none"}
- Education level: ${profile.educationLevel || "unknown"}
- Location: ${profile.location || "unknown"}` : "No existing profile."}

${conversationHistory.length > 0 ? `Recent conversation context:
${conversationHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n")}` : ""}

Extract:
1. NEW interests mentioned (not already in profile)
2. NEW career goals mentioned
3. Education level if mentioned (high_school, college, graduate)
4. Location preferences (Hawaii campuses: Honolulu, Kapiolani, Leeward, Windward, etc.)
5. Important keywords for search

Respond with JSON ONLY:
{
  "interests": ["array", "of", "interests"],
  "careerGoals": ["array", "of", "career", "goals"],
  "educationLevel": "high_school|college|graduate|null",
  "location": "campus name or null",
  "keywords": ["search", "keywords"],
  "suggestedProfileUpdates": {
    "interests": ["new interests to add"],
    "careerGoals": ["new goals to add"],
    "educationLevel": "level or null",
    "location": "location or null"
  }
}

If nothing to extract, return empty arrays. Be smart about synonyms (e.g., "coding" = "programming").`;

      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are an information extraction expert. Extract structured data from user messages. Respond with valid JSON only." },
          { role: "user", content: extractionPrompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1, // Low temperature for consistent extraction
        response_format: { type: "json_object" }, // Force JSON output
      });

      const extracted = JSON.parse(response.choices[0].message.content || "{}");
      
      // Clean up and normalize
      return {
        interests: this.normalizeArray(extracted.interests),
        careerGoals: this.normalizeArray(extracted.careerGoals),
        educationLevel: extracted.educationLevel || undefined,
        location: extracted.location || undefined,
        keywords: this.normalizeArray(extracted.keywords),
        suggestedProfileUpdates: {
          interests: this.normalizeArray(extracted.suggestedProfileUpdates?.interests),
          careerGoals: this.normalizeArray(extracted.suggestedProfileUpdates?.careerGoals),
          educationLevel: extracted.suggestedProfileUpdates?.educationLevel || undefined,
          location: extracted.suggestedProfileUpdates?.location || undefined,
        },
      };
    } catch (error) {
      console.error("[ConversationalAgent] Intelligence extraction failed:", error);
      // Fallback to simple keyword extraction
      return this.fallbackExtraction(message);
    }
  }

  /**
   * Fallback extraction using simple heuristics if LLM fails
   */
  private fallbackExtraction(message: string): {
    keywords?: string[];
  } {
    const keywords = message
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .slice(0, 5);

    return { keywords };
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "about", "what", "which", "where", "how",
      "is", "are", "was", "were", "been", "be", "have", "has", "had", "do",
      "does", "did", "will", "would", "could", "should", "may", "might",
      "want", "need", "like", "think", "know"
    ]);
    return stopWords.has(word);
  }

  /**
   * Normalize array - remove duplicates, empty strings, trim
   */
  private normalizeArray(arr: any): string[] | undefined {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    
    const normalized = arr
      .filter(item => item && typeof item === "string")
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);
    
    return normalized.length > 0 ? [...new Set(normalized)] : undefined;
  }

  /**
   * Build system prompt for the LLM
   */
  private buildSystemPrompt(queryType: string | undefined, profileContext: string, hasProfile: boolean): string {
    return `You are a conversational guide for Hawaii educational pathways. Your role is to have natural, brief conversations, GATHER INFORMATION, and prompt users to explore programs.${profileContext}

CORE PRINCIPLE:
This is CONVERSATIONAL and INTELLIGENCE-GATHERING. Keep it natural, brief, ask smart questions, and guide users to take action.

YOUR TWO MAIN JOBS:
1. **Gather Intelligence** - Ask questions to understand interests, goals, education level
2. **Guide Action** - Prompt users to explore programs once you have enough context

RESPONSE FORMAT:
- Use simple markdown: headers (##), **bold**, and bullet points (-)
- Keep responses SHORT (1-3 sentences typically)
- NO emojis
- When you need more info, ASK A SPECIFIC QUESTION
- When you have enough info, PROMPT ACTION

TONE & STYLE:
- Friendly and warm, like talking to a friend
- Confident but not overwhelming
- Action-oriented - prompt them to explore
- Curious - ask questions to gather context

SMART QUESTION STRATEGIES:

${!hasProfile ? `**When NO profile exists:**
- "What are you interested in?" (gather interests)
- "What career are you aiming for?" (gather goals)
- "Are you in high school or college?" (gather education level)
- "Which island are you on?" (gather location)` : `**When profile EXISTS but incomplete:**
- If no career goal: "What kind of career are you thinking about?"
- If vague interest: "What specific area of [interest] interests you most?"
- If no location: "Are you looking for programs on a specific island?"`}

RESPONSE EXAMPLES:

For greetings (NO PROFILE):
## Aloha!

What are you interested in studying?

For greetings (HAS PROFILE):
## Welcome back!

I see you're interested in **computer science**. Want me to search for programs?

For vague responses ("I'm not sure", "maybe", "I don't know"):
## Let me help narrow it down

What subjects do you enjoy most? Or what kind of work sounds exciting to you?

For specific interests:
## Great choice!

Let me search for **programming** programs in Hawaii.

KEY GUIDELINES:
- **ASK ONE QUESTION AT A TIME** - don't overwhelm
- **BE SPECIFIC** - "What area of technology?" not "Tell me more"
- **USE PROFILE DATA** - Reference what you already know
- When user provides NEW info, acknowledge it briefly then take action
- Guide toward searching: "Let me search for programs" or "Want me to find programs?"

INFORMATION GATHERING PRIORITY:
1. **Interests** (most important for search)
2. **Career goals** (helps refine results)
3. **Education level** (determines high school vs college programs)
4. **Location** (campus preferences)

WHEN TO SEARCH:
- User provides specific interest/goal → SEARCH
- User says "yes" after you ask if they want to search → SEARCH
- User asks direct question about programs → SEARCH
- You have enough context (at least interests) → PROMPT SEARCH

WHAT TO AVOID:
- Asking multiple questions at once
- Long explanations
- Repeating information
- Being overly formal
- Asking questions you already know the answer to (check profile!)

Remember: You're gathering intelligence to make the NEXT search better. Ask smart questions, then guide them to explore!`;
  }

  /**
   * Format response as markdown for better readability
   */
  private formatAsMarkdown(response: string, queryType: string | undefined, profile?: UserProfile): string {
    // The LLM now handles markdown formatting, so just return the response as-is
    // This ensures the AI's markdown structure is preserved
    return response;
  }

  /**
   * Format profile information as markdown (kept for backward compatibility but not used)
   */
  private formatProfileResponse(response: string, profile?: UserProfile): string {
    // This method is now handled by the LLM's system prompt
    return response;
  }

  /**
   * Strip markdown formatting to get plain text
   */
  private stripMarkdown(markdown: string): string {
    return markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/[-*+]\s+/g, '') // Remove list markers
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Get fallback response based on query type
   */
  private getFallbackResponse(queryType: string | undefined, hasProfile: boolean): string {
    switch (queryType) {
      case 'greeting':
        return `## Aloha!

I can help you explore educational pathways in Hawaii. What interests you?`;
      
      case 'clarification':
        if (hasProfile) {
          return `Yes, I'm confident about that based on your profile. Want me to search for programs?`;
        }
        return `Yes, I'm confident about that. Want me to search for programs?`;
      
      case 'reasoning':
        return `Happy to explain. What would you like to know more about?`;
      
      default:
        return `I'm here to help you explore educational pathways. What are you interested in?`;
    }
  }
}

export default ConversationalAgent;
