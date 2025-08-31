// app/api/personalized-suggestions/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { profileSummary, extractedProfile } = await request.json();

    if (!profileSummary || !extractedProfile) {
      return NextResponse.json(
        { error: "Profile data is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a career counselor assistant. Based on a student's profile, generate 4 highly relevant, personalized questions they might want to ask about careers in Hawaii.

The questions should:
1. Be specific to their interests, education level, and goals
2. Reference actual details from their profile
3. Sound natural and conversational
4. Cover different aspects (careers, education, salaries, opportunities)
5. Be actionable and lead to helpful database queries

Return ONLY a JSON array of 4 question strings, nothing else.`;

    const userPrompt = `Generate 4 personalized career exploration questions for this student:

PROFILE SUMMARY:
${profileSummary}

EXTRACTED DETAILS:
- Education Level: ${extractedProfile.educationLevel || "Not specified"}
- Interests: ${extractedProfile.interests?.join(", ") || "Various"}
- Career Goals: ${extractedProfile.careerGoals?.join(", ") || "Exploring"}
- Location Preference: ${extractedProfile.location || "Flexible"}
- Timeline: ${extractedProfile.timeline || "Flexible"}
- Strengths: ${extractedProfile.strengths?.join(", ") || "Multiple"}
- Challenges: ${extractedProfile.challenges?.join(", ") || "None mentioned"}

Examples of good personalized questions:
- "What tech careers in Honolulu match my interest in AI?"
- "Show me healthcare programs at UH for someone with my background"
- "What entry-level developer jobs are available on Oahu?"
- "How much do marine biologists make in Hawaii?"

Generate 4 questions that are specific to THIS student's profile.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    console.log("Raw personalized suggestions response:", content);

    // Clean and parse the response
    let cleaned = content.trim();
    cleaned = cleaned.replace(/```json\s*/gi, "");
    cleaned = cleaned.replace(/```\s*/gi, "");

    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");

    if (
      firstBracket !== -1 &&
      lastBracket !== -1 &&
      lastBracket > firstBracket
    ) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      cleaned = cleaned.replace(/,\s*]/g, "]");
      cleaned = cleaned.replace(/\\"/g, '"');
      cleaned = cleaned.replace(/\n/g, " ");

      const suggestions = JSON.parse(cleaned);

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        const validSuggestions = suggestions
          .filter(s => typeof s === "string" && s.trim().length > 0)
          .map(s => s.trim())
          .slice(0, 4);

        if (validSuggestions.length > 0) {
          console.log("Generated personalized suggestions:", validSuggestions);
          return NextResponse.json({ suggestions: validSuggestions });
        }
      }
    }

    // If parsing fails, return intelligent fallbacks
    throw new Error("Failed to parse suggestions");
  } catch (error) {
    console.error("Error generating personalized suggestions:", error);

    // Return intelligent fallbacks based on profile
    const { extractedProfile } = await request.json();
    const fallbacks = [];

    // Based on interests
    if (extractedProfile?.interests && extractedProfile.interests.length > 0) {
      const interest = extractedProfile.interests[0];
      fallbacks.push(`Show me ${interest} careers in Hawaii`);
    } else {
      fallbacks.push("What careers match my profile?");
    }

    // Based on education level
    if (extractedProfile?.educationLevel?.includes("high_school")) {
      fallbacks.push("What college programs should I consider?");
    } else if (extractedProfile?.educationLevel?.includes("college")) {
      fallbacks.push("Show me entry-level opportunities");
    } else {
      fallbacks.push("What training programs are available?");
    }

    // Based on goals
    if (
      extractedProfile?.careerGoals &&
      extractedProfile.careerGoals.length > 0
    ) {
      fallbacks.push(`How do I become a ${extractedProfile.careerGoals[0]}?`);
    } else {
      fallbacks.push("What are the highest paying careers?");
    }

    // Based on location
    if (extractedProfile?.location && extractedProfile.location !== "null") {
      fallbacks.push(`What's available on ${extractedProfile.location}?`);
    } else {
      fallbacks.push("Show me all opportunities in Hawaii");
    }

    return NextResponse.json({ suggestions: fallbacks.slice(0, 4) });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "personalized-suggestions",
    timestamp: new Date().toISOString(),
  });
}
