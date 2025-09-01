// app/api/cache-invalidate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CacheService } from "../../lib/cache/cache-service";
import { Redis } from "@upstash/redis";

const cache = CacheService.getInstance();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { tags, pattern, all } = await req.json();

    let invalidatedCount = 0;

    if (all === true) {
      // Clear all cache entries
      const cacheKeys = await redis.keys("cache:*");
      if (cacheKeys && cacheKeys.length > 0) {
        await redis.del(...cacheKeys);
        invalidatedCount = cacheKeys.length;
      }

      // Reset stats
      await redis.set("stats:cache_hits", 0);
      await redis.set("stats:cache_misses", 0);
      await redis.set("stats:total_requests", 0);

      return NextResponse.json({
        success: true,
        message: `Cleared all cache entries: ${invalidatedCount} keys deleted`,
        invalidatedCount,
      });
    }

    if (tags && Array.isArray(tags)) {
      // Invalidate by tags
      await cache.invalidateByTags(tags);

      return NextResponse.json({
        success: true,
        message: `Invalidated cache entries with tags: ${tags.join(", ")}`,
        tags,
      });
    }

    if (pattern) {
      // Invalidate by pattern
      const keys = await redis.keys(`cache:*${pattern}*`);
      if (keys && keys.length > 0) {
        await redis.del(...keys);
        invalidatedCount = keys.length;
      }

      return NextResponse.json({
        success: true,
        message: `Invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`,
        invalidatedCount,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Please provide tags, pattern, or all flag for invalidation",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Cache invalidation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Cache invalidation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check what would be invalidated
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const pattern = searchParams.get("pattern");
    const tag = searchParams.get("tag");

    let keys: string[] = [];

    if (pattern) {
      keys = (await redis.keys(`cache:*${pattern}*`)) || [];
    } else if (tag) {
      keys = (await redis.smembers(`cache:tag:${tag}`)) || [];
    } else {
      keys = (await redis.keys("cache:*")) || [];
    }

    return NextResponse.json({
      totalKeys: keys.length,
      sampleKeys: keys.slice(0, 10),
      message: `Found ${keys.length} cache entries`,
    });
  } catch (error) {
    console.error("Error checking cache entries:", error);
    return NextResponse.json(
      {
        error: "Failed to check cache entries",
      },
      { status: 500 }
    );
  }
}
