// src/app/api/pathway-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PathwayPlanningAgent } from "@/app/lib/agents/pathway-planning-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/pathway-plan
 * Generate a personalized educational pathway plan
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { userProfile, conversationContext, programsFound, socCodes } = body;

    console.log('[Pathway Plan API] 🗺️  Generating pathway plan');
    console.log('[Pathway Plan API] User profile:', userProfile ? 'Yes' : 'No');
    console.log('[Pathway Plan API] Conversation context length:', conversationContext?.length || 0);
    console.log('[Pathway Plan API] Programs found:', programsFound?.length || 0);
    console.log('[Pathway Plan API] SOC codes:', socCodes?.length || 0);

    const agent = new PathwayPlanningAgent();
    const result = await agent.generatePathwayPlan({
      userProfile,
      conversationContext,
      programsFound,
      socCodes,
    });

    const processingTime = Date.now() - startTime;
    console.log(`[Pathway Plan API] ✅ Success - Processing time: ${processingTime}ms`);

    return NextResponse.json(result);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[Pathway Plan API] ❌ Error:', error);
    console.error(`[Pathway Plan API] Failed after ${processingTime}ms`);

    return NextResponse.json(
      {
        error: "Failed to generate pathway plan",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
