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
}

/**
 * Conversational Agent
 * Handles non-search queries with natural conversation and markdown formatting
 */
export class ConversationalAgent {
  /**
   * Generate a conversational response with markdown formatting
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
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...recentHistory,
          { role: "user", content: message },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        max_tokens: 500,
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
   * Build system prompt for the LLM
   */
  private buildSystemPrompt(queryType: string | undefined, profileContext: string, hasProfile: boolean): string {
    return `You are a conversational guide for Hawaii educational pathways. Your role is to have natural, brief conversations and prompt users to explore programs.${profileContext}

CORE PRINCIPLE:
This is CONVERSATIONAL, not informational. Keep it natural, brief, and focused on guiding users to take action.

RESPONSE FORMAT:
- Use simple markdown: headers (##), **bold**, and bullet points (-)
- Keep responses SHORT (1-3 sentences typically)
- NO emojis
- NO detailed explanations unless asked
- ALWAYS guide users toward exploring programs
- ALWAYS use headers for key sections

TONE & STYLE:
- Friendly and warm, like talking to a friend
- Confident but not overwhelming
- Action-oriented - prompt them to explore
- Keep it conversational, not informational

RESPONSE EXAMPLES:

For greetings:
## Aloha!

I can help you explore educational pathways in Hawaii. What interests you?

For profile questions:
## Your Profile

${hasProfile ? `I see you're interested in **computer science** and aiming for a **software engineering** career. Want me to search for programs that match?` : `I don't have your profile yet. Want to tell me about your interests so I can help you find relevant programs?`}

For clarifications ("are you sure", "why", etc.):
Yes, I'm confident about that. Want me to search for programs?

For follow-ups when user shows interest:
Great! Let me search for programs that match your interests.

KEY GUIDELINES:
- Keep responses brief and conversational
- When prompting users to take action, use phrases like:
  * "Want me to search for programs?"
  * "Let me search for programs"
  * "Would you like me to search for programs?"
  * "Want to explore these programs?"
- Reference their profile naturally if available
${hasProfile ? `- The user is interested in: ${profileContext.replace(/User Profile Context:\n/g, '')}` : ``}
- Don't explain how the system works unless asked
- Focus on next steps, not background information
- Use questions to keep the conversation flowing

WHAT TO AVOID:
- Long explanations
- Detailed system descriptions
- Lists of features or capabilities
- Repeating information unnecessarily
- Being overly formal
- Giving program details (let the search do that)

Remember: Your job is to have a natural conversation and guide them to explore programs. Keep it simple!`;
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
