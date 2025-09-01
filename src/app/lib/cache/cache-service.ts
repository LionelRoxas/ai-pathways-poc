/* eslint-disable @typescript-eslint/no-explicit-any */
// app/lib/cache/cache-service.ts
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  version?: string; // Cache version for breaking changes
}

interface CacheEntry {
  data: any;
  timestamp: number;
  hits: number;
  tags?: string[];
  version?: string;
  metadata?: {
    userProfile?: string;
    queryIntent?: string;
    resultCount?: number;
  };
}

export class CacheService {
  private static instance: CacheService;
  private readonly defaultTTL = 3600; // 1 hour default
  private readonly version = "v1";

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Generate cache key with normalization
  generateCacheKey(
    endpoint: string,
    params: Record<string, any>,
    userProfile?: string
  ): string {
    // Normalize and sort parameters for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          if (params[key] !== undefined && params[key] !== null) {
            acc[key] =
              typeof params[key] === "object"
                ? JSON.stringify(params[key])
                : String(params[key]).toLowerCase().trim();
          }
          return acc;
        },
        {} as Record<string, string>
      );

    // Create a deterministic key
    const baseKey = `${endpoint}:${JSON.stringify(sortedParams)}`;

    // If profile-specific, add profile hash
    if (userProfile) {
      const profileHash = crypto
        .createHash("md5")
        .update(userProfile)
        .digest("hex")
        .substring(0, 8);
      return `cache:${this.version}:profile:${profileHash}:${baseKey}`;
    }

    return `cache:${this.version}:global:${baseKey}`;
  }

  // Get from cache with hit tracking
  async get(key: string): Promise<any | null> {
    try {
      const entry = await redis.get<CacheEntry>(key);

      if (!entry) {
        return null;
      }

      // Update hit count asynchronously
      this.incrementHitCount(key, entry);

      return entry.data;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  // Set cache with metadata
  async set(
    key: string,
    data: any,
    options: CacheOptions = {},
    metadata?: any
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;

      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        hits: 0,
        tags: options.tags,
        version: options.version || this.version,
        metadata,
      };

      await redis.set(key, entry, { ex: ttl });

      // Track cache patterns
      await this.trackCachePattern(key, options.tags);
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  // Semantic cache lookup for similar queries
  async findSimilar(
    query: string,
    threshold: number = 0.8
  ): Promise<any | null> {
    try {
      // Get recent similar queries
      const recentQueries = await redis.zrange<string[]>(
        "recent_cache_queries",
        0,
        50,
        { rev: true }
      );

      // Simple similarity check (you could enhance this with embeddings)
      const queryWords = query.toLowerCase().split(/\s+/);

      for (const cachedQuery of recentQueries) {
        const cachedWords = cachedQuery.toLowerCase().split(/\s+/);
        const similarity = this.calculateSimilarity(queryWords, cachedWords);

        if (similarity >= threshold) {
          // Found similar query, check if cache exists
          const cacheKey = `cache:${this.version}:query:${cachedQuery}`;
          const cached = await this.get(cacheKey);
          if (cached) {
            console.log(
              `Found similar cached query: ${cachedQuery} (similarity: ${similarity})`
            );
            return cached;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Semantic cache lookup error:", error);
      return null;
    }
  }

  // Calculate Jaccard similarity between word sets
  private calculateSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  // Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await redis.smembers<string[]>(`cache:tag:${tag}`);
        if (keys && keys.length > 0) {
          await redis.del(...keys);
          await redis.del(`cache:tag:${tag}`);
        }
      }
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      const [popularEndpoints, popularQueries, cacheKeys] = await Promise.all([
        redis.zrange("popular_endpoints", 0, 10, {
          rev: true,
          withScores: true,
        }),
        redis.zrange("popular_queries", 0, 10, { rev: true, withScores: true }),
        redis.keys("cache:*"),
      ]);

      return {
        totalCacheEntries: cacheKeys?.length || 0,
        popularEndpoints: popularEndpoints || [],
        popularQueries: popularQueries || [],
        cacheVersion: this.version,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return null;
    }
  }

  // Private helper methods
  private async incrementHitCount(
    key: string,
    entry: CacheEntry
  ): Promise<void> {
    try {
      entry.hits++;
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        await redis.set(key, entry, { ex: ttl });
      }
    } catch (error) {
      console.error("Error incrementing hit count:", error);
    }
  }

  private async trackCachePattern(key: string, tags?: string[]): Promise<void> {
    try {
      // Track cache key creation time
      await redis.zadd("cache_keys_by_time", {
        score: Date.now(),
        member: key,
      });

      // Track tags
      if (tags) {
        for (const tag of tags) {
          await redis.sadd(`cache:tag:${tag}`, key);
        }
      }
    } catch (error) {
      console.error("Error tracking cache pattern:", error);
    }
  }

  // Preload frequently accessed data
  async preloadPopularQueries(): Promise<void> {
    try {
      const popularQueries = await redis.zrange<string[]>(
        "popular_queries",
        0,
        20,
        { rev: true }
      );

      console.log(`Preloading ${popularQueries?.length || 0} popular queries`);

      // You can trigger actual data fetching here if needed
      // This would integrate with your MCP server
    } catch (error) {
      console.error("Error preloading popular queries:", error);
    }
  }
}
