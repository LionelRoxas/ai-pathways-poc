/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/cache-warmup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CacheService } from "../../lib/cache/cache-service";
import { handleMCPRequest } from "../../lib/mcp/pathways-mcp-server";

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
];

const POPULAR_LOCATIONS = ["Oahu", "Maui", "Hawaii Island", "Kauai"];

export async function POST(req: NextRequest) {
  try {
    const { type = "popular" } = await req.json();

    console.log(`Starting cache warmup: ${type}`);

    let warmedCount = 0;
    const results: any[] = [];

    if (type === "popular" || type === "all") {
      // Warmup popular search queries
      for (const query of POPULAR_QUERIES) {
        try {
          const cacheKey = cache.generateCacheKey("/api/direct-search", {
            query: query.toLowerCase().trim(),
          });

          // Check if already cached
          const existing = await cache.get(cacheKey);
          if (existing) {
            results.push({ query, status: "already_cached" });
            continue;
          }

          // Fetch and cache
          const searchResult = await handleMCPRequest({
            tool: "searchPrograms",
            params: {
              query: query,
              type: "all",
              limit: 50,
            },
          });

          if (searchResult.success) {
            await cache.set(
              cacheKey,
              {
                success: true,
                results: {
                  uhPrograms: searchResult.data?.uhPrograms || [],
                  doePrograms: searchResult.data?.doePrograms || [],
                },
                metadata: {
                  query,
                  totalResults:
                    (searchResult.data?.uhPrograms?.length || 0) +
                    (searchResult.data?.doePrograms?.length || 0),
                  timestamp: new Date().toISOString(),
                },
              },
              {
                ttl: 7200, // 2 hours for warmup cache
                tags: ["warmup", "search"],
              }
            );

            warmedCount++;
            results.push({
              query,
              status: "cached",
              resultCount: searchResult.data?.length,
            });
          } else {
            results.push({ query, status: "failed" });
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
      // Warmup UH programs by location
      for (const location of POPULAR_LOCATIONS) {
        try {
          const cacheKey = cache.generateCacheKey("mcp:getUHPrograms", {
            location,
            limit: 100,
          });

          const existing = await cache.get(cacheKey);
          if (existing) {
            results.push({
              type: "UH Programs",
              location,
              status: "already_cached",
            });
            continue;
          }

          const result = await handleMCPRequest({
            tool: "getUHPrograms",
            params: {
              location,
              limit: 100,
            },
          });

          if (result.success) {
            await cache.set(cacheKey, result, {
              ttl: 7200,
              tags: ["warmup", "uh_programs"],
            });

            warmedCount++;
            results.push({
              type: "UH Programs",
              location,
              status: "cached",
              count: result.data?.length,
            });
          }
        } catch (error) {
          console.error(`Error warming up UH programs for ${location}:`, error);
          results.push({
            type: "UH Programs",
            location,
            status: "error",
          });
        }
      }
    }

    if (type === "stats" || type === "all") {
      // Warmup database statistics
      try {
        const cacheKey = cache.generateCacheKey("mcp:getDatabaseStats", {});

        const existing = await cache.get(cacheKey);
        if (!existing) {
          const statsResult = await handleMCPRequest({
            tool: "getDatabaseStats",
            params: {},
          });

          if (statsResult.success) {
            await cache.set(cacheKey, statsResult, {
              ttl: 3600,
              tags: ["warmup", "stats"],
            });

            warmedCount++;
            results.push({ type: "Database Stats", status: "cached" });
          }
        } else {
          results.push({ type: "Database Stats", status: "already_cached" });
        }
      } catch (error) {
        console.error("Error warming up stats:", error);
        results.push({ type: "Database Stats", status: "error" });
      }
    }

    // Also preload the cache service's popular queries tracking
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
      availableTypes: ["popular", "programs", "stats", "all"],
      popularQueries: POPULAR_QUERIES,
      locations: POPULAR_LOCATIONS,
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
