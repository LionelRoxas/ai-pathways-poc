// app/api/direct-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleMCPRequest } from "../../lib/mcp/pathways-mcp-server";
import { expandSearchTerms } from "../../utils/groqClient";

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

    // Expand search terms for better matching
    const expandedTerms = expandSearchTerms(query);
    console.log("Expanded terms:", expandedTerms);

    // Search all programs using MCP
    const searchResult = await handleMCPRequest({
      tool: "searchPrograms",
      params: {
        query: query,
        expandedTerms: expandedTerms,
        type: "all",
        limit: 100,
        getAllMatches: true,
      },
    });

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
        const broaderResult = await handleMCPRequest({
          tool: "searchPrograms",
          params: {
            query: firstWord,
            type: "all",
            limit: 50,
          },
        });

        if (broaderResult.success && broaderResult.data) {
          results.uhPrograms = broaderResult.data.uhPrograms || [];
          results.doePrograms = broaderResult.data.doePrograms || [];
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      metadata: {
        query,
        expandedTerms,
        totalResults: results.uhPrograms.length + results.doePrograms.length,
        timestamp: new Date().toISOString(),
      },
    });
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
  return NextResponse.json({
    status: "healthy",
    service: "direct-search",
    features: {
      expandedSearch: true,
      fallbackSearch: true,
      allProgramTypes: true,
    },
    timestamp: new Date().toISOString(),
  });
}
