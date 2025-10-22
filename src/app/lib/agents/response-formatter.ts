/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/response-formatter.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ConversationMessage {
  role: string;
  content: string;
}

interface VerifiedData {
  highSchoolPrograms: any[];
  collegePrograms: any[];
  careers: any[];
  cipMappings?: any[];
  schools?: Set<string> | string[];
  campuses?: Set<string> | string[];
}

interface FormattedResponse {
  markdown: string;
  summary: {
    totalHighSchoolPrograms: number;
    totalHighSchools: number;
    totalCollegePrograms: number;
    totalCollegeCampuses: number;
    totalCareerPaths: number;
  };
}

/**
 * Response Formatter Agent
 *
 * Specialized agent for creating context-aware, markdown-formatted responses
 * that are clear, concise, and UX-friendly for the frontend.
 */
export class ResponseFormatterAgent {
  /**
   * Format the complete response with full context awareness
   */
  async formatResponse(
    userQuery: string,
    verifiedData: VerifiedData,
    conversationHistory: ConversationMessage[] = [],
    userProfile?: any
  ): Promise<FormattedResponse> {
    // Prepare data summary
    const summary = this.calculateSummary(verifiedData);

    // If no results, return a helpful message
    if (
      summary.totalHighSchoolPrograms === 0 &&
      summary.totalCollegePrograms === 0
    ) {
      return {
        markdown: await this.generateNoResultsResponse(
          userQuery,
          conversationHistory,
          userProfile
        ),
        summary,
      };
    }

    // Generate context-aware markdown response
    const markdown = await this.generateMarkdownResponse(
      userQuery,
      verifiedData,
      conversationHistory,
      summary,
      userProfile
    );

    return {
      markdown,
      summary,
    };
  }

  /**
   * Calculate summary statistics from verified data
   */
  private calculateSummary(data: VerifiedData): FormattedResponse["summary"] {
    const schools = Array.isArray(data.schools)
      ? data.schools
      : data.schools
        ? Array.from(data.schools)
        : [];

    const campuses = Array.isArray(data.campuses)
      ? data.campuses
      : data.campuses
        ? Array.from(data.campuses)
        : [];

    return {
      totalHighSchoolPrograms: data.highSchoolPrograms.length,
      totalHighSchools: schools.length,
      totalCollegePrograms: data.collegePrograms.length,
      totalCollegeCampuses: campuses.length,
      totalCareerPaths: data.careers.length,
    };
  }

  /**
   * Generate markdown-formatted response with LLM
   */
  private async generateMarkdownResponse(
    userQuery: string,
    verifiedData: VerifiedData,
    conversationHistory: ConversationMessage[],
    summary: FormattedResponse["summary"],
    userProfile?: any
  ): Promise<string> {
    const conversationContext =
      this.formatConversationContext(conversationHistory);
    const dataContext = this.formatDataContext(verifiedData, summary);

    const systemPrompt = `You are a UX-focused educational pathway advisor for Hawaii students. Your responses MUST be formatted in clean, scannable markdown.

CRITICAL FORMATTING RULES:
1. Use **bold headers** for main sections
2. Use bullet points (- or •) for lists - NEVER use numbered lists unless it's a step-by-step process
3. Keep paragraphs SHORT (2-3 sentences max)
4. Use line breaks generously for readability
5. Highlight KEY numbers and locations in **bold**
6. Use > blockquotes for important callouts or tips

RESPONSE STRUCTURE:
Start with a brief, direct answer to their question (1-2 sentences), then organize info as:

**High School Programs** (if applicable)
- Program name (**X schools**)
- Key locations or notable schools

**College Programs** (if applicable)  
- Program name (**X campuses**)
- Available at: campus names

**Career Opportunities** (if applicable)
- List 3-5 top career paths

**Next Steps** or **Quick Tip**
> A helpful suggestion or next action

CONTEXT AWARENESS:
- Read the conversation history carefully
- If user is asking a follow-up ("show me more", "what about X"), reference previous context
- If user is asking about location ("at UH Manoa?"), filter and highlight that location
- If no results for their query, explain why and suggest alternatives
- Maintain continuity with previous messages

TONE:
- Clear and encouraging
- Concise but informative
- Professional yet approachable
- Action-oriented (tell them what they CAN do)

DO NOT:
- Use excessive emojis (1-2 per section max)
- Write long paragraphs (keep it scannable!)
- Use technical jargon without explanation
- Overwhelm with too many details
- Repeat information from previous messages unless asked

OUTPUT ONLY THE MARKDOWN RESPONSE - No preamble, no "Here's your response:", just the formatted content.`;

    const userPrompt = `${conversationContext}

Current User Query: "${userQuery}"
${userProfile ? `\nUser Profile: ${JSON.stringify(userProfile)}` : ""}

${dataContext}

Generate a clear, markdown-formatted response that directly answers the user's query. Be context-aware and reference previous conversation if relevant.`;

    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 1000,
      });

      let markdown = response.choices[0].message.content || "";

      // Clean up the response
      markdown = this.cleanMarkdown(markdown);

      return markdown;
    } catch (error) {
      console.error("[ResponseFormatter] Error generating response:", error);
      return this.generateFallbackResponse(summary);
    }
  }

  /**
   * Generate a helpful response when no results are found
   */
  private async generateNoResultsResponse(
    userQuery: string,
    conversationHistory: ConversationMessage[],
    userProfile?: any
  ): Promise<string> {
    const conversationContext =
      this.formatConversationContext(conversationHistory);

    const systemPrompt = `You are a helpful educational pathway advisor. The user's query returned no results.

Generate a SHORT, encouraging response that:
1. Acknowledges their query
2. Explains why no results were found (be specific!)
3. Suggests 2-3 alternative searches or related programs
4. Maintains a positive, helpful tone

Use markdown formatting with bullet points. Keep it brief (3-4 sentences + bullets).`;

    const userPrompt = `${conversationContext}

User Query: "${userQuery}"
${userProfile ? `User Profile: ${JSON.stringify(userProfile)}` : ""}

No programs found matching this query. Generate a helpful response with suggestions.`;

    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_tokens: 400,
      });

      return this.cleanMarkdown(
        response.choices[0].message.content || this.getDefaultNoResultsMessage()
      );
    } catch (error) {
      console.error(
        "[ResponseFormatter] Error generating no-results response:",
        error
      );
      return this.getDefaultNoResultsMessage();
    }
  }

  /**
   * Format conversation history for context
   */
  private formatConversationContext(
    conversationHistory: ConversationMessage[]
  ): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return "Conversation History: (First message in conversation)";
    }

    // Take last 6 messages for context
    const recentHistory = conversationHistory.slice(-6);
    const formatted = recentHistory
      .map(
        msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    // Extract most recent substantive query
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

    return `Conversation History (Recent):
${formatted}
${mostRecentTopic ? `\nMost Recent Topic: "${mostRecentTopic}"` : ""}`;
  }

  /**
   * Format data context for the LLM
   */
  private formatDataContext(
    verifiedData: VerifiedData,
    summary: FormattedResponse["summary"]
  ): string {
    let context = `Data Summary:
- **${summary.totalHighSchoolPrograms}** high school programs at **${summary.totalHighSchools}** schools
- **${summary.totalCollegePrograms}** college programs at **${summary.totalCollegeCampuses}** campuses
- **${summary.totalCareerPaths}** career opportunities

`;

    // Add high school program examples
    if (verifiedData.highSchoolPrograms.length > 0) {
      const hsExamples = verifiedData.highSchoolPrograms
        .slice(0, 5)
        .map(item => {
          const programName = item.program.PROGRAM_OF_STUDY;
          const schoolCount = item.schools?.length || 0;
          const topSchools = item.schools?.slice(0, 3).join(", ") || "";
          return `  - ${programName} (${schoolCount} schools: ${topSchools}...)`;
        })
        .join("\n");

      context += `High School Programs:\n${hsExamples}\n\n`;
    }

    // Add college program examples
    if (verifiedData.collegePrograms.length > 0) {
      const collegeExamples = verifiedData.collegePrograms
        .slice(0, 5)
        .map(item => {
          const name = Array.isArray(item.program.PROGRAM_NAME)
            ? item.program.PROGRAM_NAME[0]
            : item.program.PROGRAM_NAME;
          const campusCount = item.campuses?.length || 0;
          const topCampuses = item.campuses?.slice(0, 3).join(", ") || "";
          return `  - ${name} (${campusCount} campuses: ${topCampuses})`;
        })
        .join("\n");

      context += `College Programs:\n${collegeExamples}\n\n`;
    }

    // Add career examples
    if (verifiedData.careers.length > 0) {
      const careerExamples = verifiedData.careers
        .slice(0, 8)
        .map(
          c => `  - ${c.SOC_TITLE || c.SOC_CODE?.[0] || "Career opportunity"}`
        )
        .join("\n");

      context += `Career Paths:\n${careerExamples}`;
    }

    return context;
  }

  /**
   * Clean up markdown formatting
   */
  private cleanMarkdown(markdown: string): string {
    return (
      markdown
        .trim()
        // Remove any "Here's" or "Here is" preambles
        .replace(/^(Here's|Here is|Here are).*?:\s*/i, "")
        // Remove code blocks if they snuck in
        .replace(/```markdown\s*/g, "")
        .replace(/```\s*/g, "")
        // Ensure consistent spacing
        .replace(/\n{3,}/g, "\n\n")
        // Remove trailing spaces
        .replace(/ +$/gm, "")
    );
  }

  /**
   * Generate a simple fallback response
   */
  private generateFallbackResponse(
    summary: FormattedResponse["summary"]
  ): string {
    const parts = [];

    if (summary.totalHighSchoolPrograms > 0) {
      parts.push(
        `**${summary.totalHighSchoolPrograms}** high school programs at **${summary.totalHighSchools}** schools`
      );
    }

    if (summary.totalCollegePrograms > 0) {
      parts.push(
        `**${summary.totalCollegePrograms}** college programs at **${summary.totalCollegeCampuses}** campuses`
      );
    }

    if (summary.totalCareerPaths > 0) {
      parts.push(`**${summary.totalCareerPaths}** career opportunities`);
    }

    if (parts.length === 0) {
      return this.getDefaultNoResultsMessage();
    }

    return `I found ${parts.join(" and ")} related to your interests. The complete details are shown below!`;
  }

  /**
   * Default message when no results are found
   */
  private getDefaultNoResultsMessage(): string {
    return `I couldn't find any programs matching that specific search. 

**Try these instead:**
- Search for broader terms (e.g., "engineering" instead of a specific type)
- Check the spelling of program names
- Ask about general career fields (e.g., "healthcare programs")

> 💡 **Tip:** I can help you explore programs by subject area, career goal, or school location!`;
  }
}

export default ResponseFormatterAgent;
