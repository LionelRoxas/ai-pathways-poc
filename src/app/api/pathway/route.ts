/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/pathway/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processUserQuery } from "@/app/lib/agents/orchestrator-agents";
import Tools from "@/app/lib/tools/jsonl-tools";
import {
  aggregateHighSchoolPrograms,
  aggregateCollegePrograms,
  formatCollegeProgramsForFrontend,
} from "@/app/lib/helpers/pathway-aggregator";
import { CacheService } from "@/app/lib/cache/cache-service";

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
    const { message, conversationHistory = [], profile = null } = body;

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
    if (profile) {
      console.log(`[Pathway API] Using existing profile:`, profile);
    }

    // Generate cache key
    const cacheKey = cache.generateCacheKey(
      "/api/pathway",
      {
        message: message.toLowerCase().trim(),
        profileInterests: profile?.extracted?.interests?.join(",") || "",
        profileEducation: profile?.extracted?.educationLevel || "",
      },
      profile?.profileSummary
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

    // Process the query using the orchestrator (includes verification)
    // Now passing the profile as context
    const result = await processUserQuery(
      message,
      Tools,
      conversationHistory,
      profile
    );

    // ============================================
    // AGGREGATE AND DEDUPLICATE DATA
    // ============================================

    // Aggregate high school programs (removes duplicates from POS levels)
    const aggregatedHSPrograms = await aggregateHighSchoolPrograms(
      result.data.highSchoolPrograms.map((item: any) => ({
        program: item.program,
        schools: item.schools || [],
      }))
    );

    // Aggregate college programs by CIP code (handles multiple program name variants)
    const aggregatedCollegePrograms = aggregateCollegePrograms(
      result.data.collegePrograms.map((item: any) => ({
        program: item.program,
        campuses: item.campuses || [],
      }))
    );

    // Format college programs for frontend
    const formattedCollegePrograms = formatCollegeProgramsForFrontend(
      aggregatedCollegePrograms
    );

    // Calculate unique schools and campuses
    const uniqueHighSchools = new Set<string>();
    aggregatedHSPrograms.forEach(prog =>
      prog.schools.forEach(s => uniqueHighSchools.add(s))
    );

    const uniqueCollegeCampuses = new Set<string>();
    aggregatedCollegePrograms.forEach(prog =>
      prog.campuses.forEach(c => uniqueCollegeCampuses.add(c))
    );

    // Format the response data for the frontend
    const formattedResponse = {
      success: true,
      message: result.response,
      data: {
        // High school programs with course details
        highSchoolPrograms: aggregatedHSPrograms.map((prog: any) => ({
          name: prog.name,
          schools: prog.schools,
          schoolCount: prog.schoolCount,
          details: prog.details, // Includes coursesByGrade and coursesByLevel
        })),
        // College programs grouped by CIP with all variants
        collegePrograms: formattedCollegePrograms.map((prog: any) => ({
          name: prog.name,
          campuses: prog.campuses,
          campusCount: prog.campusCount,
          variants: prog.variants, // Top 3 specializations (optional)
        })),
        // Careers
        careers: result.data.careers.map((career: any) => ({
          cipCode: career.CIP_CODE || "",
          socCodes: career.SOC_CODE || [],
          title:
            career.SOC_TITLE || career.SOC_CODE?.[0] || "Career Opportunity",
        })),
        // Updated summary with accurate counts
        summary: {
          totalHighSchoolPrograms: aggregatedHSPrograms.length,
          totalHighSchools: uniqueHighSchools.size,
          totalCollegePrograms: aggregatedCollegePrograms.length, // Now accurate by CIP
          totalCollegeCampuses: uniqueCollegeCampuses.size,
          totalCareerPaths: result.data.careers.length,
        },
      },
      profile: result.profile,
      toolsUsed: result.toolsUsed,
      processingTime: Date.now() - startTime,
    };

    console.log(
      `[Pathway API] Success - Processing time: ${formattedResponse.processingTime}ms`
    );
    console.log(
      `[Pathway API] Found: ${formattedResponse.data.summary.totalHighSchoolPrograms} HS programs, ${formattedResponse.data.summary.totalCollegePrograms} college program families`
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
