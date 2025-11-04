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

    const systemPrompt = `You are a conversational guide for Hawaii educational pathways. Keep responses minimal and focused.

CORE PRINCIPLE:
Brief, conversational, and focused on the programs found. Let the data speak for itself.

FORMATTING RULES:
- Use simple markdown: ## for headers, **bold** for emphasis, - for bullets
- NO emojis
- Keep it SHORT (2-4 sentences intro max)
- Use headers to organize sections
- ONLY include sections that have data

CRITICAL RULES:
1. ONLY list programs that have actual names (not just "Program")
2. If a section has NO data or programs, DO NOT include that section header at all
3. If high school programs list is empty → Skip "## High School Programs" entirely
4. If college programs list is empty → Skip "## College Programs" entirely
5. If careers list is empty → Skip "## Career Paths" entirely
6. **FOR CAREER PATHS: Generate relevant occupation names based on the field of study. Be specific and professional.**
7. **List 3-5 realistic career paths that match the programs discussed**
8. **Use actual occupation titles, not generic placeholders like "Career opportunity"**

RESPONSE STRUCTURE (ALWAYS FOLLOW THIS):

[REQUIRED: 1-2 sentence acknowledgment that ANSWERS their question directly while introducing the results]

## High School Programs (ONLY if data exists)

- Program name - X schools
- Program name - X schools

## College Programs (ONLY if data exists AND has valid names)

- Program name - Available at: Campus Name, Campus Name (list all campuses)
- Program name - Available at: Campus Name, Campus Name, Campus Name

Important: List the actual campus names, not just the count!

## Career Paths (ONLY if there are related careers to mention)

- [Specific occupation name related to the programs]
- [Another occupation name]
- [Another occupation name]

Generate realistic, specific occupation titles based on the programs discussed.

[Optional: One sentence next step or tip]

TONE:
- **ALWAYS start with a 1-2 sentence acknowledgment** of what they asked for
- **If they asked a question (e.g., "Are there coding programs?"), ANSWER IT DIRECTLY first** (e.g., "Yes, there are several coding programs!")
- **If they asked about specifics (e.g., location, schools, requirements), ADDRESS THAT in the acknowledgment**
- Conversational like talking to a friend
- Direct and confident
- Action-oriented
- Minimal explanations

EXAMPLES OF GOOD ACKNOWLEDGMENTS:

For general searches:
- "Great! I found several engineering pathways for you."
- "Here are the computer science programs available in Hawaii."
- "Perfect! There are quite a few culinary arts options to explore."

For clarification questions (ANSWER THE QUESTION):
- "Yes, there are coding programs! Here are the computer science options available."
- "Absolutely! These programs have hands-on lab work included."
- "Yes, several of these programs are available on Oahu - here's what I found."
- "There are 3 campuses offering this program across the islands."
- "Most of these programs require 2-3 years to complete."

For follow-up questions:
- "Yes, many of these programs lead to environmental careers - here are your options."
- "Definitely! Here are programs that match your interest in conservation."

CONTEXT AWARENESS:
- Reference previous conversation naturally if relevant
- Focus on what they asked for
- If they asked about a location, emphasize that

DO NOT:
- Use emojis
- Write long introductions
- Over-explain
- Use numbered lists unless it's sequential steps
- Repeat information
- Be overly formal
- Include section headers when there's no data for that section
- List programs that just say "Program" without a real name
- **Add, infer, suggest, or make up any career titles not explicitly in the provided data**

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

    const systemPrompt = `You are a conversational guide for Hawaii educational pathways. The user's query returned no results.

Keep it SIMPLE and conversational:
1. One sentence acknowledging their search
2. 2-3 alternatives as bullet points
3. End with a question to keep the conversation going

Use minimal formatting - just bullet points for suggestions. NO emojis.

Example format:

## No Results Found

I couldn't find programs matching "[their query]".

You might want to try:
- Broader search term
- Related field
- General category

What area interests you most?`;

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

    let hasHighSchoolData = false;
    let hasCollegeData = false;
    let hasCareerData = false;

    // Add high school program examples
    if (verifiedData.highSchoolPrograms.length > 0) {
      const hsExamples = verifiedData.highSchoolPrograms
        .slice(0, 5)
        .map(item => {
          // Handle both aggregated format (item.name) and raw format (item.program.PROGRAM_OF_STUDY)
          const programName = item.name || item.program?.PROGRAM_OF_STUDY || "Program";
          const schools = item.schools || [];
          const schoolCount = schools.length;
          const topSchools = schools.slice(0, 3).join(", ");
          return `  - ${programName} (${schoolCount} schools: ${topSchools}${schoolCount > 3 ? '...' : ''})`;
        })
        .join("\n");

      if (hsExamples.trim()) {
        hasHighSchoolData = true;
        context += `High School Programs (INCLUDE THIS SECTION):\n${hsExamples}\n\n`;
      }
    }

    // Add college program examples
    if (verifiedData.collegePrograms.length > 0) {
      console.log("[ResponseFormatter] College programs received:", JSON.stringify(verifiedData.collegePrograms.slice(0, 3), null, 2));
      
      const collegeExamples = verifiedData.collegePrograms
        .slice(0, 10) // Check more programs to find ones with names
        .map(item => {
          // Handle multiple possible name fields from aggregation
          let name = 
            item.name ||                    // Standard aggregated format
            item.programFamily ||           // Aggregated college program format
            item.program?.PROGRAM_NAME ||   // Raw program format (array)
            item.program?.PROGRAM_OF_STUDY; // Fallback to any name field
          
          // If PROGRAM_NAME is an array, take the first element
          if (Array.isArray(name)) {
            name = name[0];
          }
          
          const campuses = item.campuses || [];
          const campusCount = campuses.length;
          const campusList = campuses.join(", ");
          
          return {
            name: name || null,
            campusCount,
            campusList,
            formatted: name && name !== 'Program' 
              ? `  - ${name} - Available at: ${campusList}`
              : null
          };
        })
        .filter(item => item.formatted !== null) // Only include programs with valid names
        .map(item => item.formatted)
        .join("\n");

      if (collegeExamples.trim()) {
        hasCollegeData = true;
        context += `College Programs (INCLUDE THIS SECTION - List campus names!):\n${collegeExamples}\n\n`;
      } else {
        console.warn("[ResponseFormatter] No college programs with valid names found");
        context += `College Programs: ${verifiedData.collegePrograms.length} programs found but names not available (DO NOT INCLUDE THIS SECTION)\n\n`;
      }
    }

    // Add career examples
    if (verifiedData.careers.length > 0) {
      // Careers are SOC codes - LLM will generate occupation names based on the programs
      hasCareerData = true;
      context += `Career Data Available: ${verifiedData.careers.length} career paths exist for these programs.\n\n`;
      context += `CAREER PATHS INSTRUCTION:\n`;
      context += `Generate 3-5 specific, realistic occupation titles that students could pursue with these programs.\n`;
      context += `Base the occupations on the HIGH SCHOOL and COLLEGE programs listed above.\n`;
      context += `Use professional occupation titles (e.g., "Registered Nurse", "Software Developer", "Culinary Chef").\n\n`;
    }

    // Add summary of what to include
    context += `\n\n=== SECTION INCLUSION INSTRUCTIONS ===\n`;
    context += `Include "## High School Programs" section: ${hasHighSchoolData ? 'YES' : 'NO'}\n`;
    context += `Include "## College Programs" section: ${hasCollegeData ? 'YES' : 'NO'}\n`;
    context += `Include "## Career Paths" section: ${hasCareerData ? 'YES' : 'NO'}\n`;

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

    return `## Programs Found

I found ${parts.join(" and ")} related to your interests.

Check out the details below!`;
  }

  /**
   * Default message when no results are found
   */
  private getDefaultNoResultsMessage(): string {
    return `## No Results Found

I couldn't find any programs matching that search.

You might want to try:
- Broader search terms
- Related career fields
- Asking about specific schools or islands

What area are you interested in exploring?`;
  }
}

export default ResponseFormatterAgent;
