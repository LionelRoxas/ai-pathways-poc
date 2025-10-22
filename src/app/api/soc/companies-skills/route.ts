/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/soc/companies-skills/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/soc/companies-skills?soc5=11-3121,13-1071
 * Proxy to Hawaii Career Explorer API - Companies & Skills
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const soc5 = searchParams.get("soc5");

    if (!soc5) {
      return NextResponse.json(
        { error: "soc5 parameter is required" },
        { status: 400 }
      );
    }

    console.log(`[SOC Companies Skills API] Fetching for SOC codes: ${soc5}`);

    const externalUrl = `https://careerexplorer.hawaii.edu/api_pathways/soc5_to_companies_skills.php?soc5=${soc5}`;

    const response = await fetch(externalUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[SOC Companies Skills API] External API error: ${response.status}`
      );
      return NextResponse.json(
        { error: `External API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[SOC Companies Skills API] Success - received data`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[SOC Companies Skills API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch companies skills data",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
