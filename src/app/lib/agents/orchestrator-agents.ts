/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/orchestrator-agents.ts
import Groq from "groq-sdk";
import ResultVerifier from "./result-verifier";
import ResponseFormatterAgent from "./response-formatter";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const resultVerifier = new ResultVerifier();
const responseFormatter = new ResponseFormatterAgent();

/**
 * Interface definitions for clarity
 */
interface ToolCall {
  name: string;
  args: any;
}

interface ToolResult {
  tool: string;
  args: any;
  result: any;
  error?: string;
}

interface CollectedData {
  highSchoolPrograms: any[];
  collegePrograms: any[];
  careers: any[];
  cipMappings: any[];
  schools: Set<string>;
  campuses: Set<string>;
}

interface UserProfile {
  educationLevel: string | null;
  interests: string[];
  careerGoals: string[];
  location: string | null;
}

/**
 * Clean tool catalog with simple, clear descriptions
 */
const TOOL_CATALOG = {
  // High School Tools
  search_hs_programs: {
    description: "Search high school programs by keywords",
    example: `search_hs_programs(["engineering", "technology"])`,
    params: ["keywords: string[]"],
  },
  get_hs_program_details: {
    description: "Get complete details for a specific high school program",
    example: `get_hs_program_details("Engineering")`,
    params: ["programName: string"],
  },
  get_hs_program_schools: {
    description: "Get all schools offering a specific program",
    example: `get_hs_program_schools("Culinary Arts (CA)")`,
    params: ["programName: string"],
  },
  get_hs_courses: {
    description: "Get course requirements for a program",
    example: `get_hs_courses("Engineering")`,
    params: ["programName: string"],
  },

  // College Tools
  search_college_programs: {
    description: "Search college programs by keywords",
    example: `search_college_programs(["computer", "science"])`,
    params: ["keywords: string[]"],
  },
  get_college_by_cip: {
    description: "Get college programs by CIP codes",
    example: `get_college_by_cip(["11.0101", "11.0102"])`,
    params: ["cipCodes: string[]"],
  },
  get_college_campuses: {
    description: "Get campuses for a specific CIP code",
    example: `get_college_campuses("11.0101")`,
    params: ["cipCode: string"],
  },

  // CIP Mapping Tools
  expand_cip: {
    description: "Expand 2-digit CIP codes to full codes",
    example: `expand_cip(["11", "12"])`,
    params: ["cip2Digits: string[]"],
  },
  get_cip_category: {
    description: "Get category names for CIP codes",
    example: `get_cip_category(["11"])`,
    params: ["cip2Digits: string[]"],
  },

  // Career Tools
  get_careers: {
    description: "Get careers from CIP codes",
    example: `get_careers(["11.0101"])`,
    params: ["cipCodes: string[]"],
  },

  // Comprehensive Tools
  trace_pathway: {
    description: "Trace complete pathway from keywords",
    example: `trace_pathway(["culinary"])`,
    params: ["keywords: string[]"],
  },
  trace_from_hs: {
    description: "Trace pathway from specific HS program",
    example: `trace_from_hs("Culinary Arts (CA)")`,
    params: ["programName: string"],
  },
};

/**
 * Extract keywords from user message
 */
function extractKeywords(message: string): string[] {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "about",
    "what",
    "which",
    "where",
    "how",
    "is",
    "are",
    "was",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "programs",
    "program",
    "course",
    "courses",
    "want",
    "need",
    "like",
    "find",
    "show",
    "tell",
    "give",
    "list",
  ]);

  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Priority keywords for educational domains
  const domainKeywords = [
    "culinary",
    "cooking",
    "food",
    "chef",
    "engineering",
    "engineer",
    "technical",
    "computer",
    "software",
    "programming",
    "coding",
    "technology",
    "tech",
    "health",
    "medical",
    "nursing",
    "healthcare",
    "business",
    "management",
    "finance",
    "accounting",
    "art",
    "arts",
    "design",
    "creative",
    "graphic",
    "music",
    "audio",
    "performance",
    "science",
    "biology",
    "chemistry",
    "physics",
    "math",
    "mathematics",
    "statistics",
    "cyber",
    "security",
    "cybersecurity",
    "network",
    "automotive",
    "mechanic",
    "mechanical",
    "construction",
    "building",
    "architecture",
    "hospitality",
    "tourism",
    "hotel",
    "travel",
    "agriculture",
    "farming",
    "environmental",
  ];

  const foundDomainKeywords = words.filter(w => domainKeywords.includes(w));

  if (foundDomainKeywords.length > 0) {
    return foundDomainKeywords;
  }

  return words.slice(0, 3); // Return top 3 words if no domain keywords found
}

/**
 * Parse tool calls from LLM response
 */
function parseToolCalls(response: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  const lines = response.split("\n");

  for (const line of lines) {
    // Match various formats the LLM might use
    const patterns = [
      /TOOL_CALL:\s*(\w+)\((.*?)\)/,
      /(\w+)\((.*?)\)/,
      /^(\w+):\s*\[(.*?)\]/,
      /^(\w+):\s*"(.*?)"/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, functionName, argsStr] = match;

        // Skip if not a valid tool name
        if (!isValidToolName(functionName)) continue;

        // Parse arguments
        let args: any;
        try {
          // Try to parse as JSON
          if (argsStr.startsWith("[") || argsStr.startsWith("{")) {
            args = JSON.parse(argsStr);
          } else if (argsStr.includes(",")) {
            // Parse as array of strings
            args = argsStr.split(",").map(s => s.trim().replace(/['"]/g, ""));
          } else {
            // Single string argument
            args = argsStr.trim().replace(/['"]/g, "");
          }
        } catch {
          // Fallback: treat as string
          args = argsStr.trim().replace(/['"]/g, "");
        }

        toolCalls.push({ name: functionName, args });
        break; // Found a match, move to next line
      }
    }
  }

  return toolCalls;
}

/**
 * Check if a function name is valid
 */
function isValidToolName(name: string): boolean {
  const validNames = [
    "search_hs_programs",
    "get_hs_program_details",
    "get_hs_program_schools",
    "get_hs_courses",
    "search_college_programs",
    "get_college_by_cip",
    "get_college_campuses",
    "expand_cip",
    "get_cip_category",
    "get_careers",
    "trace_pathway",
    "trace_from_hs",
    // Legacy names for compatibility
    "search_high_school_programs",
    "get_course_details",
    "get_schools_offering_program",
    "search_college_programs_by_cip",
    "get_careers_from_cip",
    "expand_cip_codes",
  ];

  return validNames.includes(name);
}

/**
 * PLANNING AGENT - Decides what tools to call
 */
export async function planToolCalls(
  message: string,
  profile: UserProfile,
  conversationHistory: any[] = []
): Promise<ToolCall[]> {
  const keywords = extractKeywords(message);

  const systemPrompt = `You are a tool planning agent for Hawaii's educational pathway system.

AVAILABLE TOOLS:
${Object.entries(TOOL_CATALOG)
  .map(
    ([name, info]) => `${name}: ${info.description}\nExample: ${info.example}`
  )
  .join("\n\n")}

PLANNING STRATEGY:
1. For general queries: Start with trace_pathway(keywords)
2. For specific programs: Use get_hs_program_details or trace_from_hs
3. For "where" questions: Include school/campus lookup tools
4. Always trace complete pathways (HS → College → Career)

OUTPUT RULES:
- Output ONLY tool calls, one per line
- Format: tool_name(arguments)
- Arguments must be valid JSON arrays or strings
- Use 3-5 tools minimum for comprehensive results`;

  const userPrompt = `Query: "${message}"
Keywords extracted: ${JSON.stringify(keywords)}
User profile: ${JSON.stringify(profile)}

Plan the tool calls needed:`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-4), // Include last 4 messages for context
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
    });

    const responseText = response.choices[0].message.content || "";
    let toolCalls = parseToolCalls(responseText);

    // Ensure minimum comprehensive tracing
    if (toolCalls.length === 0 || toolCalls.length < 2) {
      toolCalls = [
        { name: "trace_pathway", args: keywords },
        { name: "get_careers", args: ["all"] },
      ];
    }

    return toolCalls;
  } catch (error) {
    console.error("Planning error:", error);
    // Fallback plan
    return [{ name: "trace_pathway", args: keywords }];
  }
}

/**
 * EXECUTE TOOL CALLS - Runs the actual tools
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  Tools: any
): Promise<{ results: ToolResult[]; collectedData: CollectedData }> {
  const results: ToolResult[] = [];
  const collectedData: CollectedData = {
    highSchoolPrograms: [],
    collegePrograms: [],
    careers: [],
    cipMappings: [],
    schools: new Set(),
    campuses: new Set(),
  };

  // Initialize tool instances
  const hsDataTool = new Tools.HS();
  const collegeDataTool = new Tools.College();
  const cipMappingTool = new Tools.CIP();
  const careerDataTool = new Tools.Career();
  const pathwayTracer = Tools.PathwayTracer ? new Tools.PathwayTracer() : null;

  for (const toolCall of toolCalls) {
    try {
      let result: any = null;
      const { name, args } = toolCall;

      // Execute based on tool name
      switch (name) {
        // High School Tools
        case "search_hs_programs":
        case "search_high_school_programs": {
          const programs = await hsDataTool.getAllPrograms();
          const keywords = Array.isArray(args) ? args : [args];
          const filtered = Tools.Search.rankResults(programs, keywords);

          // Get schools for each program
          for (const program of filtered.slice(0, 10)) {
            const schools = await hsDataTool.getSchoolsForProgram(
              program.PROGRAM_OF_STUDY
            );
            collectedData.highSchoolPrograms.push({ program, schools });
            schools.forEach((s: string) => collectedData.schools.add(s));
          }

          result = filtered;
          break;
        }

        case "get_hs_program_details":
        case "get_hs_program_schools": {
          const programName = Array.isArray(args) ? args[0] : args;
          const [program, schools, coursesByGrade, coursesByLevel] =
            await Promise.all([
              hsDataTool.getProgramByName(programName),
              hsDataTool.getSchoolsForProgram(programName),
              hsDataTool.getCoursesByGrade(programName),
              hsDataTool.getCoursesByLevel(programName),
            ]);

          if (program) {
            collectedData.highSchoolPrograms.push({
              program,
              schools,
              courses: coursesByGrade || coursesByLevel,
            });
            schools.forEach((s: string) => collectedData.schools.add(s));
          }

          result = { program, schools, coursesByGrade, coursesByLevel };
          break;
        }

        case "get_hs_courses":
        case "get_course_details": {
          const programName = Array.isArray(args) ? args[0] : args;
          result = await hsDataTool.getCoursesByGrade(programName);
          break;
        }

        // College Tools
        case "search_college_programs": {
          const keywords = Array.isArray(args) ? args : [args];
          const programs = await collegeDataTool.getAllPrograms();
          const filtered = Tools.Search.rankResults(programs, keywords);

          // Get campuses for each program
          for (const program of filtered.slice(0, 10)) {
            const campuses = await collegeDataTool.getCampusesByCIP(
              program.CIP_CODE
            );
            collectedData.collegePrograms.push({ program, campuses });
            campuses.forEach((c: string) => collectedData.campuses.add(c));
          }

          result = filtered;
          break;
        }

        case "get_college_by_cip":
        case "search_college_programs_by_cip": {
          let cipCodes = Array.isArray(args) ? args : [args];

          // If 2-digit CIPs, expand them first
          if (cipCodes[0] && cipCodes[0].length === 2) {
            cipCodes = await cipMappingTool.expandCIP2Digits(cipCodes);
          }

          const programs = await collegeDataTool.getProgramsByCIP(cipCodes);

          // Get campuses for each
          for (const program of programs) {
            const campuses = await collegeDataTool.getCampusesByCIP(
              program.CIP_CODE
            );
            collectedData.collegePrograms.push({ program, campuses });
            campuses.forEach((c: string) => collectedData.campuses.add(c));
          }

          result = programs;
          break;
        }

        case "get_college_campuses": {
          const cipCode = Array.isArray(args) ? args[0] : args;
          result = await collegeDataTool.getCampusesByCIP(cipCode);
          result.forEach((c: string) => collectedData.campuses.add(c));
          break;
        }

        // CIP Tools
        case "expand_cip":
        case "expand_cip_codes": {
          const cip2Digits = Array.isArray(args) ? args : [args];
          result = await cipMappingTool.expandCIP2Digits(cip2Digits);
          collectedData.cipMappings.push({
            CIP_2DIGIT: cip2Digits,
            CIP_CODE: result,
          });
          break;
        }

        case "get_cip_category": {
          const cip2Digits = Array.isArray(args) ? args : [args];
          result = await cipMappingTool.getCIPCategories(cip2Digits);
          break;
        }

        // Career Tools
        case "get_careers":
        case "get_careers_from_cip": {
          let cipCodes = Array.isArray(args) ? args : [args];

          // Handle "all" keyword
          if (
            cipCodes[0] === "all" &&
            collectedData.collegePrograms.length > 0
          ) {
            cipCodes = collectedData.collegePrograms.map(
              cp => cp.program.CIP_CODE
            );
          }

          const careers = await careerDataTool.getSOCCodesByCIP(cipCodes);
          collectedData.careers.push(...careers);
          result = careers;
          break;
        }

        // Comprehensive Tracing Tools
        case "trace_pathway": {
          if (pathwayTracer) {
            const keywords = Array.isArray(args) ? args : [args];
            const pathway = await pathwayTracer.traceFromKeywords(keywords);

            if (pathway) {
              collectedData.highSchoolPrograms.push(
                ...(pathway.highSchoolPrograms || [])
              );
              collectedData.collegePrograms.push(
                ...(pathway.collegePrograms || [])
              );
              collectedData.careers.push(...(pathway.careers || []));
              collectedData.cipMappings.push(...(pathway.cipMappings || []));

              // Collect schools and campuses
              pathway.highSchoolPrograms?.forEach((hp: { schools: any[] }) => {
                hp.schools?.forEach(s => collectedData.schools.add(s));
              });
              pathway.collegePrograms?.forEach((cp: { campuses: any[] }) => {
                cp.campuses?.forEach(c => collectedData.campuses.add(c));
              });
            }

            result = pathway;
          }
          break;
        }

        case "trace_from_hs": {
          if (pathwayTracer) {
            const programName = Array.isArray(args) ? args[0] : args;
            const pathway =
              await pathwayTracer.traceFromHighSchool(programName);

            if (pathway) {
              collectedData.highSchoolPrograms.push(
                ...(pathway.highSchoolPrograms || [])
              );
              collectedData.collegePrograms.push(
                ...(pathway.collegePrograms || [])
              );
              collectedData.careers.push(...(pathway.careers || []));
              collectedData.cipMappings.push(...(pathway.cipMappings || []));

              // Collect schools and campuses
              pathway.highSchoolPrograms?.forEach((hp: { schools: any[] }) => {
                hp.schools?.forEach(s => collectedData.schools.add(s));
              });
              pathway.collegePrograms?.forEach((cp: { campuses: any[] }) => {
                cp.campuses?.forEach(c => collectedData.campuses.add(c));
              });
            }

            result = pathway;
          }
          break;
        }

        default:
          console.warn(`Unknown tool: ${name}`);
          result = { error: `Unknown tool: ${name}` };
      }

      results.push({
        tool: name,
        args: args,
        result: result,
      });
    } catch (error: any) {
      console.error(`Error executing ${toolCall.name}:`, error);
      results.push({
        tool: toolCall.name,
        args: toolCall.args,
        result: null,
        error: error.message,
      });
    }
  }

  // Convert sets to arrays for final output
  const finalData = {
    ...collectedData,
    schools: Array.from(collectedData.schools),
    campuses: Array.from(collectedData.campuses),
  };

  return { results, collectedData: finalData as any };
}

/**
 * VERIFICATION STEP - Verify results match user query with extracted intent
 */
async function verifyResults(
  message: string,
  collectedData: any,
  conversationHistory: any[] = [],
  extractedIntent?: string // ADD THIS PARAMETER
): Promise<any> {
  console.log(
    `[Verifier] Starting verification for ${collectedData.highSchoolPrograms.length} HS + ${collectedData.collegePrograms.length} college programs`
  );

  try {
    // Verify high school programs - PASS extractedIntent
    const verifiedHS = await resultVerifier.verifyHighSchoolPrograms(
      message,
      collectedData.highSchoolPrograms,
      conversationHistory, // ADD THIS
      extractedIntent // ADD THIS
    );

    // Verify college programs - PASS extractedIntent
    const verifiedCollege = await resultVerifier.verifyCollegePrograms(
      message,
      collectedData.collegePrograms,
      conversationHistory, // ADD THIS
      extractedIntent // ADD THIS
    );

    // Rebuild schools and campuses sets from verified results
    const schools = new Set<string>();
    const campuses = new Set<string>();

    verifiedHS.forEach(item => {
      if (item.schools) {
        item.schools.forEach(s => schools.add(s));
      }
    });

    verifiedCollege.forEach(item => {
      if (item.campuses) {
        item.campuses.forEach(c => campuses.add(c));
      }
    });

    console.log(
      `[Verifier] Verification complete: ${verifiedHS.length} HS + ${verifiedCollege.length} college programs (filtered)`
    );

    return {
      ...collectedData,
      highSchoolPrograms: verifiedHS,
      collegePrograms: verifiedCollege,
      schools: Array.from(schools),
      campuses: Array.from(campuses),
    };
  } catch (error) {
    console.error(
      "[Verifier] Verification failed, using unverified results:",
      error
    );
    return collectedData;
  }
}

/**
/**
 * RESPONSE GENERATION - Uses Response Formatter Agent for markdown formatting
 */
async function generateResponse(
  message: string,
  toolResults: ToolResult[],
  collectedData: CollectedData,
  conversationHistory: any[] = [],
  userProfile?: UserProfile
): Promise<string> {
  try {
    const formattedResponse = await responseFormatter.formatResponse(
      message,
      collectedData,
      conversationHistory,
      userProfile
    );

    return formattedResponse.markdown;
  } catch (error) {
    console.error("[Orchestrator] Response generation error:", error);

    // Fallback response
    const summary = {
      highSchoolPrograms: collectedData.highSchoolPrograms.length,
      totalHighSchools: Array.isArray(collectedData.schools)
        ? collectedData.schools.length
        : collectedData.schools.size,
      collegePrograms: collectedData.collegePrograms.length,
      totalCollegeCampuses: Array.isArray(collectedData.campuses)
        ? collectedData.campuses.length
        : collectedData.campuses.size,
      careers: collectedData.careers.length,
    };

    if (summary.highSchoolPrograms === 0 && summary.collegePrograms === 0) {
      return `I couldn't find any programs matching that search. Try broader terms or ask about general career fields!`;
    }

    return `I found **${summary.highSchoolPrograms}** high school programs at **${summary.totalHighSchools}** schools and **${summary.collegePrograms}** college programs at **${summary.totalCollegeCampuses}** campuses related to your interests.`;
  }
}

/**
 * PROFILE EXTRACTION AGENT - Extracts user context
 */
export async function extractProfile(message: string): Promise<UserProfile> {
  const systemPrompt = `Extract user profile information from their message. Return ONLY valid JSON.`;

  const userPrompt = `Extract from: "${message}"
Return this exact structure:
{
  "educationLevel": "middle_school" or "high_school" or "college" or "working" or null,
  "interests": [array of subject interests mentioned],
  "careerGoals": [array of career goals mentioned],
  "location": "Oahu" or "Maui" or "Big Island" or "Kauai" or null
}`;

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

    // Clean and parse JSON
    const cleaned = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Profile extraction error:", error);
  }

  // Return default profile
  return {
    educationLevel: null,
    interests: extractKeywords(message),
    careerGoals: [],
    location: null,
  };
}

/**
 * MAIN ORCHESTRATOR - Coordinates the entire process
 */
export async function processUserQuery(
  message: string,
  Tools: any,
  conversationHistory: any[] = [],
  profile: UserProfile
): Promise<{
  response: string;
  data: any;
  profile: UserProfile;
  toolsUsed: string[];
}> {
  try {
    // 1. Use the passed profile (no need to extract again)
    // If profile is incomplete, enhance it with additional extraction
    let enhancedProfile = profile;
    if (
      !profile ||
      (!profile.interests.length && !profile.careerGoals.length)
    ) {
      const extractedProfile = await extractProfile(message);
      enhancedProfile = {
        ...(profile || {}),
        interests:
          profile?.interests?.length > 0
            ? profile.interests
            : extractedProfile.interests,
        careerGoals:
          profile?.careerGoals?.length > 0
            ? profile.careerGoals
            : extractedProfile.careerGoals,
        educationLevel:
          profile?.educationLevel || extractedProfile.educationLevel,
        location: profile?.location || extractedProfile.location,
      };
    }

    // 2. Plan tool calls
    const toolCalls = await planToolCalls(
      message,
      enhancedProfile,
      conversationHistory
    );

    // 3. Execute tools
    const { results, collectedData } = await executeToolCalls(toolCalls, Tools);

    // 3.5. Extract the search intent from the enhanced profile interests or tool calls
    // This assumes the first interest or keyword is the intent
    const extractedIntent =
      enhancedProfile.interests[0] || extractKeywords(message)[0];

    // 3.5. VERIFY RESULTS - Pass extractedIntent
    const verifiedData = await verifyResults(
      message,
      collectedData,
      conversationHistory, // ADD THIS
      extractedIntent // ADD THIS
    );

    // 4. Generate response using Response Formatter Agent
    const response = await generateResponse(
      message,
      results,
      verifiedData,
      conversationHistory,
      enhancedProfile
    );

    // 5. Return complete results
    return {
      response,
      data: verifiedData,
      profile: enhancedProfile,
      toolsUsed: toolCalls.map(tc => tc.name),
    };
  } catch (error) {
    console.error("Orchestrator error:", error);

    // Fallback response
    return {
      response:
        "I can help you explore educational pathways in Hawaii. Could you tell me more about what specific programs or careers you're interested in?",
      data: {
        highSchoolPrograms: [],
        collegePrograms: [],
        careers: [],
        cipMappings: [],
        schools: [],
        campuses: [],
      },
      profile: {
        educationLevel: null,
        interests: [],
        careerGoals: [],
        location: null,
      },
      toolsUsed: [],
    };
  }
}

/**
 * Export all functions for use in application
 */
export { extractKeywords, parseToolCalls };
export type { ToolCall, ToolResult, CollectedData, UserProfile };
