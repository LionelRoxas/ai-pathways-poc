/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/generate-profile/route.ts (Updated with Language and Markdown Support)
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface EnhancedProfile {
  summary: string;
  extracted: {
    // Core demographics
    educationLevel: string | null;
    currentGrade?: number | null;
    currentStatus: string | null;

    // Interests and motivations
    interests: string[];
    careerGoals: string[];
    motivations: string[];

    // Practical considerations
    timeline: string | null;
    location: string | null;
    workPreferences: {
      environment?: string;
      schedule?: string;
      remoteWork?: string;
      salary?: string;
      benefits?: string[];
    };

    // Challenges and support
    challenges: string[];
    strengths: string[];
    supportNeeds: string[];

    // Learning and development
    learningStyle?: string;
    skillsToImprove: string[];
    experienceLevel: string | null;

    // Context and background
    familyInfluence?: string;
    culturalBackground?: string;
    financialSituation?: string;

    // Confidence and readiness
    confidenceLevel: string | null;
    readinessToStart: string | null;
  };
  confidence: {
    overall: number;
    dataQuality: number;
    completeness: number;
  };
}

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

// Generate comprehensive profile from conversation (with language awareness and Markdown)
async function generateComprehensiveProfile(
  transcript: string,
  conversationMetrics: any,
  language: string = "en"
): Promise<EnhancedProfile | null> {
  const languageContext =
    language !== "en"
      ? `Note: The conversation may contain ${language === "haw" ? "Hawaiian (ʻŌlelo Hawaiʻi)" : language === "hwp" ? "Hawaiian Pidgin" : language === "tl" ? "Tagalog" : "English"} language. Understand it in context but write the profile summary in ENGLISH for system use.`
      : "";

  const systemPrompt = `You are an expert career counseling analyst. Analyze this detailed conversation between a career counselor and a person seeking career guidance in Hawaii. Extract comprehensive information to build a rich user profile for personalized career guidance.
${languageContext}

CONVERSATION METRICS:
- Total messages: ${conversationMetrics.totalMessages}
- User messages: ${conversationMetrics.userMessages}
- Average message length: ${Math.round(conversationMetrics.averageLength)} characters
- Language used: ${language}

ANALYSIS INSTRUCTIONS:
1. Extract EXPLICIT information mentioned in the conversation
2. Infer REASONABLE conclusions based on context and conversation patterns
3. Use null/empty arrays for truly unknown information
4. Be specific and detailed - capture nuances and context
5. Consider Hawaii-specific factors (island location, local culture, etc.)
6. IMPORTANT: Write the summary in ENGLISH regardless of conversation language
7. CRITICAL: Use appropriate terminology based on the person's actual status - NOT everyone is a student

HOW TO REFER TO THE PERSON IN THE SUMMARY:
- If currently in school (K-12 or college): "the student"
- If working professional exploring options: "the professional" or "the individual"
- If career changer: "the career changer" or "the individual"
- If unemployed/job seeking: "the job seeker" or "the individual"
- If recent graduate: "the recent graduate"
- If returning to workforce: "the individual returning to the workforce"
- If status unclear: "the individual" (safe default)
- NEVER assume "student" unless they are actually currently enrolled in school

Return ONLY valid JSON in this exact format:
{
  "summary": "A comprehensive 5-6 sentence narrative IN ENGLISH in third person using APPROPRIATE terminology (not always 'student'!) that captures their full story, including current situation, interests, goals, challenges, timeline, and context. Make it personal and specific. Write in plain text without any markdown formatting.",
  "extracted": {
    "educationLevel": "elementary|middle_school|high_school_freshman|high_school_sophomore|high_school_junior|high_school_senior|college_freshman|college_sophomore|college_junior|college_senior|associate_degree|bachelor_degree|master_degree|doctoral_degree|trade_certification|working_professional|null",
    "currentGrade": null or grade number if applicable,
    "currentStatus": "full_time_student|part_time_student|recent_graduate|employed_full_time|employed_part_time|unemployed|career_changer|returning_to_workforce|exploring_options|null",
    
    "interests": ["Extract specific interests, hobbies, subjects they enjoy. Be detailed: 'marine biology', 'video game design', 'helping elderly people', etc."],
    "careerGoals": ["Specific careers mentioned or implied: 'marine biologist', 'nurse', 'start own restaurant', 'work in tech', etc. Include both specific jobs and general fields."],
    "motivations": ["What drives them: 'help people', 'financial stability', 'creative expression', 'make a difference', 'family influence', etc."],
    
    "timeline": "immediate|within_6_months|within_1_year|within_2_years|within_5_years|long_term|flexible|null",
    "location": "Oahu|Maui|Hawaii_Island|Kauai|Molokai|Lanai|multiple_islands|mainland_US|flexible|null",
    "workPreferences": {
      "environment": "office|outdoor|laboratory|hospital|school|home|mixed|null",
      "schedule": "full_time|part_time|flexible|shift_work|seasonal|null",
      "remoteWork": "required|strongly_preferred|open_to|not_interested|null",
      "salary": "primary_concern|important|moderate_concern|not_primary_focus|null",
      "benefits": ["healthcare", "retirement", "vacation_time", "professional_development", "flexible_schedule", etc.]
    },
    
    "challenges": ["Specific obstacles mentioned: 'don't know what I want', 'limited transportation', 'need to support family', 'fear of math', 'lack of experience', etc."],
    "strengths": ["Mentioned abilities, traits, experiences: 'good with people', 'detail-oriented', 'bilingual', 'leadership experience', etc."],
    "supportNeeds": ["What they need help with: 'career exploration', 'finding programs', 'financial aid', 'study skills', 'networking', etc."],
    
    "learningStyle": "hands_on|visual|analytical|collaborative|independent|mixed|null",
    "skillsToImprove": ["Specific skills they want to develop: 'public speaking', 'computer skills', 'time management', 'math', etc."],
    "experienceLevel": "no_experience|some_volunteering|part_time_jobs|internships|entry_level|experienced|null",
    
    "familyInfluence": "very_supportive|supportive|neutral|pressuring|discouraging|mixed|null",
    "culturalBackground": "local_hawaiian|mainland_transplant|military_family|immigrant_family|mixed|null",
    "financialSituation": "very_limited|limited|moderate|comfortable|not_discussed|null",
    
    "confidenceLevel": "very_confident|confident|somewhat_confident|uncertain|very_uncertain|null",
    "readinessToStart": "ready_now|ready_soon|need_more_info|need_more_time|unsure|null"
  },
  "confidence": {
    "overall": number from 0-100 based on how much information was gathered,
    "dataQuality": number from 0-100 based on how detailed and specific the conversation was,
    "completeness": number from 0-100 based on how many profile areas have information
  }
}

SUMMARY WRITING EXAMPLES:
✓ CORRECT: "The individual is a working professional in healthcare looking to transition into nursing..."
✓ CORRECT: "The high school junior is interested in marine biology and wants to attend UH Mānoa..."
✓ CORRECT: "The career changer has 10 years in retail and is exploring opportunities in IT..."
✗ INCORRECT: "The student is a working professional..." (contradictory - choose one)
✗ INCORRECT: "The student has been unemployed for 6 months..." (they're not a student)

IMPORTANT GUIDELINES:
- Extract specific details, not just generic categories
- If someone mentions "helping people" also note the specific context (healthcare, teaching, social work, etc.)
- Pay attention to Hawaiian context - island preferences, local culture, family expectations
- Capture both stated goals and implied interests
- Note any concerns, fears, or excitement expressed
- Consider their communication style and engagement level
- Be honest about confidence levels - don't inflate scores
- If exploring careers, that IS a valid career goal - capture it as such
- The summary MUST be in English as plain text without any formatting
- USE THE RIGHT TERMINOLOGY - respect who the person actually is`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `CONVERSATION TO ANALYZE (Language: ${language}):\n\n${transcript}`,
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

    // Ensure confidence scores are reasonable
    parsed.confidence.overall = Math.max(
      0,
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
    console.error("Enhanced profile generation error:", error);

    // Fallback: Try simpler extraction
    try {
      const fallbackPrompt = `Extract basic information from this career counseling conversation (may be in ${language === "haw" ? "Hawaiian" : language === "hwp" ? "Pidgin" : language === "tl" ? "Tagalog" : "English"}). Focus on clear, explicit information only.

Return JSON with summary in ENGLISH as plain text:
{
  "summary": "Brief summary IN ENGLISH of the person and their situation (plain text, no markdown)",
  "extracted": {
    "educationLevel": "their education level or null",
    "currentStatus": "what they're doing now or null",
    "interests": ["clear interests mentioned"],
    "careerGoals": ["specific careers or fields mentioned, including 'exploring' as valid"],
    "motivations": ["what drives them"],
    "timeline": "when they want to start or null",
    "location": "Hawaii location preference or null",
    "challenges": ["specific challenges mentioned"],
    "strengths": ["abilities or traits mentioned"],
    "workPreferences": {},
    "supportNeeds": [],
    "skillsToImprove": [],
    "experienceLevel": null,
    "familyInfluence": null,
    "culturalBackground": null,
    "financialSituation": null,
    "confidenceLevel": null,
    "readinessToStart": null,
    "learningStyle": null
  },
  "confidence": { "overall": 60, "dataQuality": 50, "completeness": 40 }
}`;

      const fallbackResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: fallbackPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.1,
      });

      const fallbackContent = fallbackResponse.choices[0].message.content;
      if (fallbackContent) {
        const fallbackCleaned = cleanJsonResponse(fallbackContent);
        return JSON.parse(fallbackCleaned);
      }
    } catch (fallbackError) {
      console.error("Fallback profile generation also failed:", fallbackError);
    }

    return null;
  }
}

// Main API handler
export async function POST(request: NextRequest) {
  try {
    const {
      transcript,
      userMessageCount,
      conversationMetrics,
      language = "en",
    } = await request.json();

    console.log("Generating profile for language:", language);

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Invalid transcript format" },
        { status: 400 }
      );
    }

    // Ensure we have enough conversation content - 3 messages as requested
    if (userMessageCount < 3) {
      return NextResponse.json(
        { error: "Insufficient conversation data", needMoreMessages: true },
        { status: 400 }
      );
    }

    const enhancedProfile = await generateComprehensiveProfile(
      transcript,
      conversationMetrics,
      language
    );

    if (!enhancedProfile) {
      return NextResponse.json(
        { error: "Failed to generate profile" },
        { status: 500 }
      );
    }

    // Only return profile if confidence is reasonable
    if (enhancedProfile.confidence.overall < 10) {
      return NextResponse.json(
        {
          error: "Insufficient information for reliable profile",
          message:
            "Please continue the conversation to gather more information",
          confidenceScore: enhancedProfile.confidence.overall,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      profile: enhancedProfile.summary,
      extracted: enhancedProfile.extracted,
      confidence: enhancedProfile.confidence,
      isComplete: true,
      metadata: {
        userMessageCount,
        generatedAt: new Date().toISOString(),
        conversationMetrics,
        language,
      },
    });
  } catch (error) {
    console.error("Enhanced profile generation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "enhanced-profile-generation",
    version: "3.1",
    features: {
      comprehensiveExtraction: true,
      confidenceScoring: true,
      hawaiiContextAware: true,
      fallbackProcessing: true,
      detailedAnalysis: true,
      multiLanguageSupport: true,
      markdownFormatting: true,
      supportedLanguages: ["en", "haw", "hwp", "tl"],
    },
    timestamp: new Date().toISOString(),
  });
}
