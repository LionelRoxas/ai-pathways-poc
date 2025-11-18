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
    userProfile?: any,
    degreePreference?: 'Non-Credit' | '2-Year' | '4-Year',
    institutionFilter?: {
      type: 'school' | 'college';
      name: string;
    }
  ): Promise<FormattedResponse> {
    // Log what filters we received
    console.log(`[ResponseFormatter] 🔍 Filters received:`, {
      degreePreference,
      institutionFilter
    });
    
    // Apply degree level filtering if specified
    if (degreePreference) {
      console.log(`[ResponseFormatter] 🎓 Filtering programs by degree preference: ${degreePreference}`);
      
      const beforeCount = verifiedData.collegePrograms.length;
      
      verifiedData.collegePrograms = verifiedData.collegePrograms.filter(item => {
        // Get degree level from multiple possible sources
        let degreeLevel = 
          item.degreeLevel ||             // From aggregator
          item.program?.DEGREE_LEVEL ||   // From DirectSearchTracer
          item.program?.degree_level ||   // From original data
          item.DEGREE_LEVEL ||            // Direct field
          item.degree_level ||            // Lowercase direct field
          '2-Year'; // Default
        
        // Normalize to match our standard format
        const degreeLevelLower = degreeLevel.toLowerCase();
        if (degreeLevelLower === 'non-credit' || degreeLevelLower === 'noncredit') {
          degreeLevel = 'Non-Credit';
        } else if (degreeLevelLower === '2-year') {
          degreeLevel = '2-Year';
        } else if (degreeLevelLower === '4-year') {
          degreeLevel = '4-Year';
        }
        
        return degreeLevel === degreePreference;
      });
      
      const afterCount = verifiedData.collegePrograms.length;
      console.log(`[ResponseFormatter] Filtered ${beforeCount} programs → ${afterCount} programs (${beforeCount - afterCount} removed)`);
    }

    // Apply institution filtering if specified
    if (institutionFilter) {
      const filterName = institutionFilter.name.toLowerCase();
      
      // Helper function for smarter institution name matching
      const matchesInstitution = (campusName: string, searchTerm: string): boolean => {
        // Normalize macrons and other diacritics for matching
        const normalize = (str: string) => str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
        
        const campus = normalize(campusName);
        const search = normalize(searchTerm);
        
        // Direct substring match
        if (campus.includes(search) || search.includes(campus)) {
          return true;
        }
        
        // Handle common abbreviations and variations
        // "UH Manoa" should match "University of Hawaii at Manoa"
        if (search.includes('uh') && search.includes('manoa') && campus.includes('manoa')) {
          return true;
        }
        if (search.includes('uh') && search.includes('hilo') && campus.includes('hilo')) {
          return true;
        }
        // "Honolulu CC" should match "Honolulu Community College"
        if (search.includes('cc') && campus.includes('community college')) {
          const searchWords = search.split(/\s+/);
          const campusWords = campus.split(/\s+/);
          // Check if key location words match
          return searchWords.some(word => word.length > 2 && campusWords.includes(word));
        }
        // "KCC" should match "Kapiolani Community College"
        if (search === 'kcc' && campus.includes('kapiolani')) {
          return true;
        }
        if (search === 'honcc' && campus.includes('honolulu community')) {
          return true;
        }
        if (search === 'lcc' && campus.includes('leeward')) {
          return true;
        }
        if (search === 'wcc' && campus.includes('windward')) {
          return true;
        }
        if (search === 'hpu' && campus.includes('hawaii pacific')) {
          return true;
        }
        
        // Word-by-word matching for multi-word searches
        const searchWords = search.split(/\s+/).filter(w => w.length > 2);
        const campusWords = campus.split(/\s+/);
        const matchedWords = searchWords.filter(word => 
          campusWords.some(campusWord => campusWord.includes(word) || word.includes(campusWord))
        );
        
        // Match if most search words are found
        return matchedWords.length >= Math.ceil(searchWords.length * 0.6);
      };
      
      if (institutionFilter.type === 'school') {
        // Filter high school programs
        console.log(`[ResponseFormatter] 🏫 Filtering high school programs by school: ${institutionFilter.name}`);
        const beforeCount = verifiedData.highSchoolPrograms.length;
        
        verifiedData.highSchoolPrograms = verifiedData.highSchoolPrograms.filter(item => {
          const schools = item.schools || [];
          return schools.some((school: string) => matchesInstitution(school, filterName));
        }).map(item => {
          // ALSO filter the schools array to only show the requested school
          const filteredSchools = (item.schools || []).filter((school: string) => 
            matchesInstitution(school, filterName)
          );
          
          return {
            ...item,
            schools: filteredSchools
          };
        });
        
        const afterCount = verifiedData.highSchoolPrograms.length;
        console.log(`[ResponseFormatter] Filtered ${beforeCount} HS programs → ${afterCount} programs (${beforeCount - afterCount} removed)`);
        
      } else if (institutionFilter.type === 'college') {
        // Filter college programs
        console.log(`[ResponseFormatter] 🎓 Filtering college programs by institution: ${institutionFilter.name}`);
        const beforeCount = verifiedData.collegePrograms.length;
        
        verifiedData.collegePrograms = verifiedData.collegePrograms.filter(item => {
          const campuses = item.campuses || [];
          // Also check the institution field if available
          const institution = item.program?.iro_institution || item.program?.IRO_INSTITUTION || '';
          
          return campuses.some((campus: string) => matchesInstitution(campus, filterName)) || 
                 (institution && matchesInstitution(institution, filterName));
        }).map(item => {
          // ALSO filter the campuses array to only show the requested institution
          const filteredCampuses = (item.campuses || []).filter((campus: string) => 
            matchesInstitution(campus, filterName)
          );
          
          return {
            ...item,
            campuses: filteredCampuses
          };
        });
        
        const afterCount = verifiedData.collegePrograms.length;
        console.log(`[ResponseFormatter] Filtered ${beforeCount} college programs → ${afterCount} programs (${beforeCount - afterCount} removed)`);
      }
    }
    
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

Organize by degree level when available:

### 2-Year Programs (Associate Degrees)
- Program name - Available at: Campus Name, Campus Name

### 4-Year Programs (Bachelor's Degrees)  
- Program name - Available at: Campus Name, Campus Name

### Non-Credit Programs (Certificates & Training)
- Program name - Available at: Campus Name

Important: List the actual campus names, not just the count! Group by degree level if the data provides it.

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
        model: "openai/gpt-oss-120b", // Response formatting needs powerful reasoning: 500 tps, 74% cheaper
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

Your job: Make a POSITIVE recommendation for the CLOSEST related field or program that DOES exist in Hawaii's system.

Keep it SIMPLE and conversational:
1. Present it as a recommendation, not as "no results found"
2. Frame it positively: "Based on your interest in [X], you might be interested in [Y]"
3. End with "Are you looking for [specific suggestion]?" to prompt a simple "yes"

Use minimal formatting. NO emojis. Make the suggestion specific and actionable.

NEVER say: "I couldn't find", "no matches", "no results", or similar negative phrases.

Example format:

## Are You Looking For

Based on your interest in [their query], I recommend checking out programs in [related field].

We have several options in [specific area] that align with what you're searching for.

Are you looking for [specific related program/field]?`;

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
        model: "openai/gpt-oss-120b", // No-results formatting needs powerful reasoning: 500 tps, 74% cheaper
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

    // Add college program examples - GROUPED BY DEGREE LEVEL
    if (verifiedData.collegePrograms.length > 0) {
      console.log("[ResponseFormatter] College programs received:", JSON.stringify(verifiedData.collegePrograms.slice(0, 3), null, 2));
      
      // Group programs by degree level
      const programsByLevel: Record<string, any[]> = {
        '2-Year': [],
        '4-Year': [],
        'Non-Credit': []
      };
      
      verifiedData.collegePrograms.forEach(item => {
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
        
        // Get degree level - NOW CHECKING AGGREGATED FIELD FIRST
        let degreeLevel = 
          item.degreeLevel ||             // NEW: From aggregator (primary source)
          item.program?.DEGREE_LEVEL ||   // From DirectSearchTracer
          item.program?.degree_level ||   // From original data
          item.DEGREE_LEVEL ||            // Direct field
          item.degree_level ||            // Lowercase direct field
          '2-Year'; // Default to 2-Year if not specified
        
        // NORMALIZE degree level to match our keys (handle case-insensitive variations)
        if (degreeLevel.toLowerCase() === 'non-credit' || degreeLevel.toLowerCase() === 'noncredit') {
          degreeLevel = 'Non-Credit';
        } else if (degreeLevel === '2-Year' || degreeLevel === '2-year' || degreeLevel === 'two-year') {
          degreeLevel = '2-Year';
        } else if (degreeLevel === '4-Year' || degreeLevel === '4-year' || degreeLevel === 'four-year') {
          degreeLevel = '4-Year';
        }
        
        // Debug logging for first few programs
        if (verifiedData.collegePrograms.indexOf(item) < 3) {
          console.log(`[ResponseFormatter] Program degree level check:`, {
            name,
            finalDegreeLevel: degreeLevel,
            'item.degreeLevel (AGGREGATED)': item.degreeLevel,
            'program.DEGREE_LEVEL': item.program?.DEGREE_LEVEL,
            'item.DEGREE_LEVEL': item.DEGREE_LEVEL,
            'program.degree_level': item.program?.degree_level,
            'item.degree_level': item.degree_level
          });
        }
        
        const campuses = item.campuses || [];
        const campusList = campuses.join(", ");
        
        if (name && name !== 'Program' && campusList) {
          const formatted = `  - ${name} - Available at: ${campusList}`;
          
          // Add to appropriate degree level group
          if (programsByLevel[degreeLevel]) {
            programsByLevel[degreeLevel].push(formatted);
          } else {
            // If degree level not recognized, add to 2-Year
            console.warn(`[ResponseFormatter] Unrecognized degree level: "${degreeLevel}" - defaulting to 2-Year`);
            programsByLevel['2-Year'].push(formatted);
          }
        }
      });
      
      // Format output with degree level sections
      let collegeOutput = '';
      
      if (programsByLevel['2-Year'].length > 0) {
        hasCollegeData = true;
        collegeOutput += `2-Year Programs (Associate Degrees):\n${programsByLevel['2-Year'].slice(0, 10).join('\n')}\n\n`;
      }
      
      if (programsByLevel['4-Year'].length > 0) {
        hasCollegeData = true;
        collegeOutput += `4-Year Programs (Bachelor's Degrees):\n${programsByLevel['4-Year'].slice(0, 10).join('\n')}\n\n`;
      }
      
      if (programsByLevel['Non-Credit'].length > 0) {
        hasCollegeData = true;
        collegeOutput += `Non-Credit Programs (Certificates & Training):\n${programsByLevel['Non-Credit'].slice(0, 10).join('\n')}\n\n`;
      }

      if (collegeOutput.trim()) {
        context += `College Programs (INCLUDE THIS SECTION - Organized by degree level!):\n${collegeOutput}`;
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
    return `## Are You Looking For:

Based on your interests, I recommend exploring Hawaii's career and technical programs.

We have pathways in healthcare, technology, business, trades, and creative fields.

Are you looking for help exploring different career options?`;
  }
}

export default ResponseFormatterAgent;
