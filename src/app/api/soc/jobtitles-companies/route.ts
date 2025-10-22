/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/soc/jobtitles-companies/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/soc/jobtitles-companies?soc5=11-3121,13-1071
 * Proxy to Hawaii Career Explorer API - Job Titles & Companies
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

    console.log(
      `[SOC Job Titles Companies API] Fetching for SOC codes: ${soc5}`
    );

    const externalUrl = `https://careerexplorer.hawaii.edu/api_pathways/soc5_to_jobtitles_companies.php?soc5=${soc5}`;

    const response = await fetch(externalUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[SOC Job Titles Companies API] External API error: ${response.status}`
      );
      return NextResponse.json(
        { error: `External API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[SOC Job Titles Companies API] Success - received data`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[SOC Job Titles Companies API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch job titles companies data",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
