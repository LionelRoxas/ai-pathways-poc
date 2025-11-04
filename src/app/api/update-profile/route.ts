/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/update-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateComprehensiveProfile } from "@/app/lib/agents/profile-update-agent";

/**
 * TIER 3: Deep Profile Update API
 * 
 * Now that TIER 1 micro-updates keep profiles current, this is less critical.
 * Used for periodic validation and summary regeneration.
 * 
 * Recommended intervals: [20, 40, 60] (down from [15, 25, 35, 50])
 */

// Main API handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transcript,
      existingProfile,
      existingExtracted,
      userMessageCount,
      conversationMetrics,
      language = "en",
    } = body;

    console.log("[Update Profile API] 🔄 TIER 3 Deep Refresh Request");
    console.log(`[Update Profile API] Language: ${language}, Messages: ${userMessageCount}`);

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Invalid transcript format" },
        { status: 400 }
      );
    }

    if (!existingProfile || !existingExtracted) {
      return NextResponse.json(
        { error: "Existing profile required for update" },
        { status: 400 }
      );
    }

    // NOTE: Threshold lowered since micro-updates may have already enriched profile
    // Was: 15, Now: 12 (TIER 1 keeps profile current between deep refreshes)
    if (userMessageCount < 12) {
      return NextResponse.json(
        {
          error: "Insufficient new conversation data",
          needMoreMessages: true,
          currentCount: userMessageCount,
          requiredCount: 12,
          note: "TIER 1 micro-updates may have already updated your profile",
        },
        { status: 400 }
      );
    }

    // Call the profile update agent
    const updatedProfile = await updateComprehensiveProfile(
      transcript,
      existingProfile,
      existingExtracted,
      conversationMetrics,
      language
    );

    if (!updatedProfile) {
      // Return existing profile if update fails
      return NextResponse.json({
        profile: existingProfile,
        extracted: existingExtracted,
        confidence: existingExtracted?.confidence || {
          overall: 85,
          dataQuality: 85,
          completeness: 90,
        },
        isComplete: true,
        updateFailed: true,
        metadata: {
          userMessageCount,
          updatedAt: new Date().toISOString(),
          conversationMetrics,
          language,
        },
      });
    }

    // Only return updated profile if confidence is reasonable
    if (updatedProfile.confidence.overall < 30) {
      return NextResponse.json(
        {
          error: "Insufficient information for reliable profile update",
          message: "Continuing with existing profile",
          profile: existingProfile,
          extracted: existingExtracted,
          confidence: existingExtracted?.confidence,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      profile: updatedProfile.summary,
      extracted: updatedProfile.extracted,
      confidence: updatedProfile.confidence,
      isComplete: true,
      updated: true,
      metadata: {
        userMessageCount,
        updatedAt: new Date().toISOString(),
        conversationMetrics,
        updateNumber: Math.floor((userMessageCount - 7) / 8) + 1, // Track which update this is
        language,
      },
    });
  } catch (error) {
    console.error("Profile update API error:", error);

    // Try to return existing profile on error
    try {
      const {
        existingProfile,
        existingExtracted,
        language = "en",
      } = await request.json();
      return NextResponse.json({
        profile: existingProfile,
        extracted: existingExtracted,
        confidence: existingExtracted?.confidence || {
          overall: 85,
          dataQuality: 85,
          completeness: 90,
        },
        isComplete: true,
        error: "Update failed, using existing profile",
        language,
      });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "profile-update-generation",
    version: "4.0",
    tier: "TIER 3 - Deep Profile Refresh",
    description: "Periodic validation and summary regeneration (less frequent now that TIER 1 micro-updates exist)",
    features: {
      comprehensiveUpdate: true,
      profileMerging: true,
      confidenceScoring: true,
      hawaiiContextAware: true,
      fallbackProcessing: true,
      incrementalImprovement: true,
      multiLanguageSupport: true,
      supportedLanguages: ["en", "haw", "hwp", "tl"],
      microUpdateAware: true, // NEW: Preserves TIER 1 micro-updates
    },
    updateIntervals: {
      recommended: [20, 40, 60],
      legacy: [15, 25, 35, 50],
      note: "Less frequent intervals recommended now that TIER 1 handles incremental updates",
    },
    tiers: {
      tier1: "Instant micro-updates (FREE, in orchestrator)",
      tier2: "Smart incremental updates (future)",
      tier3: "Deep profile refresh (this API)",
    },
    timestamp: new Date().toISOString(),
  });
}
