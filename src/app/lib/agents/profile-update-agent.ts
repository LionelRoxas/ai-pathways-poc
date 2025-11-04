/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/profile-update-agent.ts

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Profile Update Agent
 * 
 * Handles TIER 3 deep profile refresh - less frequent now that TIER 1 micro-updates exist.
 * This validates accumulated micro-updates and regenerates the profile summary.
 * 
 * TIER 1 (orchestrator): Instant micro-updates (FREE, every conversational message)
 * TIER 2 (future): Smart incremental updates (cheap, threshold-based)
 * TIER 3 (this): Deep refresh (expensive, periodic validation)
 */

// Clean JSON response
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

/**
 * TIER 3: Deep Profile Update
 * 
 * Updates existing profile with new conversation data.
 * Less critical now that TIER 1 micro-updates keep profile current.
 * Mainly used to validate micro-updates and refresh the narrative summary.
 */
export async function updateComprehensiveProfile(
  transcript: string,
  existingProfile: string,
  existingExtracted: any,
  conversationMetrics: any,
  language: string = "en"
): Promise<any | null> {
  console.log("[Profile Update Agent] 🔄 Starting TIER 3 deep refresh");
  
  const languageContext =
    language !== "en"
      ? `Note: The conversation may contain ${
          language === "haw"
            ? "Hawaiian (ʻŌlelo Hawaiʻi)"
            : language === "hwp"
            ? "Hawaiian Pidgin"
            : language === "tl"
            ? "Tagalog"
            : "English"
        } language. Understand it in context but write the updated profile summary in ENGLISH for system use.`
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
1. PRESERVE all valid information from the existing profile (including TIER 1 micro-updates!)
2. ADD any NEW information revealed in recent conversation
3. UPDATE or REFINE information that has evolved or changed
4. EXPAND on interests, goals, or preferences that have become more specific
5. Note any SHIFTS in thinking or priorities
6. Maintain Hawaii-specific context and factors
7. Keep the same comprehensive format as the original profile
8. IMPORTANT: Write the summary in ENGLISH regardless of conversation language
9. NOTE: Some interests/goals may have been added via micro-updates - validate and keep them!

Return ONLY valid JSON in this exact format:
{
  "summary": "An UPDATED comprehensive 5-6 sentence narrative IN ENGLISH in third person that incorporates BOTH existing profile information AND new revelations. Include their evolving situation, refined interests, clarified goals, and any new context discovered.",
  "extracted": {
    "educationLevel": "elementary|middle_school|high_school_freshman|high_school_sophomore|high_school_junior|high_school_senior|college_freshman|college_sophomore|college_junior|college_senior|associate_degree|bachelor_degree|master_degree|doctoral_degree|trade_certification|working_professional|null",
    "currentGrade": null or grade number if applicable,
    "currentStatus": "full_time_student|part_time_student|recent_graduate|employed_full_time|employed_part_time|unemployed|career_changer|returning_to_workforce|exploring_options|null",
    
    "interests": ["Include ALL existing interests (from TIER 1 micro-updates) PLUS any new ones. Be specific."],
    "careerGoals": ["Include ALL existing goals (from TIER 1 micro-updates) AND any new or refined goals."],
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
- The existing profile MAY already have micro-updates (interests/goals) - PRESERVE THEM!
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
    if (!content) {
      console.log("[Profile Update Agent] ❌ No content returned from LLM");
      return null;
    }

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

    console.log(
      `[Profile Update Agent] ✅ Deep refresh complete - Confidence: ${parsed.confidence.overall}%`
    );
    console.log(
      `[Profile Update Agent] 📊 Interests: ${parsed.extracted.interests?.length || 0}, Goals: ${parsed.extracted.careerGoals?.length || 0}`
    );

    return parsed;
  } catch (error) {
    console.error("[Profile Update Agent] ❌ Error during deep refresh:", error);

    // Fallback: merge arrays manually (preserve micro-updates!)
    try {
      console.log("[Profile Update Agent] 🔄 Using fallback merge");
      
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
      console.error("[Profile Update Agent] ❌ Fallback merge also failed:", fallbackError);
    }

    return null;
  }
}

export default {
  updateComprehensiveProfile,
};
