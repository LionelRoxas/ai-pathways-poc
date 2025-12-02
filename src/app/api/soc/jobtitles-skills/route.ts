/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/soc/jobtitles-skills/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/soc/jobtitles-skills?soc5=11-3121,13-1071
 * Proxy to Hawaii Career Explorer API - Job Titles & Skills
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

    console.log(`[SOC Job Titles Skills API] Fetching for SOC codes: ${soc5}`);

    const jwtToken = process.env.JWT_TOKEN_SECRET;
    if (!jwtToken) {
      console.error("[SOC Job Titles Skills API] JWT_TOKEN_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const externalUrl = `https://careerexplorer.hawaii.edu/api/kamaaina_pathways/soc5_to_jobtitles_skills.php?t=${jwtToken}&soc5=${soc5}`;
    console.log(`[SOC Job Titles Skills API] Calling URL: ${externalUrl.replace(jwtToken, '[REDACTED]')}`);

    const response = await fetch(externalUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Origin: "https://kamaaina-pathways.vercel.app",
        Referer: "https://kamaaina-pathways.vercel.app/",
      },
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(
        `[SOC Job Titles Skills API] External API error: ${response.status}`,
        responseText
      );
      return NextResponse.json(
        { 
          error: `External API returned ${response.status}`,
          details: responseText 
        },
        { status: response.status }
      );
    }

    let data;
    
    // Check if response is JSON or PHP array output
    const trimmedResponse = responseText.trim();
    if (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')) {
      // It's JSON - parse normally
      data = JSON.parse(responseText);
    } else if (trimmedResponse.includes('<pre>Array') || trimmedResponse.includes('Array\n(')) {
      // It's PHP print_r output - convert to JSON (workaround)
      console.log(`[SOC Job Titles Skills API] ⚠️  Received PHP array, converting to JSON...`);
      try {
        // Extract JSON from PHP serialized format by trying to find the actual data
        // This is a temporary workaround - the API should return proper JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, try to parse as PHP and convert (very basic conversion)
          throw new Error('Could not extract JSON from PHP output');
        }
      } catch (conversionError: any) {
        console.error(`[SOC Job Titles Skills API] Failed to convert PHP output:`, conversionError.message);
        return NextResponse.json(
          { 
            error: 'API returned PHP array instead of JSON. Please contact API administrator.',
            details: responseText.substring(0, 500)
          },
          { status: 502 }
        );
      }
    } else {
      console.error(`[SOC Job Titles Skills API] Response is not JSON:`, responseText.substring(0, 500));
      return NextResponse.json(
        { 
          error: 'API returned unexpected format',
          details: responseText.substring(0, 500)
        },
        { status: 502 }
      );
    }

    console.log(`[SOC Job Titles Skills API] Success - received data`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[SOC Job Titles Skills API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch job titles skills data",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
