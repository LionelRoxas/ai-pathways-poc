// app/api/profiling-chat/route.ts (Updated to handle language parameter)
import { NextRequest, NextResponse } from "next/server";
import { getEnhancedProfilingResponse } from "../../utils/groqClient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProfilingState {
  hasEducationLevel: boolean;
  hasInterests: boolean;
  hasGoals: boolean;
  hasTimeline: boolean;
  hasLocation: boolean;
  userMessageCount: number;
  totalMessageCount: number;
  missingInfo: string[];
  readinessScore: number;
}

// Analyze conversation state with broader keyword detection
function analyzeProfilingState(messages: ChatMessage[]): ProfilingState {
  const conversationText = messages.map(m => m.content.toLowerCase()).join(" ");
  const userMessages = messages.filter(m => m.role === "user");

  console.log("=== PROFILING STATE ANALYSIS ===");
  console.log("Total messages:", messages.length);
  console.log("User messages:", userMessages.length);

  const state: ProfilingState = {
    hasEducationLevel: false,
    hasInterests: false,
    hasGoals: false,
    hasTimeline: false,
    hasLocation: false,
    userMessageCount: userMessages.length,
    totalMessageCount: messages.length,
    missingInfo: [],
    readinessScore: 0,
  };

  // Education/status detection - VERY BROAD
  const educationKeywords = [
    "high school",
    "college",
    "university",
    "graduate",
    "degree",
    "senior",
    "junior",
    "freshman",
    "sophomore",
    "working",
    "employed",
    "job",
    "student",
    "school",
    "waipahu",
    "grade",
    "class",
    "education",
    "studying",
    "learn",
  ];
  state.hasEducationLevel = educationKeywords.some(keyword =>
    conversationText.includes(keyword)
  );
  console.log(
    "Education check:",
    state.hasEducationLevel,
    "- found:",
    educationKeywords.filter(k => conversationText.includes(k))
  );

  // Interest detection - VERY BROAD
  const interestKeywords = [
    "interested",
    "enjoy",
    "like",
    "passion",
    "love",
    "curious",
    "fascinated",
    "drawn to",
    "hobby",
    "technology",
    "tech",
    "coding",
    "programming",
    "machine learning",
    "ai",
    "computer",
    "software",
    "fun",
    "exciting",
    "cool",
    "amazing",
    "awesome",
    "favorite",
  ];
  state.hasInterests = interestKeywords.some(keyword =>
    conversationText.includes(keyword)
  );
  console.log(
    "Interests check:",
    state.hasInterests,
    "- found:",
    interestKeywords.filter(k => conversationText.includes(k))
  );

  // Goals detection - VERY BROAD
  const goalKeywords = [
    "want to",
    "goal",
    "dream",
    "aspire",
    "plan to",
    "hope to",
    "considering",
    "thinking about",
    "career",
    "future",
    "developer",
    "programmer",
    "engineer",
    "work as",
    "become",
    "job",
    "profession",
    "field",
    "industry",
    "path",
  ];
  state.hasGoals = goalKeywords.some(keyword =>
    conversationText.includes(keyword)
  );
  console.log(
    "Goals check:",
    state.hasGoals,
    "- found:",
    goalKeywords.filter(k => conversationText.includes(k))
  );

  // Timeline detection - VERY BROAD
  const timelineKeywords = [
    "year",
    "years",
    "months",
    "soon",
    "eventually",
    "after",
    "when",
    "timeline",
    "graduate",
    "finish",
    "college",
    "next",
    "future",
    "plan",
    "want to",
    "going to",
    "will",
    "time",
  ];
  state.hasTimeline = timelineKeywords.some(keyword =>
    conversationText.includes(keyword)
  );
  console.log(
    "Timeline check:",
    state.hasTimeline,
    "- found:",
    timelineKeywords.filter(k => conversationText.includes(k))
  );

  // Location detection - VERY BROAD
  const locationKeywords = [
    "oahu",
    "maui",
    "kauai",
    "big island",
    "hawaii island",
    "molokai",
    "lanai",
    "honolulu",
    "island",
    "hawaii",
    "stay",
    "here",
    "local",
    "remote",
    "waipahu",
    "home",
    "live",
  ];
  state.hasLocation = locationKeywords.some(keyword =>
    conversationText.includes(keyword)
  );
  console.log(
    "Location check:",
    state.hasLocation,
    "- found:",
    locationKeywords.filter(k => conversationText.includes(k))
  );

  // Determine missing info
  if (!state.hasEducationLevel) state.missingInfo.push("education_level");
  if (!state.hasInterests) state.missingInfo.push("interests");
  if (!state.hasGoals) state.missingInfo.push("goals");
  if (!state.hasTimeline) state.missingInfo.push("timeline");
  if (!state.hasLocation) state.missingInfo.push("location");

  // Calculate readiness score
  let score = 0;
  if (state.hasEducationLevel) score += 20;
  if (state.hasInterests) score += 25;
  if (state.hasGoals) score += 25;
  if (state.hasTimeline) score += 15;
  if (state.hasLocation) score += 15;

  state.readinessScore = score;

  console.log("=== FINAL STATE ===");
  console.log("Missing info:", state.missingInfo);
  console.log("Readiness score:", state.readinessScore);
  console.log("User message count:", state.userMessageCount);

  return state;
}

// Main handler
export async function POST(request: NextRequest) {
  try {
    console.log("=== PROFILING CHAT API CALLED ===");
    const body = await request.json();
    const { messages, language = "en" } = body; // Accept language parameter, default to English

    console.log("Language requested:", language);

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Analyze conversation state with debug logging
    const profilingState = analyzeProfilingState(messages);

    // Check if profile is ready (3 messages with reasonable readiness score)
    const isProfileReady =
      profilingState.userMessageCount >= 3 &&
      profilingState.readinessScore >= 10;

    console.log("=== PROFILE READINESS CHECK ===");
    console.log(
      "User messages:",
      profilingState.userMessageCount,
      ">=3?",
      profilingState.userMessageCount >= 3
    );
    console.log(
      "Readiness score:",
      profilingState.readinessScore,
      ">=40?",
      profilingState.readinessScore >= 40
    );
    console.log("Is profile ready?", isProfileReady);

    if (isProfileReady) {
      console.log("=== PROFILE READY - RETURNING TRANSITION MESSAGE ===");

      // Language-specific transition messages
      const transitionMessages: Record<string, string> = {
        en: "Perfect! I have enough information about your background and interests. Let me analyze your profile and show you personalized career opportunities from Hawaii's job market with real salary data and current openings.",
        haw: "Maikaʻi loa! Ua loaʻa iaʻu ka ʻike kūpono e pili ana i kou ʻano a me kou mau hoihoi. E nānā au i kou moʻolelo a e hōʻike aku i nā ʻoihana kūpono mai ka mākeke hana o Hawaiʻi.",
        hwp: "Shoots! I get nuff info about you and wat you like do. Lemme check your profile and show you da kine personalized career opportunities from Hawaii job market yeah.",
        tl: "Perpekto! May sapat na akong impormasyon tungkol sa iyong background at mga interes. Susuriin ko ang iyong profile at ipapakita ang mga personalized na oportunidad sa karera mula sa Hawaii.",
      };

      // Language-specific suggested questions
      const suggestedQuestionsByLanguage: Record<string, string[]> = {
        en: [
          "Show me career matches",
          "What are the highest paying options?",
          "What education programs are available?",
          "Tell me about job openings",
        ],
        haw: [
          "E hōʻike mai i nā ʻoihana kūpono",
          "He aha nā koho uku kiʻekiʻe?",
          "He aha nā papahana hoʻonaʻauao?",
          "E haʻi mai e pili ana i nā wahi hana",
        ],
        hwp: [
          "Show me da career matches",
          "Wat stay da highest paying kine?",
          "Wat education programs get?",
          "Tell me bout da job openings",
        ],
        tl: [
          "Ipakita ang mga tugmang karera",
          "Ano ang pinakamataas na sahod?",
          "Anong mga programa ng edukasyon?",
          "Sabihin tungkol sa mga job opening",
        ],
      };

      return NextResponse.json({
        message: transitionMessages[language] || transitionMessages.en,
        suggestedQuestions:
          suggestedQuestionsByLanguage[language] ||
          suggestedQuestionsByLanguage.en,
        readyForProfile: true,
        profilingComplete: true,
        confidenceLevel: profilingState.readinessScore,
        debug: {
          userMessages: profilingState.userMessageCount,
          readinessScore: profilingState.readinessScore,
          hasInfo: {
            education: profilingState.hasEducationLevel,
            interests: profilingState.hasInterests,
            goals: profilingState.hasGoals,
            timeline: profilingState.hasTimeline,
            location: profilingState.hasLocation,
          },
        },
      });
    }

    console.log("=== CONTINUING PROFILING ===");
    console.log("Using getEnhancedProfilingResponse from groqClient");

    // Pass language to the profiling response generator - THIS IS THE FIX
    const { message, prompts } = await getEnhancedProfilingResponse(
      messages,
      profilingState.userMessageCount,
      profilingState.missingInfo,
      profilingState.readinessScore,
      language // ADDED LANGUAGE PARAMETER HERE
    );

    console.log("Generated message:", message.slice(0, 100) + "...");
    console.log("Generated prompts:", prompts);

    return NextResponse.json({
      message,
      suggestedQuestions: prompts,
      profilingState: {
        progress: Math.min(100, profilingState.readinessScore),
        missingInfo: profilingState.missingInfo,
        userMessageCount: profilingState.userMessageCount,
      },
      readyForProfile: false,
      debug: {
        userMessages: profilingState.userMessageCount,
        readinessScore: profilingState.readinessScore,
        hasInfo: {
          education: profilingState.hasEducationLevel,
          interests: profilingState.hasInterests,
          goals: profilingState.hasGoals,
          timeline: profilingState.hasTimeline,
          location: profilingState.hasLocation,
        },
      },
    });
  } catch (error) {
    console.error("Profiling chat API error:", error);

    // Return a reasonable fallback with initial prompts
    return NextResponse.json(
      {
        message:
          "Hi! I'm here to help you explore career paths in Hawaii. What's your current situation - are you in school, working, or exploring your options?",
        suggestedQuestions: [
          "I'm in high school",
          "I'm in college",
          "I'm working",
          "I'm exploring options",
        ],
        profilingState: {
          progress: 0,
          missingInfo: [
            "education_level",
            "interests",
            "goals",
            "timeline",
            "location",
          ],
          userMessageCount: 0,
        },
        readyForProfile: false,
      },
      { status: 200 } // Return 200 with fallback instead of error
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "profiling-chat-with-smart-prompts",
    version: "2.0",
    timestamp: new Date().toISOString(),
  });
}
