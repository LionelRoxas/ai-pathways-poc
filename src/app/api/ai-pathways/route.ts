/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/ai-pathways/route.ts
import { NextResponse } from "next/server";
import { handleMCPRequest } from "../../lib/mcp/pathways-server";

// Types
interface UserProfile {
  education_level: string;
  grade_level?: number;
  interests: string[];
  career_goals?: string;
  timeline: string;
  college_plans: string;
}

interface QueryContext {
  intent: "career" | "education" | "market" | "skills" | "sources" | "general";
  specific: boolean;
}

// Analyze user's message to understand intent
function analyzeQuery(message: string): QueryContext {
  const msg = message.toLowerCase();

  let intent: QueryContext["intent"] = "general";

  if (msg.includes("career") || msg.includes("job") || msg.includes("work")) {
    intent = "career";
  } else if (
    msg.includes("education") ||
    msg.includes("college") ||
    msg.includes("program") ||
    msg.includes("degree")
  ) {
    intent = "education";
  } else if (
    msg.includes("market") ||
    msg.includes("salary") ||
    msg.includes("hiring") ||
    msg.includes("demand")
  ) {
    intent = "market";
  } else if (
    msg.includes("skill") ||
    msg.includes("certification") ||
    msg.includes("training") ||
    msg.includes("learn")
  ) {
    intent = "skills";
  } else if (
    msg.includes("source") ||
    msg.includes("data") ||
    msg.includes("database")
  ) {
    intent = "sources";
  }

  // Check if query is specific (mentions specific careers/fields)
  const specificTerms = [
    "software",
    "nurse",
    "teacher",
    "solar",
    "hotel",
    "business",
    "data",
    "cyber",
  ];
  const specific = specificTerms.some(term => msg.includes(term));

  return { intent, specific };
}

// Generate follow-up suggestions based on context
function generateSuggestions(
  userProfile: UserProfile,
  responseType: string
): string[] {
  const base = [
    "Show me careers that match my interests",
    "What education programs should I consider?",
    "What's the job market like in Hawaii?",
    "What skills are most in-demand?",
  ];

  const contextual: Record<string, string[]> = {
    career: [
      "What education do I need for these careers?",
      "Which companies are hiring for these roles?",
      "What skills should I develop?",
      "Show me the job market data",
    ],
    education: [
      "What careers can these programs lead to?",
      "How much do these programs cost?",
      "What are the admission requirements?",
      "Show me alternative pathways",
    ],
    market: [
      "Which careers have the most openings?",
      "What companies are actively hiring?",
      "Show me salary trends",
      "What skills are in demand?",
    ],
    skills: [
      "How long do these take to learn?",
      "What certifications are available?",
      "Show me training programs",
      "Which careers need these skills?",
    ],
  };

  return contextual[responseType] || base;
}

// Main route handler
export async function POST(req: Request) {
  try {
    const { message, userProfile } = await req.json();

    if (!message?.trim() || !userProfile) {
      return NextResponse.json(
        { error: "Message and user profile are required" },
        { status: 400 }
      );
    }

    const query = analyzeQuery(message);

    // Get database statistics for context
    const statsResponse = await handleMCPRequest({
      tool: "getDatabaseStats",
      params: {},
    });

    // Handle different query intents using MCP tools
    switch (query.intent) {
      case "career": {
        // Get careers from MCP
        const careersResponse = await handleMCPRequest({
          tool: "getCareers",
          params: {
            interests: userProfile.interests,
            educationLevel: userProfile.education_level,
            limit: 5,
          },
        });

        if (!careersResponse.success) {
          throw new Error(careersResponse.error);
        }

        // Get related job market data
        const careerIds = careersResponse.data.map((c: any) => c.id);
        const marketResponse = await handleMCPRequest({
          tool: "getJobMarketData",
          params: { careerIds },
        });

        return NextResponse.json({
          message: `Based on your interests in ${userProfile.interests.join(", ")} and current Hawaii job market, here are promising career paths:

Each career shows current openings and hiring companies. These recommendations factor in Hawaii's unique economy and growth sectors.

Would you like to explore education pathways for any of these careers?`,
          careers: careersResponse.data,
          marketInsights: marketResponse.success
            ? marketResponse.data.stats
            : null,
          suggestedQuestions: generateSuggestions(userProfile, "career"),
          responseType: "career",
        });
      }

      case "education": {
        // Get education programs from MCP
        const programsResponse = await handleMCPRequest({
          tool: "getEducationPrograms",
          params: {
            degreeTypes:
              userProfile.college_plans === "no_alternatives"
                ? ["Certificate Program", "Associate of Science"]
                : ["Bachelor of Science", "Associate of Science"],
            maxDuration: userProfile.timeline === "immediate" ? 2 : 4,
            limit: 6,
          },
        });

        if (!programsResponse.success) {
          throw new Error(programsResponse.error);
        }

        return NextResponse.json({
          message: `Here are education programs in Hawaii that align with your goals and timeline:

${
  userProfile.education_level === "high_school"
    ? "As a high school student, these programs will prepare you for Hawaii's job market."
    : "These programs offer strong career prospects in Hawaii's growing industries."
}

Would you like to see specific career outcomes or admission requirements?`,
          programs: programsResponse.data,
          suggestedQuestions: generateSuggestions(userProfile, "education"),
          responseType: "education",
        });
      }

      case "market": {
        // Get job market data from MCP
        const marketResponse = await handleMCPRequest({
          tool: "getJobMarketData",
          params: {
            region: "Oahu", // Could be dynamic based on user location
          },
        });

        if (!marketResponse.success) {
          throw new Error(marketResponse.error);
        }

        // Get top hiring companies
        const companiesResponse = await handleMCPRequest({
          tool: "getCompanies",
          params: {
            entryLevelOnly: userProfile.education_level === "high_school",
            limit: 5,
          },
        });

        return NextResponse.json({
          message: `Here's the current Hawaii job market overview:

**Key Insights:**
• ${marketResponse.data.stats.totalOpenings} total job openings tracked
• ${Math.round(marketResponse.data.stats.avgGrowthRate)}% average growth rate
• ${Math.round(marketResponse.data.stats.avgRemotePercentage)}% of jobs offer remote work

The market is particularly strong in technology, healthcare, and renewable energy sectors.

Would you like to explore specific careers or see which companies are hiring?`,
          marketData: marketResponse.data,
          topCompanies: companiesResponse.success ? companiesResponse.data : [],
          suggestedQuestions: generateSuggestions(userProfile, "market"),
          responseType: "market",
        });
      }

      case "skills": {
        // Get skills and certifications from MCP
        const skillsResponse = await handleMCPRequest({
          tool: "getSkills",
          params: {
            category: "technical", // Could be based on interests
            onlineOnly: userProfile.timeline === "immediate",
            limit: 6,
          },
        });

        if (!skillsResponse.success) {
          throw new Error(skillsResponse.error);
        }

        // Get training programs
        const trainingResponse = await handleMCPRequest({
          tool: "getTrainingPrograms",
          params: {
            format: userProfile.timeline === "immediate" ? "online" : undefined,
            limit: 4,
          },
        });

        return NextResponse.json({
          message: `Here are in-demand skills and certifications for Hawaii's job market:

These skills can boost your career prospects and many offer online learning options.
${
  trainingResponse.success && trainingResponse.data.length > 0
    ? "\nI've also found training programs starting soon that you can enroll in."
    : ""
}

Would you like to see which careers require these skills?`,
          skills: skillsResponse.data,
          trainingPrograms: trainingResponse.success
            ? trainingResponse.data
            : [],
          suggestedQuestions: generateSuggestions(userProfile, "skills"),
          responseType: "skills",
        });
      }

      case "sources": {
        // Show available data sources with real counts
        const sources = statsResponse.success
          ? [
              {
                name: "Hawaii Career Database",
                count: statsResponse.data.careers,
                description:
                  "Comprehensive career information for Hawaii's job market",
              },
              {
                name: "UH Education Programs",
                count: statsResponse.data.educationPrograms,
                description: "Degree and certificate programs across UH system",
              },
              {
                name: "Job Market Analytics",
                count: statsResponse.data.jobMarketData,
                description: "Real-time hiring data and salary trends",
              },
              {
                name: "Skills & Certifications",
                count: statsResponse.data.skills,
                description: "In-demand skills and professional certifications",
              },
              {
                name: "Hawaii Companies",
                count: statsResponse.data.companies,
                description: "Employers actively hiring in Hawaii",
              },
              {
                name: "DOE Course Catalog",
                count: statsResponse.data.doeCourses,
                description: "High school courses for career preparation",
              },
              {
                name: "Training Programs",
                count: statsResponse.data.trainingPrograms,
                description: "Bootcamps and workforce development",
              },
            ]
          : [];

        return NextResponse.json({
          message: `I have access to comprehensive Hawaii career databases with ${statsResponse.success ? statsResponse.data.total : "extensive"} data points:

Each database is regularly updated with Hawaii-specific information. What would you like to explore?`,
          dataSources: sources,
          suggestedQuestions: generateSuggestions(userProfile, "sources"),
          responseType: "sources",
        });
      }

      default: {
        // General welcome/help response
        const careersResponse = await handleMCPRequest({
          tool: "getCareers",
          params: {
            interests: userProfile.interests,
            limit: 3,
          },
        });

        return NextResponse.json({
          message: `Aloha! I'm here to help you explore career pathways in Hawaii. Based on your interests in ${userProfile.interests.join(", ")}, I can help you discover:

• **Career opportunities** matched to your interests
• **Education programs** at UH and community colleges
• **Job market insights** specific to Hawaii
• **Skills and certifications** to boost your prospects
• **Local companies** that are actively hiring

What would you like to explore first?`,
          quickRecommendations: careersResponse.success
            ? careersResponse.data
            : [],
          suggestedQuestions: generateSuggestions(userProfile, "general"),
          responseType: "welcome",
        });
      }
    }
  } catch (error) {
    console.error("Error in AI Pathways API:", error);

    // Graceful error handling
    return NextResponse.json({
      message:
        "I'm having trouble accessing the career database right now. Let me help you with general information instead. What specific career or education questions do you have?",
      error:
        error instanceof Error ? error.message : "Database connection issue",
      suggestedQuestions: [
        "Tell me about software development careers",
        "What education do I need to become a nurse?",
        "What are the growing industries in Hawaii?",
        "How do I choose between college and workforce training?",
      ],
      responseType: "error",
    });
  }
}

// Health check endpoint
export async function GET() {
  try {
    const statsResponse = await handleMCPRequest({
      tool: "getDatabaseStats",
      params: {},
    });

    return NextResponse.json({
      status: statsResponse.success ? "healthy" : "degraded",
      message: "AI Pathways API with MCP integration",
      database: statsResponse.success ? statsResponse.data : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "API running but database unavailable",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
