// app/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters
const rateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(50, "60 s"),
  analytics: true,
});

const apiRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(50, "60 s"),
  analytics: true,
});

// Track request patterns for caching intelligence
async function trackRequestPattern(
  pathname: string,
  query: string,
  ip: string
) {
  try {
    // Track endpoint access frequency
    const endpointKey = `endpoint:${pathname}`;
    await redis.zincrby("popular_endpoints", 1, endpointKey);

    // Track query patterns (for search/query endpoints)
    if (query) {
      const queryKey = `query:${pathname}:${query.toLowerCase().trim()}`;
      await redis.zincrby("popular_queries", 1, queryKey);

      // Track user query history for personalization
      const userQueryKey = `user_queries:${ip}`;
      await redis.lpush(
        userQueryKey,
        JSON.stringify({
          query,
          pathname,
          timestamp: Date.now(),
        })
      );
      await redis.ltrim(userQueryKey, 0, 99); // Keep last 100 queries
      await redis.expire(userQueryKey, 86400 * 7); // 7 days TTL
    }

    // Track time-based patterns
    const hour = new Date().getHours();
    const dayKey = `traffic:${new Date().toISOString().split("T")[0]}:h${hour}`;
    await redis.incr(dayKey);
    await redis.expire(dayKey, 86400 * 30); // 30 days TTL
  } catch (error) {
    console.error("Error tracking request pattern:", error);
  }
}

export async function middleware(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      request.headers.get("x-real-ip") ??
      request.headers.get("cf-connecting-ip") ??
      "127.0.0.1";

    const skipPaths = [
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
      "/_next/static",
      "/_next/image",
      "/images",
      "/api/rate-limit-status",
      "/api/cache-stats", // New endpoint for cache statistics
    ];

    const shouldSkip = skipPaths.some(path =>
      request.nextUrl.pathname.startsWith(path)
    );

    if (shouldSkip) {
      return NextResponse.next();
    }

    const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
    const currentRateLimit = isApiRoute ? apiRateLimit : rateLimit;

    // Track request patterns for caching
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("query") || "";
    await trackRequestPattern(request.nextUrl.pathname, query, ip);

    const { success, limit, reset, remaining } =
      await currentRateLimit.limit(ip);

    // Check if this request can be served from cache
    if (success && isApiRoute) {
      const response = NextResponse.next();

      // Add cache hint headers for API routes
      response.headers.set("X-Cache-Eligible", "true");
      response.headers.set("X-Request-IP", ip);

      // For cacheable endpoints, add cache key hint
      if (
        request.nextUrl.pathname.includes("/ai-pathways") ||
        request.nextUrl.pathname.includes("/direct-search")
      ) {
        const cacheKey = `${request.nextUrl.pathname}:${query || "default"}`;
        response.headers.set("X-Cache-Key-Hint", cacheKey);
      }

      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", limit.toString());
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", reset.toString());

      return response;
    }

    if (!success) {
      const timeRemaining = Math.max(Math.ceil((reset - Date.now()) / 1000), 1);

      const response = NextResponse.json(
        {
          error: "Rate limit exceeded",
          message:
            "You're sending messages too quickly. Please wait a moment before trying again.",
          reset: reset,
          timeRemaining,
          retryAfter: timeRemaining,
        },
        { status: 429 }
      );

      response.headers.set("X-RateLimit-Limit", limit.toString());
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", reset.toString());
      response.headers.set("Retry-After", timeRemaining.toString());

      return response;
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    return response;
  } catch (error) {
    console.error("Error in middleware:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images).*)",
  ],
};
