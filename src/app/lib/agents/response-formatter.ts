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

    const systemPrompt = `You are a UX-focused educational pathway advisor for Hawaii students. Your responses MUST be clean, elegant, and easy to scan.

FORMATTING RULES (Keep it SIMPLE):
1. Start with a brief, conversational answer (1-2 sentences)
2. Use simple section breaks with just bold text for headers
3. Use bullet points (•) for lists
4. Keep it SHORT - no walls of text
5. Highlight only the MOST important numbers in **bold**
6. One quick tip at the end if helpful

RESPONSE STRUCTURE (Simple & Clean):

[Brief answer to their question in 1-2 sentences]

**Programs Found**
• Program name - Available at X schools/campuses
• Program name - Available at X schools/campuses

**Career Paths** (if applicable)
• Career 1
• Career 2
• Career 3

**Next Steps**
[Optional: One helpful tip or next step in plain text]

CONTEXT AWARENESS:
- Reference previous conversation naturally if relevant
- If they're asking about a specific location, focus on that
- If no results, explain briefly and suggest 2 alternatives

TONE:
- Conversational and warm
- Clear and direct
- No jargon or excessive formatting
- Action-oriented

DO NOT:
- Use emojis (they clutter the design)
- Use numbered lists (unless it's steps)
- Use blockquotes or special formatting
- Repeat yourself
- Over-format with multiple levels of headers
- Write long paragraphs

OUTPUT ONLY THE MARKDOWN - No preamble.`;

    const userPrompt = `${conversationContext}

Current Query: "${userQuery}"
${userProfile ? `\nUser Profile: ${JSON.stringify(userProfile)}` : ""}

${dataContext}

Generate a clean, simple response.`;

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

Keep your response SIMPLE and CLEAN:
1. One sentence acknowledging their search
2. Brief reason why (if obvious)
3. 2-3 alternatives as bullet points
4. End with an encouraging sentence

Use minimal formatting - just bullet points for suggestions.

Example format:
I couldn't find programs matching "[their query]".

You might want to try:
• Broader search term
• Related field
• General category

Let me know what interests you and I'll help you find programs!`;

    const userPrompt = `${conversationContext}

User Query: "${userQuery}"
${userProfile ? `User Profile: ${JSON.stringify(userProfile)}` : ""}

Generate a helpful, simple response.`;

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
    return `I couldn't find any programs matching that search.

You might want to try:
• Broader search terms
• Related career fields
• Asking about specific schools or islands

What area are you interested in exploring?`;
  }
}

export default ResponseFormatterAgent;
