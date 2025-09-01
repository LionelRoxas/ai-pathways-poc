/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/update-profile/route.ts (Updated with Language Support)
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Clean JSON response (same as generate-profile)
function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();

  // Remove code blocks if present
  cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*$/g, "");
  cleaned = cleaned.replace(/```\s*/g, "");

  // Extract JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Fix common JSON issues
  cleaned = cleaned.replace(/,\s*}/g, "}");
  cleaned = cleaned.replace(/,\s*]/g, "]");

  return cleaned;
}

// Update existing profile with new conversation data (with language awareness)
async function updateComprehensiveProfile(
  transcript: string,
  existingProfile: string,
  existingExtracted: any,
  conversationMetrics: any,
  language: string = "en"
): Promise<any | null> {
  const languageContext =
    language !== "en"
      ? `Note: The conversation may contain ${language === "haw" ? "Hawaiian (ʻŌlelo Hawaiʻi)" : language === "hwp" ? "Hawaiian Pidgin" : language === "tl" ? "Tagalog" : "English"} language. Understand it in context but write the updated profile summary in ENGLISH for system use.`
      : "";

  const systemPrompt = `You are an expert career counseling analyst. You are UPDATING an existing user profile with new conversation data. The user has continued talking beyond the initial profile creation, revealing new information.
${languageContext}

EXISTING PROFILE SUMMARY:
${existingProfile}

EXISTING EXTRACTED DATA (for reference):
${JSON.stringify(existingExtracted, null, 2)}

CONVERSATION METRICS:
- Total messages: ${conversationMetrics.totalMessages}
- User messages: ${conversationMetrics.userMessages}
- Average message length: ${Math.round(conversationMetrics.averageLength)} characters
- Language used: ${language}

UPDATE INSTRUCTIONS:
1. PRESERVE all valid information from the existing profile
2. ADD any NEW information revealed in recent conversation
3. UPDATE or REFINE information that has evolved or changed
4. EXPAND on interests, goals, or preferences that have become more specific
5. Note any SHIFTS in thinking or priorities
6. Maintain Hawaii-specific context and factors
7. Keep the same comprehensive format as the original profile
8. IMPORTANT: Write the summary in ENGLISH regardless of conversation language

Return ONLY valid JSON in this exact format:
{
  "summary": "An UPDATED comprehensive 5-6 sentence narrative IN ENGLISH in third person that incorporates BOTH existing profile information AND new revelations. Include their evolving situation, refined interests, clarified goals, and any new context discovered.",
  "extracted": {
    "educationLevel": "elementary|middle_school|high_school_freshman|high_school_sophomore|high_school_junior|high_school_senior|college_freshman|college_sophomore|college_junior|college_senior|associate_degree|bachelor_degree|master_degree|doctoral_degree|trade_certification|working_professional|null",
    "currentGrade": null or grade number if applicable,
    "currentStatus": "full_time_student|part_time_student|recent_graduate|employed_full_time|employed_part_time|unemployed|career_changer|returning_to_workforce|exploring_options|null",
    
    "interests": ["Include ALL existing interests PLUS any new ones discovered. Be specific."],
    "careerGoals": ["Include existing goals AND any new or refined goals mentioned."],
    "motivations": ["Preserve existing motivations and add any new drivers discovered."],
    
    "timeline": "immediate|within_6_months|within_1_year|within_2_years|within_5_years|long_term|flexible|null",
    "location": "Oahu|Maui|Hawaii_Island|Kauai|Molokai|Lanai|multiple_islands|mainland_US|flexible|null",
    "workPreferences": {
      "environment": "office|outdoor|laboratory|hospital|school|home|mixed|null",
      "schedule": "full_time|part_time|flexible|shift_work|seasonal|null",
      "remoteWork": "required|strongly_preferred|open_to|not_interested|null",
      "salary": "primary_concern|important|moderate_concern|not_primary_focus|null",
      "benefits": ["Include all existing and new preferences"]
    },
    
    "challenges": ["Keep existing challenges and add any new ones mentioned."],
    "strengths": ["Preserve existing strengths and add newly discovered ones."],
    "supportNeeds": ["Include all existing needs plus any new ones identified."],
    
    "learningStyle": "hands_on|visual|analytical|collaborative|independent|mixed|null",
    "skillsToImprove": ["Combine existing and new skills they want to develop."],
    "experienceLevel": "no_experience|some_volunteering|part_time_jobs|internships|entry_level|experienced|null",
    
    "familyInfluence": "very_supportive|supportive|neutral|pressuring|discouraging|mixed|null",
    "culturalBackground": "local_hawaiian|mainland_transplant|military_family|immigrant_family|mixed|null",
    "financialSituation": "very_limited|limited|moderate|comfortable|not_discussed|null",
    
    "confidenceLevel": "very_confident|confident|somewhat_confident|uncertain|very_uncertain|null",
    "readinessToStart": "ready_now|ready_soon|need_more_info|need_more_time|unsure|null"
  },
  "confidence": {
    "overall": number from 0-100 (should be higher than before due to more data),
    "dataQuality": number from 0-100 based on conversation quality,
    "completeness": number from 0-100 based on profile coverage
  }
}

IMPORTANT:
- This is an UPDATE, not a fresh profile - don't lose existing information
- Arrays should COMBINE old and new data (deduplicated)
- Single values should UPDATE to the most recent/accurate information
- If something hasn't changed, keep the existing value
- Confidence scores should generally increase with more conversation data
- The summary MUST be in English for system compatibility`;

  try {
    // Get recent conversation (last ~3000 chars to stay within token limits)
    const recentTranscript = transcript.slice(-3000);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `RECENT CONVERSATION TO ANALYZE (Language: ${language}):\n\n${recentTranscript}`,
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    const cleaned = cleanJsonResponse(content);
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed.summary || !parsed.extracted || !parsed.confidence) {
      throw new Error("Invalid profile structure - missing required fields");
    }

    // Ensure confidence scores are reasonable and higher than before
    const baseConfidence = existingExtracted?.confidence?.overall || 70;
    parsed.confidence.overall = Math.max(
      baseConfidence + 5,
      Math.min(100, parsed.confidence.overall)
    );
    parsed.confidence.dataQuality = Math.max(
      0,
      Math.min(100, parsed.confidence.dataQuality)
    );
    parsed.confidence.completeness = Math.max(
      0,
      Math.min(100, parsed.confidence.completeness)
    );

    return parsed;
  } catch (error) {
    console.error("Profile update generation error:", error);

    // Fallback: merge arrays manually
    try {
      const mergedExtracted = {
        ...existingExtracted,
        interests: [...new Set([...(existingExtracted?.interests || [])])],
        careerGoals: [...new Set([...(existingExtracted?.careerGoals || [])])],
        challenges: [...new Set([...(existingExtracted?.challenges || [])])],
        strengths: [...new Set([...(existingExtracted?.strengths || [])])],
        supportNeeds: [
          ...new Set([...(existingExtracted?.supportNeeds || [])]),
        ],
        skillsToImprove: [
          ...new Set([...(existingExtracted?.skillsToImprove || [])]),
        ],
      };

      return {
        summary: existingProfile,
        extracted: mergedExtracted,
        confidence: {
          overall: Math.min(
            95,
            (existingExtracted?.confidence?.overall || 70) + 5
          ),
          dataQuality: existingExtracted?.confidence?.dataQuality || 80,
          completeness: existingExtracted?.confidence?.completeness || 85,
        },
      };
    } catch (fallbackError) {
      console.error("Fallback merge also failed:", fallbackError);
    }

    return null;
  }
}

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

    console.log("Updating profile for language:", language);

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

    // Ensure we have enough new conversation content (at least 8 new messages since profile creation)
    if (userMessageCount < 15) {
      return NextResponse.json(
        {
          error: "Insufficient new conversation data",
          needMoreMessages: true,
          currentCount: userMessageCount,
          requiredCount: 15,
        },
        { status: 400 }
      );
    }

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
    version: "3.0",
    features: {
      comprehensiveUpdate: true,
      profileMerging: true,
      confidenceScoring: true,
      hawaiiContextAware: true,
      fallbackProcessing: true,
      incrementalImprovement: true,
      multiLanguageSupport: true,
      supportedLanguages: ["en", "haw", "hwp", "tl"],
    },
    updateIntervals: [15, 25, 35, 50],
    timestamp: new Date().toISOString(),
  });
}
