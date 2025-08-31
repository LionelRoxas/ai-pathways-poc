/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/ai-pathways/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleMCPRequest } from "../../lib/mcp/pathways-mcp-server";
import Groq from "groq-sdk";
import { analyzeAndImproveQuery } from "../../utils/groqClient";
import {
  AIPathwaysResponse,
  MCPQueryPlan,
  CurrentData,
  ExtractedProfile,
} from "../../components/AIPathwaysChat/_components/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Plan MCP queries based on analyzed query and profile
async function planMCPQueries(
  userProfile: string,
  message: string,
  extractedProfile?: ExtractedProfile
): Promise<MCPQueryPlan> {
  // Step 1: Analyze and improve the user's query
  const queryAnalysis = await analyzeAndImproveQuery(
    message,
    userProfile,
    extractedProfile
  );

  console.log("Query analysis result:", queryAnalysis);

  const queries: MCPQueryPlan["queries"] = [];

  // Step 2: Determine if we should use profile or query-based search
  const useProfile = !queryAnalysis.ignoreProfile;

  // Check if user is asking about high school courses specifically
  const messageLower = message.toLowerCase();
  const isAskingAboutHSCourses =
    messageLower.includes("class") ||
    messageLower.includes("course") ||
    messageLower.includes("sophomore") ||
    messageLower.includes("junior") ||
    messageLower.includes("senior") ||
    messageLower.includes("freshman") ||
    messageLower.includes("high school") ||
    messageLower.includes("next year") ||
    messageLower.includes("grade");

  // Context from profile (only used if not ignoring profile)
  const context = useProfile
    ? {
        educationLevel: extractedProfile?.educationLevel || undefined,
        gradeLevel:
          extractedProfile?.gradeLevel ||
          (extractedProfile?.educationLevel === "high_school_student"
            ? 9
            : undefined), // Default grade for HS students
        interests: extractedProfile?.interests || [],
        careerGoals: extractedProfile?.careerGoals || [],
        location: extractedProfile?.location || "Hawaii",
        timeline: extractedProfile?.timeline || undefined,
      }
    : {
        location: extractedProfile?.location || "Hawaii", // Keep location for campus filtering
      };

  // Step 3: Build queries based on intent and search terms
  // Special handling for high school students asking about courses
  if (
    isAskingAboutHSCourses &&
    (context.educationLevel === "high_school" ||
      context.educationLevel === "high_school_student" ||
      queryAnalysis.intent === "profile_based")
  ) {
    // Prioritize DOE programs for course planning
    queries.push({
      tool: "getDOEPrograms",
      params: {
        interests: context.interests,
        gradeLevel: context.gradeLevel || 9,
        careerGoals: context.careerGoals,
        limit: 30,
      },
      priority: "primary",
    });

    // Add pathways to show college connections
    queries.push({
      tool: "getEducationPathways",
      params: {
        interests: context.interests,
        gradeLevel: context.gradeLevel || 9,
        location: context.location,
        limit: 30,
      },
      priority: "supporting",
    });

    // Add some UH programs for future planning
    queries.push({
      tool: "getUHPrograms",
      params: {
        interests: context.interests,
        educationLevel: context.educationLevel,
        location: context.location,
        careerGoals: context.careerGoals,
        limit: 20,
      },
      priority: "supporting",
    });
  } else {
    // Original switch statement for other cases
    switch (queryAnalysis.intent) {
      case "search":
        // Direct search - use the improved query and expanded terms
        if (queryAnalysis.searchTerms.length > 0) {
          // Search for UH programs with expanded terms
          queries.push({
            tool: "searchPrograms",
            params: {
              query: queryAnalysis.searchTerms[0], // Primary search term
              expandedTerms: queryAnalysis.searchTerms, // All variations
              type: "all",
              limit: 100,
              getAllMatches: true,
            },
            priority: "primary",
          });

          // Also try getUHPrograms with search terms as interests
          queries.push({
            tool: "getUHPrograms",
            params: {
              interests: queryAnalysis.searchTerms,
              location: context.location,
              limit: 100,
              getAllMatches: true,
              ignoreProfile: true, // New flag to ignore profile filtering
            },
            priority: "primary",
          });

          // And DOE programs if relevant
          queries.push({
            tool: "getDOEPrograms",
            params: {
              interests: queryAnalysis.searchTerms,
              limit: 50,
              getAllMatches: true,
              ignoreProfile: true,
            },
            priority: "supporting",
          });
        }
        break;

      case "profile_based":
        // Check if user is a high school student
        const isHighSchoolStudent =
          context.educationLevel === "high_school" ||
          context.educationLevel === "high_school_student" ||
          context.gradeLevel !== undefined;

        if (isHighSchoolStudent) {
          // For high school students, prioritize DOE programs
          queries.push({
            tool: "getDOEPrograms",
            params: {
              interests: context.interests,
              gradeLevel: context.gradeLevel || 9, // Default to 9 if not specified
              careerGoals: context.careerGoals,
              limit: 30,
            },
            priority: "primary",
          });

          // Also get pathways to show college connections
          queries.push({
            tool: "getEducationPathways",
            params: {
              interests: context.interests,
              gradeLevel: context.gradeLevel || 9,
              location: context.location,
              limit: 50,
            },
            priority: "supporting",
          });

          // And some UH programs for future planning
          queries.push({
            tool: "getUHPrograms",
            params: {
              interests: context.interests,
              educationLevel: context.educationLevel,
              location: context.location,
              careerGoals: context.careerGoals,
              limit: 20,
            },
            priority: "supporting",
          });
        } else {
          // For non-high school students, focus on UH programs
          queries.push({
            tool: "getUHPrograms",
            params: {
              interests: context.interests,
              educationLevel: context.educationLevel,
              gradeLevel: context.gradeLevel,
              location: context.location,
              careerGoals: context.careerGoals,
              limit: 50,
            },
            priority: "primary",
          });
        }
        break;

      case "mixed":
        // Combine search terms with profile data
        const combinedInterests = [
          ...queryAnalysis.searchTerms,
          ...(useProfile ? context.interests || [] : []),
        ];

        queries.push({
          tool: "getUHPrograms",
          params: {
            interests: combinedInterests,
            educationLevel: useProfile ? context.educationLevel : undefined,
            location: context.location,
            careerGoals: useProfile ? context.careerGoals : undefined,
            limit: 75,
            getAllMatches: true,
          },
          priority: "primary",
        });
        break;

      default:
        // Fallback to search if we have terms
        if (queryAnalysis.searchTerms.length > 0) {
          queries.push({
            tool: "searchPrograms",
            params: {
              query: queryAnalysis.searchTerms[0],
              expandedTerms: queryAnalysis.searchTerms,
              type: "all",
              limit: 50,
            },
            priority: "primary",
          });
        } else {
          // Fall back to profile-based
          queries.push({
            tool: "getUHPrograms",
            params: {
              interests: context.interests,
              educationLevel: context.educationLevel,
              location: context.location,
              careerGoals: context.careerGoals,
              limit: 50,
            },
            priority: "primary",
          });
        }
        break;
    }
  }

  // Always get stats for context
  queries.push({
    tool: "getDatabaseStats",
    params: {},
    priority: "supporting",
  });

  return {
    intent: queryAnalysis.intent as any,
    queries,
    extractedContext: {
      ...context,
      searchTerms: queryAnalysis.searchTerms,
      improvedQuery: queryAnalysis.improvedQuery,
      ignoreProfile: queryAnalysis.ignoreProfile,
    },
  };
}

// Generate response based on MCP data
async function generateDataDrivenResponse(
  userProfile: string,
  message: string,
  mcpData: any,
  queryPlan: MCPQueryPlan
): Promise<string> {
  const systemPrompt = `You are a Hawaii education counselor helping students find educational pathways.

USER PROFILE: ${userProfile}
USER MESSAGE: ${message}
QUERY ANALYSIS: User asked for: "${queryPlan.extractedContext?.improvedQuery || message}"
SEARCH TERMS: ${queryPlan.extractedContext?.searchTerms?.join(", ") || "none"}
IGNORE PROFILE: ${queryPlan.extractedContext?.ignoreProfile ? "YES - User wants specific programs, not profile-based recommendations" : "NO - Use profile for recommendations"}
DATABASE RESULTS: ${JSON.stringify(mcpData, null, 2)}

CRITICAL RULES:
1. If the user asked for SPECIFIC programs (e.g., "computer science", "nursing"), focus ONLY on those programs
2. Do NOT recommend unrelated programs just because they match the profile
3. If no results match the specific request, say so clearly and suggest alternatives
4. Focus on programs with highest relevance scores
5. Mention specific program names, campuses, and degrees
6. For DOE programs, explain course sequences if relevant
7. Keep response concise (1 paragraph max)

Generate a helpful response that directly addresses what the user asked for.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Generate response addressing the user's specific request",
        },
      ],
      temperature: 0.3,
    });

    return (
      response.choices[0].message.content ||
      "I found several programs matching your request. Please check the data panel for details."
    );
  } catch (error) {
    console.error("Response generation error:", error);
    return "I've found programs matching your request. Please review the options in the data panel.";
  }
}

// Generate contextual follow-up questions
function generateSmartQuestions(
  queryPlan: MCPQueryPlan,
  mcpData: any,
  extractedProfile?: any
): string[] {
  const questions: string[] = [];
  const searchTerms = queryPlan.extractedContext?.searchTerms || [];

  // If user searched for something specific, give related follow-ups
  if (searchTerms.length > 0 && queryPlan.extractedContext?.ignoreProfile) {
    const term = searchTerms[0];
    questions.push(
      `What are the admission requirements for ${term} programs?`,
      `Show me ${term} programs at different UH campuses`,
      `What careers can I get with a ${term} degree?`,
      `Are there online ${term} programs available?`
    );
  } else {
    // Context-aware questions based on what we found
    if (mcpData.uhPrograms?.length > 0) {
      questions.push(
        "Tell me more about admission requirements",
        "Which campus would be most convenient for me?"
      );
    }

    if (mcpData.doePrograms?.length > 0) {
      questions.push(
        "What courses should I take next year?",
        "Which program best prepares me for college?"
      );
    }

    // Profile-based questions
    if (!extractedProfile?.location) {
      questions.push("Which island are you on?");
    }

    if (!extractedProfile?.interests?.length) {
      questions.push("What subjects interest you most?");
    }
  }

  // Default fallbacks
  if (questions.length < 4) {
    questions.push(
      "Show me computer science programs",
      "What nursing programs are available?",
      "Find business programs at UH",
      "Show me all programs on Oahu"
    );
  }

  return questions.slice(0, 4);
}

// Main route handler
export async function POST(req: NextRequest) {
  try {
    console.log("AI Pathways POST endpoint hit");

    const body = await req.json();
    const { message, userProfile, extractedProfile } = body;

    console.log("Request data:", {
      message: message,
      hasUserProfile: !!userProfile,
      hasExtractedProfile: !!extractedProfile,
      extractedProfile: extractedProfile,
    });

    if (!message?.trim() || !userProfile) {
      return NextResponse.json(
        { error: "Message and userProfile are required" },
        { status: 400 }
      );
    }

    // Step 1: Plan MCP queries with query analysis
    console.log("Planning MCP queries with query analysis...");
    const queryPlan = await planMCPQueries(
      userProfile,
      message,
      extractedProfile
    );
    console.log("Query plan with analysis:", queryPlan);

    // Step 2: Execute MCP queries
    const mcpData: CurrentData = {
      uhPrograms: undefined,
      doePrograms: undefined,
      pathways: undefined,
      searchResults: undefined,
      stats: undefined,
    };
    const queriesExecuted: string[] = [];
    let totalResults = 0;

    console.log("Executing MCP queries...");
    for (const query of queryPlan.queries) {
      try {
        console.log(`Executing ${query.tool} with params:`, query.params);
        const result = await handleMCPRequest({
          tool: query.tool,
          params: query.params,
        });

        console.log(`${query.tool} result:`, {
          success: result.success,
          dataLength: Array.isArray(result.data) ? result.data.length : 1,
          metadata: result.metadata,
        });

        if (result.success && result.data) {
          switch (query.tool) {
            case "getUHPrograms":
              mcpData.uhPrograms = result.data;
              totalResults += result.data.length;
              break;
            case "getDOEPrograms":
              mcpData.doePrograms = result.data;
              totalResults += result.data.length;
              break;
            case "getEducationPathways":
              mcpData.pathways = result.data;
              totalResults += result.data.length;
              break;
            case "searchPrograms":
              mcpData.searchResults = result.data;
              totalResults +=
                (result.data.uhPrograms?.length || 0) +
                (result.data.doePrograms?.length || 0);
              break;
            case "getDatabaseStats":
              mcpData.stats = result.data;
              break;
          }
          queriesExecuted.push(query.tool);
        }
      } catch (error) {
        console.error(`MCP query failed for ${query.tool}:`, error);
      }
    }

    console.log("MCP queries completed. Total results:", totalResults);

    // Step 3: Generate response
    console.log("Generating response...");
    const responseMessage = await generateDataDrivenResponse(
      userProfile,
      message,
      mcpData,
      queryPlan
    );

    // Step 4: Generate follow-up questions
    const suggestedQuestions = generateSmartQuestions(
      queryPlan,
      mcpData,
      extractedProfile
    );

    // Step 5: Build structured response
    const response: AIPathwaysResponse = {
      message: responseMessage,
      data: mcpData,
      metadata: {
        intent: queryPlan.intent as AIPathwaysResponse["metadata"]["intent"],
        dataSource: "hawaii_education_db",
        queriesExecuted,
        totalResults,
        relevanceScoring: true,
        queryAnalysis: {
          improvedQuery: queryPlan.extractedContext?.improvedQuery,
          searchTerms: queryPlan.extractedContext?.searchTerms,
          ignoreProfile: queryPlan.extractedContext?.ignoreProfile,
        },
      },
      suggestedQuestions,
      userProfile,
    };

    console.log("Sending response with:", {
      dataKeys: Object.keys(mcpData),
      totalResults,
      intent: queryPlan.intent,
      ignoreProfile: queryPlan.extractedContext?.ignoreProfile,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Pathways API error:", error);

    const errorResponse: AIPathwaysResponse = {
      message:
        "I'm having trouble accessing the education database. Please try again.",
      data: {},
      metadata: {
        intent: "error",
        dataSource: "hawaii_education_db",
        queriesExecuted: [],
        totalResults: 0,
        relevanceScoring: false,
      },
      suggestedQuestions: [
        "Show me computer science programs",
        "Find nursing programs at UH",
        "What business degrees are available?",
        "Show me programs on Oahu",
      ],
      userProfile: "",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  try {
    console.log("AI Pathways GET endpoint hit");

    const statsResponse = await handleMCPRequest({
      tool: "getDatabaseStats",
      params: {},
    });

    console.log("Database stats:", statsResponse);

    return NextResponse.json({
      status: "healthy",
      message:
        "Hawaii Education Pathways API - Query-aware intelligent matching",
      database: statsResponse.success ? statsResponse.data : null,
      features: {
        queryAnalysis: true,
        intelligentQueries: true,
        relevanceScoring: true,
        pathwayMapping: true,
        multiCampusSupport: true,
        gradeAlignment: true,
        searchTermExpansion: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Pathways GET error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "API running but database unavailable",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
