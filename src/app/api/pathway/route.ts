/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/pathway/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processUserQuery } from "@/app/lib/agents/orchestrator-agents";
import { processUserQueryWithLangGraphStyle } from "@/app/lib/agents/langgraph-style-orchestrator";
import Tools from "@/app/lib/tools/jsonl-tools";
import {
  formatCollegeProgramsForFrontend,
} from "@/app/lib/helpers/pathway-aggregator";
import { CacheService } from "@/app/lib/cache/cache-service";

// Feature flag for LangGraph-style orchestrator
const USE_LANGGRAPH_STYLE = process.env.USE_LANGGRAPH_STYLE === "true";

// Enable streaming if needed
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cache = CacheService.getInstance();

/**
 * POST /api/pathway
 * Main endpoint for processing educational pathway queries
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { message, conversationHistory = [], profile = null, userProfile = null } = body;
    
    // Use whichever profile structure was sent (frontend sends userProfile, some may send profile)
    const receivedProfile = userProfile || profile;

    // Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Message is required and must be a string",
        },
        { status: 400 }
      );
    }

    // Validate conversation history
    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        {
          success: false,
          error: "Conversation history must be an array",
        },
        { status: 400 }
      );
    }

    console.log(`[Pathway API] Processing query: "${message}"`);
    console.log(`[Pathway API] RAW profile received:`, JSON.stringify(receivedProfile, null, 2));
    console.log(`[Pathway API] Profile keys:`, receivedProfile ? Object.keys(receivedProfile) : 'null');
    console.log(`[Pathway API] Profile.extracted exists?`, receivedProfile?.extracted ? 'YES' : 'NO');
    console.log(`[Pathway API] Profile.extracted content:`, JSON.stringify(receivedProfile?.extracted, null, 2));

    // Transform profile structure for orchestrator
    // Frontend might send various structures - try all possibilities
    let transformedProfile;
    
    if (receivedProfile?.extracted) {
      // Case 1: profile.extracted exists (most likely from frontend)
      console.log(`[Pathway API] Using profile.extracted structure`);
      transformedProfile = receivedProfile.extracted;
    } else if (receivedProfile?.interests || receivedProfile?.careerGoals || receivedProfile?.educationLevel || receivedProfile?.location) {
      // Case 2: profile is already in the correct format
      console.log(`[Pathway API] Profile already in correct format`);
      transformedProfile = receivedProfile;
    } else {
      // Case 3: No profile data
      console.log(`[Pathway API] No profile data found, using empty profile`);
      transformedProfile = {
        educationLevel: null,
        interests: [],
        careerGoals: [],
        location: null,
      };
    }

    console.log(`[Pathway API] Transformed profile for orchestrator:`, JSON.stringify(transformedProfile, null, 2));

    // Extract last conversation context for cache key (last 2 messages)
    const recentContext = conversationHistory
      .slice(-2)
      .map((msg: any) => msg.content?.substring(0, 100)) // First 100 chars of recent messages
      .join(" | ");

    // Generate cache key with conversation context
    const cacheKey = cache.generateCacheKey(
      "/api/pathway",
      {
        message: message.toLowerCase().trim(),
        recentContext: recentContext.toLowerCase().trim(), // ADDED: Context-aware caching
        profileInterests: transformedProfile?.interests?.join(",") || "",
        profileEducation: transformedProfile?.educationLevel || "",
      },
      receivedProfile?.profileSummary || receivedProfile?.summary
    );

    // Try to get from cache
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult && !process.env.DISABLE_CACHE) {
      console.log(`[Pathway API] ✅ Cache hit for query: "${message}"`);
      return NextResponse.json({
        ...cachedResult,
        cached: true,
        processingTime: Date.now() - startTime,
      });
    }

    console.log(`[Pathway API] 🔄 Cache miss, processing query...`);

    // Process the query using the orchestrator (includes verification AND aggregation)
    // Pass the TRANSFORMED profile (not the raw frontend profile)
    
    // FEATURE FLAG: Choose orchestrator version
    let result;
    if (USE_LANGGRAPH_STYLE) {
      console.log(`[Pathway API] 🚀 Using LangGraph-Style Orchestrator`);
      result = await processUserQueryWithLangGraphStyle(
        message,
        Tools,
        conversationHistory,
        transformedProfile
      );
    } else {
      console.log(`[Pathway API] 📊 Using Original Orchestrator`);
      result = await processUserQuery(
        message,
        Tools,
        conversationHistory,
        transformedProfile
      );
    }

    // ============================================
    // DATA IS ALREADY AGGREGATED FROM ORCHESTRATOR
    // Just need to format for frontend display
    // ============================================

    // The orchestrator now returns pre-aggregated data with structure:
    // { highSchoolPrograms: [{name, schools, schoolCount, details}], collegePrograms: [{name, campuses, campusCount}], ... }

    // Format college programs for frontend (adds variant prioritization)
    const formattedCollegePrograms = formatCollegeProgramsForFrontend(
      result.data.collegePrograms || []
    );

    // Calculate unique schools and campuses from already-aggregated data
    const uniqueHighSchools = new Set<string>();
    (result.data.highSchoolPrograms || []).forEach((prog: any) =>
      (prog.schools || []).forEach((s: string) => uniqueHighSchools.add(s))
    );

    const uniqueCollegeCampuses = new Set<string>();
    (result.data.collegePrograms || []).forEach((prog: any) =>
      (prog.campuses || []).forEach((c: string) => uniqueCollegeCampuses.add(c))
    );

    // Format the response data for the frontend
    const formattedResponse = {
      success: true,
      message: result.response,
      data: {
        // High school programs with course details (already aggregated)
        highSchoolPrograms: (result.data.highSchoolPrograms || []).map((prog: any) => ({
          name: prog.name,
          schools: prog.schools || [],
          schoolCount: prog.schoolCount || (prog.schools || []).length,
          details: prog.details, // Includes coursesByGrade and coursesByLevel
        })),
        // College programs grouped by CIP with variants (formatted for display)
        collegePrograms: formattedCollegePrograms.map((prog: any) => ({
          name: prog.name,
          campuses: prog.campuses || [],
          campusCount: prog.campusCount || (prog.campuses || []).length,
          variants: prog.variants, // Top 3 specializations
          variantCount: prog.variantCount, // Total count of variants
        })),
        // Careers
        careers: (result.data.careers || []).map((career: any) => ({
          cipCode: career.CIP_CODE || career.cipCode || "",
          socCodes: career.SOC_CODE || career.socCodes || [],
          title:
            career.SOC_TITLE || career.title || career.SOC_CODE?.[0] || "Career Opportunity",
        })),
        // Updated summary with accurate counts (from aggregated data)
        summary: {
          totalHighSchoolPrograms: (result.data.highSchoolPrograms || []).length,
          totalHighSchools: uniqueHighSchools.size,
          totalCollegePrograms: (result.data.collegePrograms || []).length,
          totalCollegeCampuses: uniqueCollegeCampuses.size,
          totalCareerPaths: (result.data.careers || []).length,
        },
      },
      profile: result.profile,
      toolsUsed: result.toolsUsed,
      // Reflection metadata
      qualityScore: result.reflectionScore,
      attempts: result.attempts,
      processingTime: Date.now() - startTime,
    };

    console.log(
      `[Pathway API] Success - Processing time: ${formattedResponse.processingTime}ms`
    );
    console.log(
      `[Pathway API] Found: ${formattedResponse.data.summary.totalHighSchoolPrograms} HS programs, ${formattedResponse.data.summary.totalCollegePrograms} college program families`
    );
    console.log(
      `[Pathway API] Orchestrator: ${USE_LANGGRAPH_STYLE ? "LangGraph-Style" : "Original"} | Quality: ${result.reflectionScore}/10 | Attempts: ${result.attempts}`
    );

    // Cache the result
    if (!process.env.DISABLE_CACHE) {
      await cache.set(
        cacheKey,
        formattedResponse,
        {
          ttl: 3600, // 1 hour
          tags: ["pathway", "search"],
        },
        {
          query: message,
          profileBased: !!profile,
          resultCounts: formattedResponse.data.summary,
          timestamp: new Date().toISOString(),
        }
      );
      console.log(`[Pathway API] 💾 Cached result for future queries`);
    }

    return NextResponse.json(formattedResponse);
  } catch (error: any) {
    console.error("[Pathway API] Error:", error);

    // Return user-friendly error response
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process your request. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        processingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pathway
 * Health check and API info endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "Hawaii Educational Pathway Advisor API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: {
        path: "/api/pathway",
        description: "Process educational pathway queries",
        requestBody: {
          message: {
            type: "string",
            required: true,
            description: "User query about educational pathways",
          },
          conversationHistory: {
            type: "array",
            required: false,
            description: "Previous messages in the conversation",
            items: {
              role: "user | assistant",
              content: "string",
            },
          },
          profile: {
            type: "object",
            required: false,
            description:
              "User profile with interests and goals for personalized results",
          },
        },
        response: {
          success: "boolean",
          message: "string - Natural language response",
          data: {
            highSchoolPrograms:
              "array (deduplicated by program name, with course details)",
            collegePrograms:
              "array (grouped by CIP code with all variants, campuses aggregated)",
            careers: "array (with SOC codes and titles)",
            summary: "object with accurate counts",
          },
          profile: "extracted user profile",
          toolsUsed: "array of tools used",
          processingTime: "number in milliseconds",
        },
      },
    },
    examples: [
      "Where can I study culinary arts?",
      "What high schools offer engineering?",
      "Show me computer science pathways",
      "Healthcare programs in Hawaii",
      "Careers from cybersecurity program",
    ],
  });
}

/**
 * OPTIONS /api/pathway
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
