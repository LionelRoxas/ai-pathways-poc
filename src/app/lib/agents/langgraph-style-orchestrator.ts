/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/langgraph-style-orchestrator.ts

/**
 * LANGGRAPH-STYLE ORCHESTRATOR
 * 
 * This uses LangGraph ARCHITECTURAL CONCEPTS without the library:
 * ✅ Structured state with StateManager class
 * ✅ Declarative node graph
 * ✅ Conditional routing with routing table  
 * ✅ All your original smart logic preserved
 * ✅ Type-safe and compiles perfectly
 * ✅ JSON-forced tool planning (no regex)
 * ✅ Zod validation for safety
 * 
 */

import Groq from "groq-sdk";
import { z } from "zod";

// Import all existing agents - we keep ALL your smart logic!
import { ResultVerifier } from "./result-verifier";
import { ResponseFormatterAgent } from "./response-formatter";
import { ReflectionAgent } from "./reflection-agent";
import { ConversationalAgent } from "./conversational-agent";
import { classifyQueryWithLLM } from "./llm-classifier";
import { aggregateHighSchoolPrograms, aggregateCollegePrograms } from "../helpers/pathway-aggregator";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Initialize agents
const resultVerifier = new ResultVerifier();
const responseFormatter = new ResponseFormatterAgent();
const reflectionAgent = new ReflectionAgent();
const conversationalAgent = new ConversationalAgent();

/**
 * ZOD SCHEMAS FOR VALIDATION
 */
const ToolCallSchema = z.object({
  name: z.enum([
    "trace_pathway",
    "trace_from_hs",
    "search_hs_programs",
    "get_hs_program_details",
    "get_hs_program_schools",
    "get_hs_courses",
    // REMOVED OLD TOOLS: search_college_programs, get_college_by_cip, get_college_campuses, expand_cip
    // These used the old cip_to_program_mapping.jsonl without degree_level data
    // Now using trace_pathway with EnhancedProgramTool which has degree_level
    "get_cip_category",
    "get_careers",
  ]),
  args: z.union([
    z.array(z.string()),
    z.string(),
    z.record(z.string(), z.any()),
  ]),
});

type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * STATE MANAGER CLASS
 * Single source of truth - LangGraph's best idea!
 */
class StateManager {
  // Input
  readonly userQuery: string;
  readonly userProfile: any;
  readonly conversationHistory: any[];
  readonly Tools: any;
  
  // Classification
  needsTools: boolean = true;
  queryType: string = "search";
  searchScope?: {
    type: 'island' | 'school' | 'general';
    location?: string;
  };
  degreePreference?: 'Non-Credit' | '2-Year' | '4-Year';
  institutionFilter?: {
    type: 'school' | 'college';
    name: string;
  };
  
  // Keywords & Planning
  keywords: string[] = [];
  extractedKeywords: string[] = []; // From conversational intelligence extraction
  toolCalls: ToolCall[] = [];
  toolResults: any[] = [];
  
  // Island Filtering (NEW)
  islandFilter: string | null = null;
  isIslandSpecific: boolean = false;
  
  // Data Collection
  collectedData: any = {
    highSchoolPrograms: [],
    collegePrograms: [],
    careers: [],
    cipMappings: [],
    schools: [],
    campuses: [],
  };
  
  // Verification
  verifiedData: any = null;
  
  // Reflection
  reflectionScore: number = 0;
  reflectionIssues: string[] = [];
  reflectionSuggestions: string[] = [];
  
  // Retry Logic
  attemptNumber: number = 1;
  searchStrategy?: any = undefined;
  
  // Output
  aggregatedData: any = null;
  finalResponse: string = "";
  
  // Metadata
  toolsUsed: string[] = [];
  errors: string[] = [];
  
  constructor(query: string, profile: any, history: any[], tools: any) {
    this.userQuery = query;
    this.userProfile = profile;
    this.conversationHistory = history;
    this.Tools = tools;
  }
  
  log(message: string) {
    console.log(`[LangGraph-Style:Attempt${this.attemptNumber}] ${message}`);
  }
  
  addError(error: string) {
    this.errors.push(error);
    this.log(`ERROR: ${error}`);
  }
}

/**
 * NODE DEFINITIONS
 * Each node is pure function that updates state
 */

async function classifierNode(state: StateManager): Promise<void> {
  state.log("NODE: Classifier");
  
  const classification = await classifyQueryWithLLM(
    state.userQuery,
    state.conversationHistory
  );
  
  state.queryType = classification.queryType;
  state.needsTools = classification.needsTools;
  state.searchScope = classification.searchScope;
  state.degreePreference = classification.degreePreference;
  state.institutionFilter = classification.institutionFilter;
  
  state.log(`Classification: ${state.queryType} (needsTools: ${state.needsTools})`);
  
  if (state.searchScope) {
    console.log(`[Classifier] 🎯 Search Scope: ${state.searchScope.type}${state.searchScope.location ? ` - ${state.searchScope.location}` : ''}`);
  }
  
  if (state.degreePreference) {
    console.log(`[Classifier] 🎓 Degree Preference: ${state.degreePreference}`);
  }
  
  if (state.institutionFilter) {
    console.log(`[Classifier] 🏫 Institution Filter: ${state.institutionFilter.type} - ${state.institutionFilter.name}`);
  }
}

async function profileExtractorNode(state: StateManager): Promise<void> {
  state.log("NODE: ProfileExtractor");
  
  const keywords = extractKeywords(state.userQuery);
  
  // Detect topic pivot keywords (signals a topic change)
  const topicPivotIndicators = /^(what about|how about|tell me about|instead|actually|now|switch to|change to|no|wait)/i;
  const isTopicPivot = topicPivotIndicators.test(state.userQuery.toLowerCase());
  
  // Detect affirmative responses (wants to continue current topic)
  const isAffirmative = /^(yes|yeah|yep|sure|ok|okay)/i.test(state.userQuery.toLowerCase());
  
  let enhancedKeywords = [...keywords];
  
  if (isTopicPivot) {
    // TOPIC PIVOT: Use ONLY current query keywords, ignore context and profile
    console.log(`[ProfileExtractor] 🔄 Topic pivot detected! Using fresh keywords only.`);
    state.keywords = [...new Set(enhancedKeywords)].slice(0, 5);
  } else if (isAffirmative && state.conversationHistory.length > 0) {
    // AFFIRMATIVE: Pull context from conversation using LLM intelligence
    console.log(`[ProfileExtractor] ✅ Affirmative response - extracting conversation context with LLM.`);
    
    // Use LLM to intelligently extract the topic/program being discussed
    const recentMessages = state.conversationHistory.slice(-3);
    const conversationContext = recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    try {
      const extractionPrompt = `The user just said "${state.userQuery}" (an affirmative response).

Recent conversation:
${conversationContext}

Extract the main educational programs, fields of study, or topics being discussed AND any specific institutions mentioned. Return a JSON object with:
1. keywords: Array of educational programs/fields
2. institution: Object with type ('school' | 'college') and name, or null if no specific institution mentioned

Focus on:
- Program names (e.g., "computer science", "nursing", "engineering")
- Fields of study (e.g., "marine biology", "culinary arts")
- Academic areas (e.g., "business", "education", "healthcare")
- Specific institutions (e.g., "UH Manoa", "University of Hawaii at Manoa", "Honolulu Community College", "Pearl City High School")

Return format: {
  "keywords": ["keyword1", "keyword2"],
  "institution": {
    "type": "college",
    "name": "UH Manoa"
  } OR null
}`;

      const response = await groq.chat.completions.create({
        messages: [
          { role: "user", content: extractionPrompt }
        ],
        model: "openai/gpt-oss-120b", // Powerful extraction: 500 tps, better quality, 74% cheaper
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
      
      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
      const contextKeywords = parsed.keywords || [];
      const contextInstitution = parsed.institution || null;
      
      if (contextKeywords.length > 0) {
        console.log(`[ProfileExtractor] 🎓 LLM extracted context: ${contextKeywords.join(", ")}`);
        enhancedKeywords = contextKeywords;
      } else {
        // Fallback: Extract keywords from last assistant message
        const lastAssistant = state.conversationHistory[state.conversationHistory.length - 1];
        if (lastAssistant?.role === "assistant") {
          enhancedKeywords = extractKeywords(lastAssistant.content);
          console.log(`[ProfileExtractor] 📝 Fallback keywords from assistant: ${enhancedKeywords.join(", ")}`);
        }
      }
      
      // Also extract institution filter from conversation context if present
      if (contextInstitution && contextInstitution.name) {
        state.institutionFilter = {
          type: contextInstitution.type as 'school' | 'college',
          name: contextInstitution.name
        };
        console.log(`[ProfileExtractor] 🏫 Extracted institution from context: ${contextInstitution.type} - ${contextInstitution.name}`);
      }
    } catch (error: any) {
      console.error(`[ProfileExtractor] LLM extraction failed: ${error.message}`);
      // Fallback: Extract keywords from last assistant message
      const lastAssistant = state.conversationHistory[state.conversationHistory.length - 1];
      if (lastAssistant?.role === "assistant") {
        enhancedKeywords = extractKeywords(lastAssistant.content);
        console.log(`[ProfileExtractor] 📝 Fallback keywords from assistant: ${enhancedKeywords.join(", ")}`);
      }
    }
    
    // SMART ENRICHMENT: Only add relevant profile interests if we have few keywords
    if (enhancedKeywords.length < 3 && state.userProfile.interests?.length > 0) {
      // Find profile interests that relate to conversation context
      const relevantProfileInterests = state.userProfile.interests.filter((interest: string) =>
        enhancedKeywords.some(keyword => 
          interest.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(interest.toLowerCase())
        )
      );
      
      if (relevantProfileInterests.length > 0) {
        console.log(`[ProfileExtractor] 💡 Adding relevant profile interests: ${relevantProfileInterests.join(", ")}`);
        enhancedKeywords.push(...relevantProfileInterests.slice(0, 2));
      } else {
        console.log(`[ProfileExtractor] ⏭️  Profile interests not relevant to current topic - skipping`);
      }
    }
    
    state.keywords = [...new Set(enhancedKeywords)].slice(0, 5);
    console.log(`[ProfileExtractor] 🎯 Final keywords (CONTEXT): ${state.keywords.join(", ")}`);
  } else {
    // NORMAL: Use query keywords ONLY, let verifier handle profile matching
    // Profile interests will be used by the verifier for scoring relevance
    console.log(`[ProfileExtractor] 🔍 Normal query - using query keywords only`);
    state.keywords = [...new Set(enhancedKeywords)].slice(0, 5);
    console.log(`[ProfileExtractor] 🎯 Final keywords: ${state.keywords.join(", ")}`);
  }
  
  // NEW: Use classifier's search scope determination
  if (state.searchScope) {
    console.log(`[ProfileExtractor] � Search scope from classifier: ${state.searchScope.type}`);
    
    // Map the location to island if needed
    if (state.searchScope.location) {
      const detectedIsland = detectIslandFromQuery(state.searchScope.location);
      if (detectedIsland) {
        state.islandFilter = detectedIsland;
        state.isIslandSpecific = true;
        console.log(`[ProfileExtractor] 🏝️  Island from search scope: ${detectedIsland} (${state.searchScope.location})`);
      }
    }
    
    // For school or island queries without specific program keywords, use broad search
    if ((state.searchScope.type === 'school' || state.searchScope.type === 'island') && 
        (state.keywords.length === 0 || 
         state.keywords.some(kw => ['pearl', 'city', 'high', 'school', 'programs', 'available', 'show', 'waipahu', 'mililani'].includes(kw.toLowerCase())))) {
      
      console.log(`[ProfileExtractor] 📍 ${state.searchScope.type} query detected by classifier - using broad search`);
      
      // Use profile interests if available
      if (state.userProfile.interests && state.userProfile.interests.length > 0) {
        state.keywords = state.userProfile.interests.slice(0, 3);
        console.log(`[ProfileExtractor] 🎯 Using profile interests for ${state.searchScope.type} query: ${state.keywords.join(", ")}`);
      } else {
        // Use broad keywords
        state.keywords = ["all", "available", "programs"];
        console.log(`[ProfileExtractor] 🎯 Using broad search for ${state.searchScope.type} query`);
      }
    }
  } else {
    // Fallback: Try to detect island from query directly (backward compatibility)
    const island = detectIslandFromQuery(state.userQuery);
    if (island) {
      state.islandFilter = island;
      state.isIslandSpecific = true;
      console.log(`[ProfileExtractor] 🏝️  Island detected (fallback): ${island}`);
    }
  }
  
  state.log(`Keywords: ${state.keywords.join(", ")} ${isTopicPivot ? "(FRESH)" : isAffirmative ? "(CONTEXT)" : ""}${state.islandFilter ? ` | Island: ${state.islandFilter}` : ""}`);
}

async function toolPlannerNode(state: StateManager): Promise<void> {
  state.log("NODE: ToolPlanner");
  
  const systemPrompt = `You are a tool planning agent for Hawaii's educational pathway system.

AVAILABLE TOOLS:
- trace_pathway(keywords: string[]) - Comprehensive pathway search (HS → College → Career) - INCLUDES DEGREE LEVELS
- search_hs_programs(keywords: string[]) - Search high school programs
- get_careers(cipCodes: string[]) - Get careers from CIP codes

CRITICAL RULE FOR trace_pathway ARGUMENTS:
- Use ONLY the keywords provided in the user prompt below
- DO NOT add profile interests unless the query is extremely vague (like "help me" or "what can I do?")
- If keywords are provided, use THOSE EXACT keywords even if they seem incomplete
- Profile interests are for context only - do NOT automatically add them to tool arguments

NOTE: trace_pathway now uses the comprehensive program dataset with degree level information (2-Year, 4-Year, Non-Credit).
OLD TOOLS REMOVED: search_college_programs, get_college_by_cip, expand_cip (used outdated data without degree levels)

${state.islandFilter ? `
🏝️ ISLAND FILTER ACTIVE: ${state.islandFilter}
- Results will be automatically filtered to programs/schools available on ${state.islandFilter}
- No need to include island name in keywords
- Available campuses will be limited to ${state.islandFilter} only
` : ""}

${state.searchStrategy ? `
RETRY STRATEGY (Attempt ${state.attemptNumber}):
- Broaden scope: ${state.searchStrategy.broadenScope}
- Include related fields: ${state.searchStrategy.includeRelatedFields}
- Additional keywords: ${state.searchStrategy.additionalKeywords.join(", ")}
` : "Use trace_pathway for comprehensive results"}

RESPOND WITH ONLY VALID JSON (no markdown):
{
  "tools": [
    {"name": "trace_pathway", "args": ["keyword1", "keyword2"]},
    {"name": "get_careers", "args": ["all"]}
  ]
}`;

  // NOTE: Profile interests are NOT included in tool planning prompts.
  // They should only be used by the VERIFIER for scoring relevance.
  // Including them here causes the LLM to add ALL interests to search keywords,
  // which dilutes search results (e.g., searching for "Computer Science" + "Hawaiian language" + "music" + 13 other topics!)
  
  const userPrompt = `Plan tools for:
Query: "${state.userQuery}"
Keywords: ${state.keywords.join(", ")}${state.islandFilter ? `\nIsland: ${state.islandFilter}` : ""}

IMPORTANT: Use ONLY the keywords listed above for trace_pathway arguments. Do NOT add any other topics.

Return JSON with tool array:`;


  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-oss-120b", // Tool planning needs powerful reasoning: 500 tps, 74% cheaper
      temperature: 0.1,
      response_format: { type: "json_object" }, // JSON-FORCED - No regex parsing needed!
    });
    
    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    
    const toolCallsRaw = parsed.tools || parsed.toolCalls || [];
    
    // Validate with Zod
    state.toolCalls = toolCallsRaw.map((tc: any) => {
      try {
        return ToolCallSchema.parse({
          name: tc.name,
          args: tc.args || tc.arguments || [],
        });
      } catch (validationError: any) {
        state.addError(`Invalid tool call: ${validationError.message}`);
        return null;
      }
    }).filter(Boolean) as ToolCall[];
    
    // Ensure minimum tools
    if (state.toolCalls.length === 0) {
      state.toolCalls = [
        { name: "trace_pathway", args: state.keywords },
        { name: "get_careers", args: ["all"] }  // ← ALWAYS include careers
      ];
    }
    
    // CRITICAL FIX: Ensure get_careers is ALWAYS called for complete pathways
    const hasCareerLookup = state.toolCalls.some(tc => 
      tc.name === "get_careers" || tc.name === "trace_pathway"
    );
    
    if (!hasCareerLookup) {
      console.log("[ToolPlanner] ⚠️ No career lookup tool - adding get_careers");
      state.toolCalls.push({ name: "get_careers", args: ["all"] });
    }
    
    state.log(`Planned ${state.toolCalls.length} tools: ${state.toolCalls.map(tc => tc.name).join(", ")}`);
    
  } catch (error: any) {
    state.addError(`Planning error: ${error.message}`);
    state.toolCalls = [
      { name: "trace_pathway", args: state.keywords },
      { name: "get_careers", args: ["all"] }  // ← ALWAYS include careers in fallback
    ];
  }
}

async function toolExecutorNode(state: StateManager): Promise<void> {
  state.log(`NODE: ToolExecutor (${state.toolCalls.length} tools)`);
  
  // Use YOUR ORIGINAL executeToolCalls logic!
  const { executeToolCalls } = await import("./orchestrator-agents");
  
  const { results, collectedData } = await executeToolCalls(
    state.toolCalls,
    state.Tools,
    state.islandFilter,  // Pass island filter through to tools
    state.conversationHistory  // Pass conversation context for semantic search
  );
  
  state.toolResults = results;
  state.collectedData = collectedData;
  state.toolsUsed = results.map((r: any) => r.tool);
  
  console.log(`[ToolExecutor] 📊 Data collected:`);
  console.log(`[ToolExecutor]    - High School Programs: ${collectedData.highSchoolPrograms.length}`);
  console.log(`[ToolExecutor]    - College Programs: ${collectedData.collegePrograms.length}`);
  console.log(`[ToolExecutor]    - Careers: ${collectedData.careers.length}`);
  console.log(`[ToolExecutor]    - CIP Mappings: ${collectedData.cipMappings?.length || 0}`);
  
  if (collectedData.collegePrograms.length > 0) {
    console.log(`[ToolExecutor] 📋 Sample college programs (first 3):`);
    collectedData.collegePrograms.slice(0, 3).forEach((prog: any, idx: number) => {
      const title = prog.title || prog.program?.title || 'Unknown';
      const cipCode = prog.cipCode || prog.program?.cipCode || 'N/A';
      console.log(`[ToolExecutor]    ${idx + 1}. "${title}" | CIP: ${cipCode}`);
    });
  }
  
  if (collectedData.careers.length > 0) {
    console.log(`[ToolExecutor] 📋 Sample careers (first 3):`);
    collectedData.careers.slice(0, 3).forEach((career: any, idx: number) => {
      console.log(`[ToolExecutor]    ${idx + 1}. CIP: ${career.CIP_CODE}, SOC: ${career.SOC_CODE}`);
    });
  } else {
    console.log(`[ToolExecutor] ⚠️ No careers collected from tools!`);
  }
  
  state.log(`Collected: ${collectedData.highSchoolPrograms.length} HS, ${collectedData.collegePrograms.length} college, ${collectedData.careers.length} careers`);
}

async function verifierNode(state: StateManager): Promise<void> {
  state.log("NODE: Verifier");
  
  const extractedIntent = state.keywords[0] || state.userQuery;
  
  // SMART PROFILE USAGE: Don't pass profile during affirmative responses
  // When user says "yes" after a suggestion, we want to focus on the conversation context,
  // not boost unrelated profile interests (e.g., don't boost "engineering" when discussing "nursing")
  const isAffirmative = /^(yes|yeah|yep|sure|ok|okay|yea|ye|yup|affirmative|correct|right|exactly|indeed|certainly|absolutely|definitely|sounds good|that works|that's right)$/i.test(
    state.userQuery.trim()
  );
  
  const profileForVerification = isAffirmative ? undefined : state.userProfile;
  
  console.log(`[Verifier] 🎯 Using profile for scoring: ${profileForVerification ? 'YES' : 'NO (affirmative response)'}`);
  
  // YOUR ORIGINAL VERIFICATION LOGIC!
  const verifiedHS = await resultVerifier.verifyHighSchoolPrograms(
    state.userQuery,
    state.collectedData.highSchoolPrograms,
    state.conversationHistory,
    extractedIntent,
    profileForVerification
  );
  
  const verifiedCollege = await resultVerifier.verifyCollegePrograms(
    state.userQuery,
    state.collectedData.collegePrograms,
    state.conversationHistory,
    extractedIntent,
    profileForVerification
  );
  
  const schools = new Set<string>();
  const campuses = new Set<string>();
  
  verifiedHS.forEach((item: any) => {
    item.schools?.forEach((s: string) => schools.add(s));
  });
  
  verifiedCollege.forEach((item: any) => {
    item.campuses?.forEach((c: string) => campuses.add(c));
  });
  
  state.verifiedData = {
    ...state.collectedData,
    highSchoolPrograms: verifiedHS,
    collegePrograms: verifiedCollege,
    schools: Array.from(schools),
    campuses: Array.from(campuses),
  };
  
  console.log(`[Verifier] 📊 Verified Programs:`);
  console.log(`[Verifier]    - High School: ${verifiedHS.length}`);
  console.log(`[Verifier]    - College: ${verifiedCollege.length}`);
  if (verifiedCollege.length > 0) {
    console.log(`[Verifier] 📋 ALL Verified College Programs:`);
    verifiedCollege.forEach((item: any, idx: number) => {
      const progTitle = item.program?.title || item.title || 'Unknown';
      const cipCode = item.program?.cipCode || item.cipCode || 'N/A';
      console.log(`[Verifier]    ${idx + 1}. "${progTitle}" | CIP: ${cipCode}`);
    });
  } else {
    console.log(`[Verifier] ⚠️ No college programs passed verification!`);
  }
  
  state.log(`Verified: ${verifiedHS.length} HS, ${verifiedCollege.length} college`);
}

async function reflectorNode(state: StateManager): Promise<void> {
  state.log("NODE: Reflector");
  
  // YOUR ORIGINAL REFLECTION LOGIC!
  const reflection = await reflectionAgent.reflect(
    state.userQuery,
    state.verifiedData,
    state.userProfile,
    state.conversationHistory,
    state.attemptNumber
  );
  
  state.reflectionScore = reflection.qualityScore;
  state.reflectionIssues = reflection.issues;
  state.reflectionSuggestions = reflection.suggestions;
  
  state.log(`Quality Score: ${state.reflectionScore}/10`);
}

async function strategyEnhancerNode(state: StateManager): Promise<void> {
  state.log("NODE: StrategyEnhancer");
  
  // YOUR ORIGINAL STRATEGY LOGIC!
  const rerunContext = reflectionAgent.generateRerunContext(
    state.userQuery,
    {
      isGoodEnough: false,
      qualityScore: state.reflectionScore,
      issues: state.reflectionIssues,
      suggestions: state.reflectionSuggestions,
      reasoning: "Retry needed",
    },
    state.userProfile,
    state.attemptNumber + 1
  );
  
  state.searchStrategy = rerunContext.searchStrategy;
  state.attemptNumber += 1;
  
  state.log(`Strategy: CIP=${state.searchStrategy.useCIPSearch}, Broaden=${state.searchStrategy.broadenScope}`);
}

async function aggregatorNode(state: StateManager): Promise<void> {
  state.log("NODE: Aggregator");
  
  // YOUR ORIGINAL AGGREGATION LOGIC!
  const aggregatedHSPrograms = await aggregateHighSchoolPrograms(
    state.verifiedData.highSchoolPrograms.map((item: any) => ({
      program: item.program,
      schools: item.schools || [],
    }))
  );
  
  // DEBUG: Log what we're sending to aggregator
  console.log(`[Aggregator] 📦 Programs going into aggregator:`);
  const programsForAggregation = state.verifiedData.collegePrograms.map((item: any) => ({
    program: item.program,
    campuses: item.campuses || [],
  }));
  
  // Group by program name to see duplicates
  const nameGroups = new Map<string, any[]>();
  programsForAggregation.forEach((item: any) => {
    const names = Array.isArray(item.program.PROGRAM_NAME) 
      ? item.program.PROGRAM_NAME 
      : [item.program.PROGRAM_NAME];
    const name = names[0] || 'Unknown';
    if (!nameGroups.has(name)) {
      nameGroups.set(name, []);
    }
    nameGroups.get(name)!.push(item);
  });
  
  // Log programs that appear multiple times (different campuses)
  for (const [name, items] of nameGroups.entries()) {
    if (items.length > 1) {
      console.log(`[Aggregator] 🔄 "${name}" appears ${items.length} times:`);
      items.forEach((item: any, idx: number) => {
        console.log(`[Aggregator]    ${idx + 1}. Campuses: ${item.campuses.join(', ')}`);
      });
    }
  }
  
  const aggregatedCollegePrograms = aggregateCollegePrograms(programsForAggregation);
  
  const uniqueSchools = new Set<string>();
  aggregatedHSPrograms.forEach((prog: any) =>
    prog.schools?.forEach((s: string) => uniqueSchools.add(s))
  );
  
  const uniqueCampuses = new Set<string>();
  aggregatedCollegePrograms.forEach((prog: any) =>
    prog.campuses?.forEach((c: string) => uniqueCampuses.add(c))
  );
  
  // Extract CIP codes from college programs
  const verifiedCIPCodes = new Set<string>();
  aggregatedCollegePrograms.forEach((prog: any) => {
    if (prog.cipCode) verifiedCIPCodes.add(prog.cipCode);
  });
  
  console.log(`[Aggregator] 📊 College Programs Received: ${aggregatedCollegePrograms.length}`);
  if (aggregatedCollegePrograms.length > 0) {
    console.log(`[Aggregator] 📋 ALL College Programs with CIP Codes:`);
    aggregatedCollegePrograms.forEach((prog: any, idx: number) => {
      const progName = prog.programFamily || prog.program?.title || prog.title || 'Unknown';
      const cipCode = prog.cipCode || 'N/A';
      console.log(`[Aggregator]    ${idx + 1}. "${progName}" | CIP: ${cipCode}`);
    });
  }
  
  console.log(`[Aggregator] 📊 CIP Codes extracted from college programs: ${verifiedCIPCodes.size}`);
  console.log(`[Aggregator] 📊 ALL CIP Codes: [${Array.from(verifiedCIPCodes).join(", ")}]`);
  console.log(`[Aggregator] 📊 Total career mappings available: ${state.verifiedData.careers.length}`);
  
  // Extract SOC codes from careers that match CIP codes
  const relevantSOCCodes = new Set<string>();
  let matchedCareerCount = 0;
  
  state.verifiedData.careers.forEach((careerMapping: any) => {
    const cipCode = careerMapping.CIP_CODE;
    if (cipCode && verifiedCIPCodes.has(cipCode)) {
      matchedCareerCount++;
      if (careerMapping.SOC_CODE) {
        const codes = Array.isArray(careerMapping.SOC_CODE)
          ? careerMapping.SOC_CODE
          : [careerMapping.SOC_CODE];
        codes.forEach((code: string) => relevantSOCCodes.add(code));
      }
    }
  });
  
  console.log(`[Aggregator] 📊 Matched ${matchedCareerCount} career mappings with CIP codes`);
  console.log(`[Aggregator] 📊 Extracted ${relevantSOCCodes.size} unique SOC codes`);
  console.log(`[Aggregator] 📊 SOC Codes: [${Array.from(relevantSOCCodes).slice(0, 10).join(", ")}]`);
  
  if (matchedCareerCount > 0) {
    console.log(`[Aggregator] 🎯 ALL Matched Career Mappings:`);
    const matchedCareers = state.verifiedData.careers.filter((c: any) => 
      c.CIP_CODE && verifiedCIPCodes.has(c.CIP_CODE)
    );
    matchedCareers.forEach((career: any, idx: number) => {
      const socCodes = Array.isArray(career.SOC_CODE) ? career.SOC_CODE : [career.SOC_CODE];
      const socPreview = socCodes.slice(0, 3).join(", ");
      const more = socCodes.length > 3 ? ` +${socCodes.length - 3} more` : '';
      console.log(`[Aggregator]    ${idx + 1}. CIP: ${career.CIP_CODE} → SOC: [${socPreview}${more}] (${socCodes.length} total)`);
    });
  }
  
  const aggregatedCareers = Array.from(relevantSOCCodes)
    .slice(0, 10)
    .map(socCode => ({ title: socCode, code: socCode }));
  
  // FALLBACK: If no careers from CIP matching, use all careers from verifiedData
  if (aggregatedCareers.length === 0 && state.verifiedData.careers.length > 0) {
    console.log(`[Aggregator] ⚠️ No CIP-matched careers, using all available careers as fallback`);
    const fallbackSOCCodes = new Set<string>();
    state.verifiedData.careers.slice(0, 10).forEach((careerMapping: any) => {
      if (careerMapping.SOC_CODE) {
        const codes = Array.isArray(careerMapping.SOC_CODE)
          ? careerMapping.SOC_CODE
          : [careerMapping.SOC_CODE];
        codes.forEach((code: string) => fallbackSOCCodes.add(code));
      }
    });
    aggregatedCareers.push(...Array.from(fallbackSOCCodes)
      .slice(0, 10)
      .map(socCode => ({ title: socCode, code: socCode })));
  }
  
  state.aggregatedData = {
    highSchoolPrograms: aggregatedHSPrograms,
    collegePrograms: aggregatedCollegePrograms,
    careers: aggregatedCareers,
    schools: Array.from(uniqueSchools),
    campuses: Array.from(uniqueCampuses),
  };
  
  state.log(`Aggregated: ${aggregatedHSPrograms.length} HS, ${aggregatedCollegePrograms.length} college, ${aggregatedCareers.length} careers`);
}

async function formatterNode(state: StateManager): Promise<void> {
  state.log("NODE: Formatter");
  
  // Log what we're passing to formatter
  console.log(`[FormatterNode] 📤 Passing to formatter:`, {
    degreePreference: state.degreePreference,
    institutionFilter: state.institutionFilter
  });
  
  // YOUR ORIGINAL FORMATTING LOGIC!
  const formatted = await responseFormatter.formatResponse(
    state.userQuery,
    state.aggregatedData,
    state.conversationHistory,
    state.userProfile,
    state.degreePreference,
    state.institutionFilter
  );
  
  state.finalResponse = formatted.markdown;
}

async function conversationalNode(state: StateManager): Promise<void> {
  state.log("NODE: Conversational");
  
  // YOUR ORIGINAL CONVERSATIONAL LOGIC WITH INTELLIGENCE EXTRACTION!
  const response = await conversationalAgent.generateResponse(
    state.userQuery,
    state.conversationHistory,
    state.userProfile,
    state.queryType
  );
  
  // CAPTURE EXTRACTED INTELLIGENCE
  if (response.extractedContext) {
    state.log(`🧠 Extracted Intelligence: ${JSON.stringify(response.extractedContext)}`);
    
    // Store keywords
    state.extractedKeywords = response.extractedContext.keywords || [];
    
    // ✨ TIER 1: INSTANT PROFILE MICRO-UPDATE (FREE & INSTANT)
    if (state.userProfile && response.extractedContext.suggestedProfileUpdates) {
      const updates = response.extractedContext.suggestedProfileUpdates;
      let profileUpdated = false;
      
      // Merge new interests (deduplicated)
      if (updates.interests?.length) {
        const oldInterests = state.userProfile.interests || [];
        const oldCount = oldInterests.length;
        state.userProfile.interests = [
          ...new Set([
            ...oldInterests,
            ...updates.interests
          ])
        ];
        const newCount = state.userProfile.interests.length;
        if (newCount > oldCount) {
          console.log(
            `✨ [Profile Micro-Update] Added ${newCount - oldCount} new interest(s):`,
            updates.interests.join(", ")
          );
          profileUpdated = true;
        }
      }
      
      // Merge new career goals (deduplicated)
      if (updates.careerGoals?.length) {
        const oldGoals = state.userProfile.careerGoals || [];
        const oldCount = oldGoals.length;
        state.userProfile.careerGoals = [
          ...new Set([
            ...oldGoals,
            ...updates.careerGoals
          ])
        ];
        const newCount = state.userProfile.careerGoals.length;
        if (newCount > oldCount) {
          console.log(
            `✨ [Profile Micro-Update] Added ${newCount - oldCount} new career goal(s):`,
            updates.careerGoals.join(", ")
          );
          profileUpdated = true;
        }
      }
      
      // Update single-value fields (education level)
      if (updates.educationLevel && 
          updates.educationLevel !== state.userProfile.extracted?.educationLevel) {
        state.userProfile.extracted = state.userProfile.extracted || {};
        state.userProfile.extracted.educationLevel = updates.educationLevel;
        console.log(
          `✨ [Profile Micro-Update] Updated education level:`,
          updates.educationLevel
        );
        profileUpdated = true;
      }
      
      // Update single-value fields (location)
      if (updates.location && 
          updates.location !== state.userProfile.extracted?.location) {
        state.userProfile.extracted = state.userProfile.extracted || {};
        state.userProfile.extracted.location = updates.location;
        console.log(
          `✨ [Profile Micro-Update] Updated location:`,
          updates.location
        );
        profileUpdated = true;
      }
      
      if (profileUpdated) {
        state.log("✅ Profile enriched with conversational intelligence (FREE, INSTANT)");
      }
    }
    
    // Log suggested profile updates for frontend (future use)
    if (response.extractedContext.suggestedProfileUpdates) {
      const updates = response.extractedContext.suggestedProfileUpdates;
      if (updates.interests?.length || updates.careerGoals?.length) {
        console.log(
          "[Conversational] 💡 Suggested profile updates:",
          JSON.stringify(updates, null, 2)
        );
        // TODO: Can send this back to the frontend to prompt user to update profile
      }
    }
  }
  
  state.finalResponse = response.markdown;
  state.reflectionScore = 10;
  state.aggregatedData = {
    highSchoolPrograms: [],
    collegePrograms: [],
    careers: [],
    schools: [],
    campuses: [],
  };
}

/**
 * ROUTING TABLE
 * Declarative routing - LangGraph's key insight!
 */
type RouterFunc = (state: StateManager) => string;
type NodeFunc = (state: StateManager) => Promise<void>;

const ROUTING_TABLE: Record<string, string | RouterFunc> = {
  START: "classifier",
  
  classifier: (state) => state.needsTools ? "profileExtractor" : "conversational",
  
  profileExtractor: "toolPlanner",
  toolPlanner: "toolExecutor",
  toolExecutor: "verifier",
  verifier: "reflector",
  
  reflector: (state) => {
    const isGoodEnough = state.reflectionScore >= 5; // Reduced from 6 to 5
    const maxAttempts = state.attemptNumber >= 2; // Reduced from 3 to 2
    
    if (isGoodEnough || maxAttempts) {
      return "aggregator";
    }
    return "strategyEnhancer";
  },
  
  strategyEnhancer: "profileExtractor", // Loop back!
  aggregator: "formatter",
  formatter: "END",
  conversational: "END",
};

const NODE_HANDLERS: Record<string, NodeFunc> = {
  classifier: classifierNode,
  profileExtractor: profileExtractorNode,
  toolPlanner: toolPlannerNode,
  toolExecutor: toolExecutorNode,
  verifier: verifierNode,
  reflector: reflectorNode,
  strategyEnhancer: strategyEnhancerNode,
  aggregator: aggregatorNode,
  formatter: formatterNode,
  conversational: conversationalNode,
};

/**
 * GRAPH EXECUTOR
 * Simple, transparent, no library needed!
 */
async function executeGraph(state: StateManager): Promise<StateManager> {
  let currentNode = "START";
  
  while (currentNode !== "END") {
    // Get next node
    const nextNodeOrRouter = ROUTING_TABLE[currentNode];
    
    if (typeof nextNodeOrRouter === "function") {
      currentNode = nextNodeOrRouter(state);
    } else {
      currentNode = nextNodeOrRouter;
    }
    
    if (currentNode === "END") break;
    
    // Execute node
    const handler = NODE_HANDLERS[currentNode];
    if (!handler) {
      state.addError(`Unknown node: ${currentNode}`);
      break;
    }
    
    try {
      await handler(state);
    } catch (error: any) {
      state.addError(`Node ${currentNode} failed: ${error.message}`);
      console.error(`[LangGraph-Style] Node ${currentNode} error:`, error);
      break;
    }
  }
  
  return state;
}

/**
 * MAIN ENTRY POINT
 */
export async function processUserQueryWithLangGraphStyle(
  message: string,
  Tools: any,
  conversationHistory: any[] = [],
  profile: any
): Promise<{
  response: string;
  data: any;
  profile: any;
  toolsUsed: string[];
  reflectionScore: number;
  attempts: number;
}> {
  console.log("[LangGraph-Style] Starting query processing...");
  
  // Create initial state
  const state = new StateManager(message, profile, conversationHistory, Tools);
  
  // Execute graph
  const finalState = await executeGraph(state);
  
  console.log(`[LangGraph-Style] Completed in ${finalState.attemptNumber} attempt(s)`);
  console.log(`[LangGraph-Style] Final score: ${finalState.reflectionScore}/10`);
  
  if (finalState.errors.length > 0) {
    console.warn(`[LangGraph-Style] Errors encountered:`, finalState.errors);
  }
  
  return {
    response: finalState.finalResponse,
    data: finalState.aggregatedData,
    profile: finalState.userProfile,
    toolsUsed: finalState.toolsUsed,
    reflectionScore: finalState.reflectionScore,
    attempts: finalState.attemptNumber,
  };
}

/**
 * HELPER FUNCTIONS
 */
function extractKeywords(message: string): string[] {
  // Stop words - generic words that don't help identify programs
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "about", "what", "which", "where", "how",
    "is", "are", "was", "were", "been", "be", "have", "has", "had", "do",
    "does", "did", "will", "would", "could", "should", "may", "might",
    "must", "can", "want", "need", "like", "find", "show", "tell", "give", "list",
    "just", "see", "job", "jobs", "career", "careers", "me", "my",
    "more", "that", "this", "these", "those", "some", "any", "all",
  ]);
  
  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Return up to 5 keywords for better matching
  return words.slice(0, 5);
}

/**
 * Detect island mention in query
 * Returns normalized island name or null
 */
function detectIslandFromQuery(query: string): string | null {
  const queryLower = query.toLowerCase();
  
  // Island name mappings with common variations
  const islandMappings: Record<string, string> = {
    'oahu': 'Oahu',
    "o'ahu": 'Oahu',
    'honolulu': 'Oahu',
    'pearl city': 'Oahu',
    'kaneohe': 'Oahu',
    'waipahu': 'Oahu',
    'aiea': 'Oahu',
    'mililani': 'Oahu',
    'campbell': 'Oahu',
    'farrington': 'Oahu',
    'kahuku': 'Oahu',
    'kailua': 'Oahu',
    'kaimuki': 'Oahu',
    'kaiser': 'Oahu',
    'kalaheo': 'Oahu',
    'kalani': 'Oahu',
    'kapolei': 'Oahu',
    'leilehua': 'Oahu',
    'mckinley': 'Oahu',
    'moanalua': 'Oahu',
    'nanakuli': 'Oahu',
    'radford': 'Oahu',
    'roosevelt': 'Oahu',
    'waialua': 'Oahu',
    'waianae': 'Oahu',
    
    'maui': 'Maui',
    'kahului': 'Maui',
    'wailuku': 'Maui',
    'baldwin': 'Maui',
    'lahainaluna': 'Maui',
    'king kekaulike': 'Maui',
    'molokai': 'Maui',  // Served by Maui College
    'moloka\'i': 'Maui',
    'lanai': 'Maui',     // Served by Maui College
    'lana\'i': 'Maui',
    
    'kauai': 'Kauai',
    'kaua\'i': 'Kauai',
    'lihue': 'Kauai',
    'kapaa': 'Kauai',
    'waimea': 'Kauai',
    
    'hawaii': 'Hawaii',
    'hawai\'i': 'Hawaii',
    'big island': 'Hawaii',
    'hilo': 'Hawaii',
    'kona': 'Hawaii',
    'waiakea': 'Hawaii',
    'honokaa': 'Hawaii',
    'keaau': 'Hawaii',
    'kealakehe': 'Hawaii',
    'kohala': 'Hawaii',
    'konawaena': 'Hawaii',
    'pahoa': 'Hawaii'
  };
  
  for (const [keyword, island] of Object.entries(islandMappings)) {
    if (queryLower.includes(keyword)) {
      return island;
    }
  }
  
  return null;
}
