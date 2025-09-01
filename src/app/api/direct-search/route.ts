// app/api/direct-search/route.ts (Enhanced with Caching)
import { NextRequest, NextResponse } from "next/server";
import { handleMCPRequest } from "../../lib/mcp/pathways-mcp-server";
import { expandSearchTerms } from "../../utils/groqClient";
import { CacheService } from "../../lib/cache/cache-service";

const cache = CacheService.getInstance();

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    console.log("Direct search for:", query);

    // Generate cache key for this search
    const cacheKey = cache.generateCacheKey("/api/direct-search", {
      query: query.toLowerCase().trim(),
    });

    // Check cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log("Serving search from cache:", cacheKey);

      const response = NextResponse.json(cachedResult);
      response.headers.set("X-Cache", "HIT");
      response.headers.set("X-Cache-Key", cacheKey);
      return response;
    }

    // Check for similar searches (semantic cache)
    const similarSearch = await cache.findSimilar(query, 0.8);
    if (similarSearch) {
      console.log("Serving similar search from cache");

      const response = NextResponse.json(similarSearch);
      response.headers.set("X-Cache", "SIMILAR");
      return response;
    }

    // Expand search terms for better matching
    const expandedTerms = expandSearchTerms(query);
    console.log("Expanded terms:", expandedTerms);

    // Check if the MCP search itself is cached
    const mcpCacheKey = cache.generateCacheKey("mcp:searchPrograms", {
      query: query,
      expandedTerms: expandedTerms,
      type: "all",
      limit: 100,
      getAllMatches: true,
    });

    let searchResult = await cache.get(mcpCacheKey);

    if (!searchResult) {
      // Search all programs using MCP
      searchResult = await handleMCPRequest({
        tool: "searchPrograms",
        params: {
          query: query,
          expandedTerms: expandedTerms,
          type: "all",
          limit: 100,
          getAllMatches: true,
        },
      });

      if (searchResult.success) {
        // Cache the MCP result
        await cache.set(
          mcpCacheKey,
          searchResult,
          {
            ttl: 3600, // 1 hour
            tags: ["mcp_search", "searchPrograms"],
          },
          {
            query,
            expandedTerms,
          }
        );
      }
    } else {
      console.log("Using cached MCP search result");
    }

    if (!searchResult.success) {
      console.error("Search failed:", searchResult.error);
      return NextResponse.json(
        {
          error: "Search failed",
          results: { uhPrograms: [], doePrograms: [] },
        },
        { status: 500 }
      );
    }

    // Format the results
    const results = {
      uhPrograms: searchResult.data?.uhPrograms || [],
      doePrograms: searchResult.data?.doePrograms || [],
    };

    // Log result counts
    console.log("Search results:", {
      uhPrograms: results.uhPrograms.length,
      doePrograms: results.doePrograms.length,
      totalResults: results.uhPrograms.length + results.doePrograms.length,
    });

    // If no results, try a more general search
    if (results.uhPrograms.length === 0 && results.doePrograms.length === 0) {
      console.log("No results found, trying broader search...");

      // Try searching with just the first word
      const firstWord = query.split(" ")[0];
      if (firstWord !== query) {
        // Check cache for broader search
        const broaderCacheKey = cache.generateCacheKey("mcp:searchPrograms", {
          query: firstWord,
          type: "all",
          limit: 50,
        });

        let broaderResult = await cache.get(broaderCacheKey);

        if (!broaderResult) {
          broaderResult = await handleMCPRequest({
            tool: "searchPrograms",
            params: {
              query: firstWord,
              type: "all",
              limit: 50,
            },
          });

          if (broaderResult.success) {
            // Cache the broader result
            await cache.set(broaderCacheKey, broaderResult, {
              ttl: 3600,
              tags: ["mcp_search", "searchPrograms", "broader"],
            });
          }
        }

        if (broaderResult.success && broaderResult.data) {
          results.uhPrograms = broaderResult.data.uhPrograms || [];
          results.doePrograms = broaderResult.data.doePrograms || [];
        }
      }
    }

    const responseData = {
      success: true,
      results,
      metadata: {
        query,
        expandedTerms,
        totalResults: results.uhPrograms.length + results.doePrograms.length,
        timestamp: new Date().toISOString(),
      },
    };

    // Cache the final response
    const cacheTTL = responseData.metadata.totalResults > 0 ? 3600 : 300; // 1 hour if results, 5 min otherwise
    await cache.set(
      cacheKey,
      responseData,
      {
        ttl: cacheTTL,
        tags: ["direct_search", "search_response"],
      },
      {
        query,
        resultCount: responseData.metadata.totalResults,
      }
    );

    // Track popular searches
    await cache.findSimilar(query, 0); // This also tracks the query

    const response = NextResponse.json(responseData);
    response.headers.set("X-Cache", "MISS");
    response.headers.set("X-Cache-Key", cacheKey);

    return response;
  } catch (error) {
    console.error("Direct search API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        results: { uhPrograms: [], doePrograms: [] },
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const cacheStats = await cache.getStats();

  return NextResponse.json({
    status: "healthy",
    service: "direct-search",
    cache: cacheStats,
    features: {
      expandedSearch: true,
      fallbackSearch: true,
      allProgramTypes: true,
      caching: true,
      semanticCache: true,
    },
    timestamp: new Date().toISOString(),
  });
}
