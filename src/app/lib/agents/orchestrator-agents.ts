/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/orchestrator-agents.ts
import Groq from "groq-sdk";
import ResultVerifier from "./result-verifier";
import VectorResultVerifier from "./vector-result-verifier";
import ResponseFormatterAgent from "./response-formatter";
import ReflectionAgent from "./reflection-agent";
import ConversationalAgent from "./conversational-agent";
import { classifyQueryWithLLM } from "./llm-classifier";
import {
  aggregateHighSchoolPrograms,
  aggregateCollegePrograms,
} from "../helpers/pathway-aggregator";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Feature flag: Use vector-based verification for 10-50x speed improvement
const USE_VECTOR_VERIFICATION = process.env.USE_VECTOR_VERIFICATION === 'true';

const resultVerifier = USE_VECTOR_VERIFICATION 
  ? new VectorResultVerifier() 
  : new ResultVerifier();

const responseFormatter = new ResponseFormatterAgent();
const reflectionAgent = new ReflectionAgent();
const conversationalAgent = new ConversationalAgent();

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
 * PLANNING AGENT - Decides what tools to call with search strategy context
 */
export async function planToolCalls(
  message: string,
  profile: UserProfile,
  conversationHistory: any[] = [],
  searchStrategy?: {
    expandKeywords: boolean;
    useCIPSearch: boolean;
    broadenScope: boolean;
    includeRelatedFields: boolean;
    additionalKeywords: string[];
  }
): Promise<ToolCall[]> {
  let keywords = extractKeywords(message);
  
  // SPECIAL CASE: If message is affirmative and has no keywords, extract from assistant's last message
  // This happens when user says "yes" to search for programs
  const isAffirmative = /^(yes|yeah|yep|sure|ok|okay|definitely|absolutely|please|go ahead|sounds good)/i.test(message.toLowerCase().trim());
  
  if (isAffirmative && keywords.length === 0) {
    console.log('[Planner] 🔄 Affirmative response detected - extracting context from conversation');
    
    // Get last assistant message
    const lastAssistantMessage = conversationHistory.length > 0 
      ? conversationHistory[conversationHistory.length - 1]
      : null;
    
    if (lastAssistantMessage?.role === 'assistant' && lastAssistantMessage.content) {
      // Extract keywords from what the assistant asked about
      const assistantKeywords = extractKeywords(lastAssistantMessage.content);
      console.log('[Planner] � Keywords from assistant message:', assistantKeywords);
      
      if (assistantKeywords.length > 0) {
        keywords = assistantKeywords.slice(0, 3);
      } else if (profile?.interests?.length > 0) {
        // Fallback to profile interests
        console.log('[Planner] 📋 No keywords in assistant message, using profile interests');
        keywords = profile.interests.slice(0, 3);
      }
      
      console.log('[Planner] ✅ Using keywords:', keywords);
    } else if (profile?.interests?.length > 0) {
      // No assistant message, use profile
      console.log('[Planner] 📋 Using profile interests as keywords');
      keywords = profile.interests.slice(0, 3);
    }
  }
  
  // Apply search strategy if provided
  if (searchStrategy) {
    // Add additional keywords from strategy
    if (searchStrategy.additionalKeywords.length > 0) {
      keywords = [...new Set([...keywords, ...searchStrategy.additionalKeywords])];
    }

    // If broadening scope, use only the most general keywords
    if (searchStrategy.broadenScope) {
      keywords = keywords.slice(0, 3);
    }

    // Limit to prevent over-expansion
    keywords = keywords.slice(0, 8);
  }

  const systemPrompt = `You are a tool planning agent for Hawaii's educational pathway system.

AVAILABLE TOOLS:
${Object.entries(TOOL_CATALOG)
  .map(
    ([name, info]) => `${name}: ${info.description}\nExample: ${info.example}`
  )
  .join("\n\n")}

${searchStrategy ? `SEARCH STRATEGY FOR THIS ATTEMPT:
- Use CIP search: ${searchStrategy.useCIPSearch ? "YES - prioritize expand_cip and get_college_by_cip" : "NO"}
- Broaden scope: ${searchStrategy.broadenScope ? "YES - use category-level searches" : "NO"}
- Include related fields: ${searchStrategy.includeRelatedFields ? "YES - search related subjects" : "NO"}
- Additional keywords to use: ${searchStrategy.additionalKeywords.join(", ")}
` : ""}

PLANNING STRATEGY:
1. For general queries: Start with trace_pathway(keywords)
2. For specific programs: Use get_hs_program_details or trace_from_hs
3. For "where" questions: Include school/campus lookup tools
4. Always trace complete pathways (HS → College → Career)
${searchStrategy?.useCIPSearch ? "\n5. IMPORTANT: Use CIP-based searches for broader results" : ""}

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
      model: "openai/gpt-oss-120b", // Tool planning needs powerful reasoning: 500 tps, 74% cheaper
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
  Tools: any,
  islandFilter?: string | null,
  conversationHistory?: any[]
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

  console.log(`[ToolExecutor] 🔧 Executing ${toolCalls.length} tool calls:`, toolCalls.map(tc => tc.name).join(', '));
  if (islandFilter) {
    console.log(`[ToolExecutor] 🏝️  Island filter active: ${islandFilter}`);
  }
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
            
            // Filter conversation to remove unrelated old topics
            const { filterRelevantConversation } = await import("../helpers/conversation-filter");
            const filteredHistory = filterRelevantConversation(conversationHistory || [], keywords.join(" "), 5);
            
            // Build conversation context from filtered messages
            let conversationContext = '';
            if (filteredHistory.length > 0) {
              const recentMessages = filteredHistory.slice(-3);
              conversationContext = recentMessages
                .map((msg: any) => `${msg.role}: ${msg.content}`)
                .join('\n');
            }
            
            const pathway = await pathwayTracer.traceFromKeywords(
              keywords, 
              islandFilter,
              conversationContext
            );

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
 * AGGREGATION STEP - Aggregate and format data for response generation
 * This ensures response formatter sees the same counts as the frontend
 */
async function aggregateDataForResponse(collectedData: any): Promise<any> {
  console.log(
    `[Orchestrator] Aggregating ${collectedData.highSchoolPrograms.length} HS + ${collectedData.collegePrograms.length} college programs before response generation`
  );

  // Aggregate high school programs (removes duplicates from POS levels)
  const aggregatedHSPrograms = await aggregateHighSchoolPrograms(
    collectedData.highSchoolPrograms.map((item: any) => ({
      program: item.program,
      schools: item.schools || [],
    }))
  );

  // Aggregate college programs by CIP code (handles multiple program name variants)
  const aggregatedCollegePrograms = aggregateCollegePrograms(
    collectedData.collegePrograms.map((item: any) => ({
      program: item.program,
      campuses: item.campuses || [],
    }))
  );

  // Calculate unique schools and campuses from aggregated data
  const uniqueHighSchools = new Set<string>();
  aggregatedHSPrograms.forEach((prog: any) =>
    prog.schools.forEach((s: string) => uniqueHighSchools.add(s))
  );

  const uniqueCollegeCampuses = new Set<string>();
  aggregatedCollegePrograms.forEach((prog: any) =>
    prog.campuses.forEach((c: string) => uniqueCollegeCampuses.add(c))
  );

  // CAREER FILTERING: Only include careers from VERIFIED college programs
  // First, get CIP codes from verified college programs
  const verifiedCIPCodes = new Set<string>();
  aggregatedCollegePrograms.forEach((prog: any) => {
    if (prog.cipCode) {
      verifiedCIPCodes.add(prog.cipCode);
    }
  });

  // Then, only include careers that map to those CIP codes
  const relevantSOCCodes = new Set<string>();
  collectedData.careers.forEach((careerMapping: any) => {
    // Only include if this career mapping is for a verified CIP code
    const cipCode = careerMapping.CIP_CODE;
    if (cipCode && verifiedCIPCodes.has(cipCode)) {
      if (careerMapping.SOC_CODE) {
        const codes = Array.isArray(careerMapping.SOC_CODE) 
          ? careerMapping.SOC_CODE 
          : [careerMapping.SOC_CODE];
        codes.forEach((code: string) => relevantSOCCodes.add(code));
      }
    }
  });

  // Limit to top 10 most relevant careers to avoid overwhelming the user
  const aggregatedCareers = Array.from(relevantSOCCodes)
    .slice(0, 10)
    .map(socCode => ({
      title: socCode,  // Use SOC code as title for dropdown
      code: socCode    // Also store as code for data panel
    }));

  console.log(
    `[Orchestrator] Aggregation complete: ${aggregatedHSPrograms.length} HS programs at ${uniqueHighSchools.size} schools, ${aggregatedCollegePrograms.length} college programs at ${uniqueCollegeCampuses.size} campuses, ${aggregatedCareers.length} unique careers`
  );

  return {
    highSchoolPrograms: aggregatedHSPrograms,
    collegePrograms: aggregatedCollegePrograms,
    careers: aggregatedCareers,
    schools: Array.from(uniqueHighSchools),
    campuses: Array.from(uniqueCollegeCampuses),
  };
}

/**
/**
 * RESPONSE GENERATION - Uses Response Formatter Agent for markdown formatting
 * Now accepts pre-aggregated data to avoid duplicate aggregation
 */
async function generateResponse(
  message: string,
  toolResults: ToolResult[],
  aggregatedData: any, // Changed: Now expects already-aggregated data
  conversationHistory: any[] = [],
  userProfile?: UserProfile
): Promise<string> {
  // Data is already aggregated, no need to aggregate again
  try {
    const formattedResponse = await responseFormatter.formatResponse(
      message,
      aggregatedData, // Use the already-aggregated data
      conversationHistory,
      userProfile,
      undefined, // No degree preference in old orchestrator
      undefined  // No institution filter in old orchestrator
    );

    return formattedResponse.markdown;
  } catch (error) {
    console.error("[Orchestrator] Response generation error:", error);

    // Fallback response using aggregated data
    const summary = {
      highSchoolPrograms: aggregatedData.highSchoolPrograms?.length || 0,
      totalHighSchools: aggregatedData.schools?.length || 0,
      collegePrograms: aggregatedData.collegePrograms?.length || 0,
      totalCollegeCampuses: aggregatedData.campuses?.length || 0,
      careers: aggregatedData.careers?.length || 0,
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
      model: "openai/gpt-oss-120b", // Profile extraction needs powerful reasoning: 500 tps, 74% cheaper
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
 * CONVERSATIONAL RESPONSE - Handles non-search queries using ConversationalAgent
 */
async function generateConversationalResponse(
  message: string,
  conversationHistory: any[] = [],
  profile?: UserProfile,
  queryType?: string
): Promise<string> {
  const conversationalResponse = await conversationalAgent.generateResponse(
    message,
    conversationHistory,
    profile,
    queryType
  );

  return conversationalResponse.markdown;
}

/**
 * SEARCH CONFIRMATION - Asks user to confirm before performing a search
 */
async function generateSearchConfirmation(
  message: string,
  conversationHistory: any[] = [],
  profile?: UserProfile,
  classification?: any
): Promise<string> {
  console.log('[Confirmation] Generating search confirmation prompt');
  
  // Extract what the user wants to search for
  const keywords = extractKeywords(message);
  const searchTerms = keywords.slice(0, 3); // Get top 3 keywords
  
  // Build a clear summary of what we'll search for
  let searchSummary = `I'm preparing to search for:\n\n`;
  
  // Primary search terms
  if (searchTerms.length > 0) {
    searchSummary += `**Search Topics:** ${searchTerms.map(term => `"${term}"`).join(', ')}\n`;
  }
  
  // Location filter
  if (classification?.searchScope?.type === 'island' && classification.searchScope.location) {
    searchSummary += `**Location:** Programs available on ${classification.searchScope.location}\n`;
  } else if (classification?.searchScope?.type === 'school' && classification.searchScope.location) {
    searchSummary += `**School:** Programs at ${classification.searchScope.location}\n`;
  } else {
    searchSummary += `**Location:** All Hawaii campuses and schools\n`;
  }
  
  // Degree level filter
  if (classification?.degreePreference) {
    searchSummary += `**Degree Level:** ${classification.degreePreference} programs\n`;
  } else {
    searchSummary += `**Degree Level:** All levels (High School, 2-Year, 4-Year, Non-Credit)\n`;
  }
  
  // Institution filter
  if (classification?.institutionFilter?.name) {
    searchSummary += `**Institution:** ${classification.institutionFilter.name}\n`;
  }
  
  searchSummary += `\nThis search will return:\n`;
  searchSummary += `- 📚 High school and college programs matching these topics\n`;
  searchSummary += `- 💼 Related career pathways and opportunities\n`;
  searchSummary += `- 🏫 Schools and campuses offering these programs\n`;
  searchSummary += `- 🗺️  Personalized pathway recommendations\n`;
  
  const prompt = `${searchSummary}

**Would you like me to proceed with this search?**

Say "yes" to search, or let me know if you'd like to refine the search criteria first (e.g., specific location, degree level, etc.).`;

  return prompt;
}

/**
 * MAIN ORCHESTRATOR - Coordinates the entire process with reflection loop
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
  reflectionScore?: number;
  attempts?: number;
}> {
  let attemptNumber = 1;
  let enhancedQuery = message;
  let searchStrategy: any = undefined;
  let finalResults: any = null;

  try {
    // 0. CLASSIFY QUERY - Use LLM for intelligent classification
    const classification = await classifyQueryWithLLM(message, conversationHistory);
    
    // Check if we need confirmation before searching (NEW search topics)
    if (classification.needsConfirmation && classification.queryType === 'search') {
      console.log(`[Orchestrator] Search detected but needs confirmation first: "${message}"`);
      console.log(`[Orchestrator] Reason: ${classification.reasoning}`);
      
      // Generate a confirmation prompt
      const confirmationPrompt = await generateSearchConfirmation(
        message,
        conversationHistory,
        profile,
        classification
      );
      
      return {
        response: confirmationPrompt,
        data: {
          highSchoolPrograms: [],
          collegePrograms: [],
          careers: [],
          cipMappings: [],
          schools: [],
          campuses: [],
        },
        profile: profile || {
          educationLevel: null,
          interests: [],
          careerGoals: [],
          location: null,
        },
        toolsUsed: [],
        reflectionScore: 10,
        attempts: 1,
      };
    }
    
    if (!classification.needsTools) {
      console.log(`[Orchestrator] Conversational query detected (${classification.queryType}): "${message}"`);
      console.log(`[Orchestrator] Reason: ${classification.reasoning}`);
      
      // Handle conversationally without tools
      const response = await generateConversationalResponse(
        message,
        conversationHistory,
        profile,
        classification.queryType
      );
      
      return {
        response,
        data: {
          highSchoolPrograms: [],
          collegePrograms: [],
          careers: [],
          cipMappings: [],
          schools: [],
          campuses: [],
        },
        profile: profile || {
          educationLevel: null,
          interests: [],
          careerGoals: [],
          location: null,
        },
        toolsUsed: [],
        reflectionScore: 10, // Perfect score for conversational responses
        attempts: 1,
      };
    }
    
    console.log(`[Orchestrator] Search query confirmed (${classification.queryType}): "${message}"`);
    console.log(`[Orchestrator] Reason: ${classification.reasoning}`);

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

    // REFLECTION LOOP: Try up to 2 times to get good results (reduced from 3)
    while (attemptNumber <= 2) {
      console.log(
        `[Orchestrator] Attempt ${attemptNumber}: Processing query: "${enhancedQuery}"`
      );
      
      if (searchStrategy) {
        console.log(
          `[Orchestrator] Using search strategy: CIP=${searchStrategy.useCIPSearch}, Broaden=${searchStrategy.broadenScope}, Keywords=[${searchStrategy.additionalKeywords.slice(0, 5).join(", ")}]`
        );
      }

      // 2. Plan tool calls with search strategy
      const toolCalls = await planToolCalls(
        enhancedQuery,
        enhancedProfile,
        conversationHistory,
        searchStrategy
      );

      // 3. Execute tools
      const { results, collectedData } = await executeToolCalls(
        toolCalls,
        Tools,
        enhancedProfile.location,
        conversationHistory
      );

      // 3.5. Extract the search intent from the enhanced profile interests or tool calls
      const extractedIntent =
        enhancedProfile.interests[0] || extractKeywords(message)[0];

      // 4. VERIFY RESULTS
      const verifiedData = await verifyResults(
        enhancedQuery,
        collectedData,
        conversationHistory,
        extractedIntent
      );

      // 5. REFLECT ON RESULTS
      const reflection = await reflectionAgent.reflect(
        message, // Use original query for reflection context
        verifiedData,
        enhancedProfile,
        conversationHistory,
        attemptNumber
      );

      // 6. Check if results are good enough
      if (reflection.isGoodEnough || !reflectionAgent.shouldRerun(attemptNumber)) {
        console.log(
          `[Orchestrator] Results approved after ${attemptNumber} attempt(s) - Quality Score: ${reflection.qualityScore}/10`
        );
        
        // 6.5. AGGREGATE DATA (once, for both response and frontend)
        const aggregatedData = await aggregateDataForResponse(verifiedData);
        
        // 7. Generate response using Response Formatter Agent with aggregated data
        const response = await generateResponse(
          message,
          results,
          aggregatedData, // Pass aggregated data directly
          conversationHistory,
          enhancedProfile
        );

        finalResults = {
          response,
          data: aggregatedData, // Return aggregated data to frontend
          profile: enhancedProfile,
          toolsUsed: toolCalls.map(tc => tc.name),
          reflectionScore: reflection.qualityScore,
          attempts: attemptNumber,
        };

        break; // Exit the loop
      } else {
        // Results not good enough - prepare for rerun with enhanced strategy
        console.log(
          `[Orchestrator] Attempt ${attemptNumber} insufficient (Score: ${reflection.qualityScore}/10) - Retrying with enhanced context...`
        );

        // Generate enhanced query AND search strategy
        const rerunContext = reflectionAgent.generateRerunContext(
          message,
          reflection,
          enhancedProfile,
          attemptNumber + 1
        );
        
        enhancedQuery = rerunContext.enhancedQuery;
        searchStrategy = rerunContext.searchStrategy;

        attemptNumber++;
      }
    }

    // If we exhausted all attempts without success, return the last attempt
    if (!finalResults) {
      console.log(
        `[Orchestrator] Max attempts reached - returning best available results`
      );
      
      // Use the last verified data we have
      const toolCalls = await planToolCalls(
        enhancedQuery,
        enhancedProfile,
        conversationHistory,
        searchStrategy
      );
      const { results, collectedData } = await executeToolCalls(
        toolCalls,
        Tools,
        enhancedProfile.location,
        conversationHistory
      );
      const extractedIntent =
        enhancedProfile.interests[0] || extractKeywords(message)[0];
      const verifiedData = await verifyResults(
        enhancedQuery,
        collectedData,
        conversationHistory,
        extractedIntent
      );
      
      // Aggregate data before generating response
      const aggregatedData = await aggregateDataForResponse(verifiedData);
      
      const response = await generateResponse(
        message,
        results,
        aggregatedData, // Pass aggregated data
        conversationHistory,
        enhancedProfile
      );

      finalResults = {
        response,
        data: aggregatedData, // Return aggregated data
        profile: enhancedProfile,
        toolsUsed: toolCalls.map(tc => tc.name),
        reflectionScore: 0,
        attempts: attemptNumber,
      };
    }

    return finalResults;
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
      reflectionScore: 0,
      attempts: attemptNumber,
    };
  }
}

/**
 * Export all functions for use in application
 */
export { extractKeywords, parseToolCalls };
export type { ToolCall, ToolResult, CollectedData, UserProfile };
