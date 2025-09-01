// app/api/personalized-suggestions/route.ts (Updated with Language Support)
import { NextRequest, NextResponse } from "next/server";
import { generatePersonalizedSuggestions } from "../../utils/groqClient";

export async function POST(request: NextRequest) {
  try {
    const {
      profileSummary,
      extractedProfile,
      language = "en",
    } = await request.json();

    if (!profileSummary || !extractedProfile) {
      return NextResponse.json(
        { error: "Profile data is required" },
        { status: 400 }
      );
    }

    console.log("Generating personalized suggestions in language:", language);

    // Use the enhanced groqClient function that supports language
    const suggestions = await generatePersonalizedSuggestions(
      profileSummary,
      extractedProfile,
      language
    );

    console.log("Generated suggestions:", suggestions);

    return NextResponse.json({
      suggestions,
      language,
      metadata: {
        generatedAt: new Date().toISOString(),
        profileBased: true,
      },
    });
  } catch (error) {
    console.error("Error generating personalized suggestions:", error);

    // Language-specific fallbacks
    const fallbacksByLanguage: Record<string, string[]> = {
      en: [
        "What careers match my profile?",
        "What education programs are available?",
        "Show me entry-level opportunities",
        "What are the highest paying careers?",
      ],
      haw: [
        "He aha nā ʻoihana kūpono iaʻu?",
        "He aha nā papahana hoʻonaʻauao?",
        "E hōʻike mai i nā ʻoihana hoʻomaka",
        "He aha nā ʻoihana uku kiʻekiʻe?",
      ],
      hwp: [
        "Wat careers match my profile?",
        "Wat education programs get?",
        "Show me entry-level kine",
        "Wat stay da highest paying jobs?",
      ],
      tl: [
        "Anong careers ang tugma sa akin?",
        "Anong mga programa ng edukasyon?",
        "Ipakita ang entry-level opportunities",
        "Ano ang pinakamataas na sahod?",
      ],
    };

    // Try to extract language from request even if main processing failed
    try {
      const body = await request.json();
      const lang = body.language || "en";
      const profile = body.extractedProfile;

      // Generate intelligent fallbacks based on profile
      const intelligentFallbacks = [];

      // Based on interests
      if (profile?.interests && profile.interests.length > 0) {
        const interest = profile.interests[0];
        switch (lang) {
          case "haw":
            intelligentFallbacks.push(
              `E hōʻike mai i nā ʻoihana ${interest} ma Hawaiʻi`
            );
            break;
          case "hwp":
            intelligentFallbacks.push(`Show me ${interest} careers in Hawaii`);
            break;
          case "tl":
            intelligentFallbacks.push(
              `Ipakita ang ${interest} careers sa Hawaii`
            );
            break;
          default:
            intelligentFallbacks.push(`Show me ${interest} careers in Hawaii`);
        }
      }

      // Based on education level
      if (profile?.educationLevel?.includes("high_school")) {
        switch (lang) {
          case "haw":
            intelligentFallbacks.push(
              "He aha nā papahana kulanui e noʻonoʻo ai?"
            );
            break;
          case "hwp":
            intelligentFallbacks.push(
              "Wat college programs I should check out?"
            );
            break;
          case "tl":
            intelligentFallbacks.push(
              "Anong college programs dapat kong tingnan?"
            );
            break;
          default:
            intelligentFallbacks.push(
              "What college programs should I consider?"
            );
        }
      } else if (profile?.educationLevel?.includes("college")) {
        switch (lang) {
          case "haw":
            intelligentFallbacks.push("E hōʻike mai i nā ʻoihana hoʻomaka");
            break;
          case "hwp":
            intelligentFallbacks.push("Show me entry-level kine");
            break;
          case "tl":
            intelligentFallbacks.push("Ipakita ang entry-level opportunities");
            break;
          default:
            intelligentFallbacks.push("Show me entry-level opportunities");
        }
      }

      // Based on location
      if (profile?.location && profile.location !== "null") {
        switch (lang) {
          case "haw":
            intelligentFallbacks.push(`He aha ka mea ma ${profile.location}?`);
            break;
          case "hwp":
            intelligentFallbacks.push(`Wat get on ${profile.location}?`);
            break;
          case "tl":
            intelligentFallbacks.push(
              `Ano ang available sa ${profile.location}?`
            );
            break;
          default:
            intelligentFallbacks.push(
              `What's available on ${profile.location}?`
            );
        }
      }

      // If we have intelligent fallbacks, use them; otherwise use generic ones
      const finalSuggestions =
        intelligentFallbacks.length > 0
          ? [...intelligentFallbacks, ...fallbacksByLanguage[lang]].slice(0, 4)
          : fallbacksByLanguage[lang] || fallbacksByLanguage.en;

      return NextResponse.json({
        suggestions: finalSuggestions,
        language: lang,
        metadata: {
          generatedAt: new Date().toISOString(),
          profileBased: intelligentFallbacks.length > 0,
          fallback: true,
        },
      });
    } catch {
      return NextResponse.json({
        suggestions: fallbacksByLanguage.en,
        language: "en",
        metadata: {
          generatedAt: new Date().toISOString(),
          profileBased: false,
          fallback: true,
        },
      });
    }
  }
}

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "personalized-suggestions",
    version: "3.0",
    features: {
      multiLanguage: true,
      supportedLanguages: ["en", "haw", "hwp", "tl"],
      profileBased: true,
      contextAware: true,
      intelligentFallbacks: true,
    },
    timestamp: new Date().toISOString(),
  });
}
