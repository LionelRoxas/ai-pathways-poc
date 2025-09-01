// app/api/cache-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CacheService } from "../../lib/cache/cache-service";
import { Redis } from "@upstash/redis";

const cache = CacheService.getInstance();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    // Get cache statistics
    const cacheStats = await cache.getStats();

    // Get rate limit statistics
    const [popularEndpoints, popularQueries, recentSearches, cacheKeys] =
      await Promise.all([
        redis.zrange("popular_endpoints", 0, 20, {
          rev: true,
          withScores: true,
        }),
        redis.zrange("popular_queries", 0, 20, { rev: true, withScores: true }),
        redis.zrange("recent_cache_queries", 0, 10, { rev: true }),
        redis.keys("cache:*"),
      ]);

    // Calculate cache hit rate (would need to track this in your middleware)
    const totalRequests = (await redis.get("stats:total_requests")) || 0;
    const cacheHits = (await redis.get("stats:cache_hits")) || 0;
    const hitRate =
      Number(totalRequests) > 0
        ? ((Number(cacheHits) / Number(totalRequests)) * 100).toFixed(2)
        : 0;

    // Get memory usage estimate
    const memorySizeEstimate = cacheKeys?.length
      ? cacheKeys.length * 5000 // Rough estimate: 5KB per entry
      : 0;

    const response = {
      status: "healthy",
      cache: {
        ...cacheStats,
        hitRate: `${hitRate}%`,
        totalEntries: cacheKeys?.length || 0,
        memorySizeEstimate: `${(memorySizeEstimate / 1024 / 1024).toFixed(2)} MB`,
      },
      popular: {
        endpoints: popularEndpoints || [],
        queries: popularQueries || [],
        recentSearches: recentSearches || [],
      },
      performance: {
        totalRequests: Number(totalRequests),
        cacheHits: Number(cacheHits),
        cacheMisses: Number(totalRequests) - Number(cacheHits),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve cache statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST endpoint to track cache hits/misses (called by your API routes)
export async function POST(req: NextRequest) {
  try {
    const { event } = await req.json();

    if (event === "hit") {
      await redis.incr("stats:cache_hits");
    } else if (event === "miss") {
      await redis.incr("stats:cache_misses");
    }

    await redis.incr("stats:total_requests");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking cache event:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
