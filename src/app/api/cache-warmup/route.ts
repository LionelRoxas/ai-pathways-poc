/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/cache-warmup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CacheService } from "../../lib/cache/cache-service";
import Tools from "../../lib/tools/jsonl-tools";

const cache = CacheService.getInstance();

// Popular queries to preload
const POPULAR_QUERIES = [
  "computer science",
  "nursing",
  "business",
  "engineering",
  "healthcare",
  "technology",
  "education",
  "hospitality",
  "agriculture",
  "marine biology",
  "culinary",
  "automotive",
  "construction",
];

export async function POST(req: NextRequest) {
  try {
    const { type = "popular" } = await req.json();

    console.log(`Starting cache warmup: ${type}`);

    let warmedCount = 0;
    const results: any[] = [];

    // Initialize tools
    const hsDataTool = new Tools.HS();
    const collegeDataTool = new Tools.College();
    const pathwayTracer = new Tools.PathwayTracer();

    if (type === "popular" || type === "all") {
      // Warmup popular search queries
      for (const query of POPULAR_QUERIES) {
        try {
          const cacheKey = cache.generateCacheKey("/api/pathway", {
            query: query.toLowerCase().trim(),
          });

          // Check if already cached
          const existing = await cache.get(cacheKey);
          if (existing) {
            results.push({ query, status: "already_cached" });
            continue;
          }

          // Search and trace pathways
          const keywords = [query];
          const pathwayResult = await pathwayTracer.traceFromKeywords(keywords);

          if (pathwayResult) {
            await cache.set(
              cacheKey,
              pathwayResult,
              {
                ttl: 7200, // 2 hours for warmup cache
                tags: ["warmup", "pathway", "search"],
              },
              {
                query,
                totalHighSchoolPrograms: pathwayResult.highSchoolPrograms?.length || 0,
                totalCollegePrograms: pathwayResult.collegePrograms?.length || 0,
                totalCareers: pathwayResult.careers?.length || 0,
                timestamp: new Date().toISOString(),
              }
            );

            warmedCount++;
            results.push({
              query,
              status: "cached",
              hsPrograms: pathwayResult.highSchoolPrograms?.length || 0,
              collegePrograms: pathwayResult.collegePrograms?.length || 0,
              careers: pathwayResult.careers?.length || 0,
            });
          } else {
            results.push({ query, status: "no_results" });
          }
        } catch (error) {
          console.error(`Error warming up query "${query}":`, error);
          results.push({
            query,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown",
          });
        }
      }
    }

    if (type === "programs" || type === "all") {
      // Warmup all high school programs
      try {
        const cacheKey = cache.generateCacheKey("jsonl:getAllHSPrograms", {});
        
        const existing = await cache.get(cacheKey);
        if (!existing) {
          const allPrograms = await hsDataTool.getAllPrograms();
          
          await cache.set(cacheKey, allPrograms, {
            ttl: 7200,
            tags: ["warmup", "hs_programs"],
          });

          warmedCount++;
          results.push({
            type: "All HS Programs",
            status: "cached",
            count: allPrograms.length,
          });
        } else {
          results.push({
            type: "All HS Programs",
            status: "already_cached",
          });
        }
      } catch (error) {
        console.error("Error warming up HS programs:", error);
        results.push({
          type: "All HS Programs",
          status: "error",
        });
      }

      // Warmup all college programs
      try {
        const cacheKey = cache.generateCacheKey("jsonl:getAllCollegePrograms", {});
        
        const existing = await cache.get(cacheKey);
        if (!existing) {
          const allPrograms = await collegeDataTool.getAllPrograms();
          
          await cache.set(cacheKey, allPrograms, {
            ttl: 7200,
            tags: ["warmup", "college_programs"],
          });

          warmedCount++;
          results.push({
            type: "All College Programs",
            status: "cached",
            count: allPrograms.length,
          });
        } else {
          results.push({
            type: "All College Programs",
            status: "already_cached",
          });
        }
      } catch (error) {
        console.error("Error warming up college programs:", error);
        results.push({
          type: "All College Programs",
          status: "error",
        });
      }
    }

    // Preload the cache service's popular queries tracking
    await cache.preloadPopularQueries();

    return NextResponse.json({
      success: true,
      message: `Cache warmup completed: ${warmedCount} entries cached`,
      warmedCount,
      type,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cache warmup error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Cache warmup failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check warmup status
export async function GET() {
  try {
    const cacheStats = await cache.getStats();

    return NextResponse.json({
      status: "ready",
      message: "Cache warmup service available",
      currentCache: cacheStats,
      availableTypes: ["popular", "programs", "all"],
      popularQueries: POPULAR_QUERIES,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking warmup status:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to check warmup status",
      },
      { status: 500 }
    );
  }
}
