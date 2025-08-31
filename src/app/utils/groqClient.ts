/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// NEW: Analyze and improve user queries for better search results
export async function analyzeAndImproveQuery(
  userMessage: string,
  userProfile?: string,
  extractedProfile?: any
): Promise<{
  improvedQuery: string;
  searchTerms: string[];
  intent: "search" | "profile_based" | "mixed";
  ignoreProfile: boolean;
  expandedTerms: Record<string, string[]>;
}> {
  const systemPrompt = `You are a query analysis expert for an education database system. Your job is to analyze user queries and determine:
1. Whether they want specific search results or profile-based recommendations
2. What search terms to use for best database matches
3. Whether to ignore their profile temporarily for this query

CRITICAL RULES:
- If user asks for specific programs (e.g., "computer science", "nursing", "engineering"), mark intent as 'search' and ignoreProfile as true
- Expand abbreviations to full terms (e.g., "comp sci" → ["computer science", "computing", "computer"])
- Include variations and related terms for better matching
- Preserve the user's actual intent - don't override with profile data

Return a JSON object with this exact structure:
{
  "improvedQuery": "the cleaned, improved query string",
  "searchTerms": ["primary term", "alternate term", "related term"],
  "intent": "search" or "profile_based" or "mixed",
  "ignoreProfile": true or false,
  "expandedTerms": {
    "original_term": ["expansion1", "expansion2"]
  }
}`;

  const userPrompt = `Analyze this query:
USER MESSAGE: "${userMessage}"
USER PROFILE: ${userProfile || "New user"}
PROFILE INTERESTS: ${extractedProfile?.interests?.join(", ") || "None"}

Determine if they're asking for something specific or want profile-based recommendations.
If they mention specific subjects/programs, prioritize those over their profile.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    // Parse the JSON response
    let cleaned = content.trim();
    cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/gi, "");

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const result = JSON.parse(cleaned);
    console.log("Query analysis result:", result);
    return result;
  } catch (error) {
    console.error("Query analysis error:", error);

    // Fallback: basic analysis
    const lowerMessage = userMessage.toLowerCase();
    const isSearch =
      lowerMessage.includes("show me") ||
      lowerMessage.includes("search") ||
      lowerMessage.includes("find") ||
      lowerMessage.includes("programs for") ||
      lowerMessage.includes("programs in");

    return {
      improvedQuery: userMessage,
      searchTerms: [userMessage],
      intent: isSearch ? "search" : "profile_based",
      ignoreProfile: isSearch,
      expandedTerms: {},
    };
  }
}

// NEW: Expand search terms for better matching
export function expandSearchTerms(query: string): string[] {
  const terms = new Set<string>([query.toLowerCase()]);

  // Common abbreviation expansions
  const expansions: Record<string, string[]> = {
    "comp sci": ["computer science", "computing", "computer"],
    cs: ["computer science", "computing"],
    bio: ["biology", "biological sciences", "life sciences"],
    chem: ["chemistry", "chemical"],
    psych: ["psychology", "psychological"],
    econ: ["economics", "economic"],
    "poli sci": ["political science", "politics"],
    "phys ed": ["physical education", "kinesiology"],
    bus: ["business", "business administration"],
    eng: ["engineering", "engineer"],
    it: ["information technology", "information systems"],
    math: ["mathematics", "mathematical"],
    stats: ["statistics", "statistical"],
    comm: ["communication", "communications"],
    ed: ["education", "educational"],
  };

  const queryLower = query.toLowerCase();

  // Check for abbreviations and add expansions
  for (const [abbr, fullTerms] of Object.entries(expansions)) {
    if (queryLower.includes(abbr)) {
      fullTerms.forEach(term => {
        terms.add(term);
        // Also add the query with abbreviation replaced
        terms.add(queryLower.replace(abbr, term));
      });
    }
  }

  // Add singular/plural variations
  if (queryLower.endsWith("s")) {
    terms.add(queryLower.slice(0, -1));
  } else {
    terms.add(queryLower + "s");
  }

  return Array.from(terms);
}

// Existing profiling functions continue below...

// Profiling conversation handler
export async function getProfilingChatResponse(chatMessages: ChatMessage[]) {
  const systemPrompt = `You are a career counselor for AI Pathways Hawaii. Have a natural conversation to understand:
- Current education situation
- Interests and passions  
- Career goals or curiosities
- Timeline and urgency
- Background context

Be warm and conversational. Ask ONE question at a time. After 8-10 exchanges, suggest exploring career options.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
      temperature: 0.8,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Groq profiling error:", error);
    return null;
  }
}

// Convert conversation to comprehensive text profile
export async function generateUserProfile(
  transcript: string
): Promise<string | null> {
  const systemPrompt = `Analyze this career counseling conversation and create a comprehensive user profile.

Write a detailed 4-5 sentence paragraph that captures:
- Current education level and situation
- Interests, strengths, and preferences
- Career goals or direction (if any)
- Timeline and urgency
- Relevant background context (family, location, challenges, etc.)

Write in third person and include all relevant details mentioned. This profile will be used by an AI to make intelligent career recommendations and database queries.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript },
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Profile generation error:", error);
    return null;
  }
}

// Generate smart contextual prompts based on the AI's last message
export async function generateSmartPrompts(
  lastAiMessage: string,
  userMessageCount: number,
  missingInfo: string[],
  isPostProfile: boolean = false
): Promise<string[]> {
  // Default fallbacks for different conversation stages
  const defaultPrompts: Record<number, string[]> = {
    0: [
      "I'm in high school",
      "I'm in college",
      "I'm working",
      "I'm exploring options",
    ],
    1: [
      "I'm a senior",
      "I'm just starting",
      "I've been working for a while",
      "I'm not sure yet",
    ],
    2: [
      "I really enjoy that",
      "That's interesting to me",
      "I haven't thought about it",
      "Tell me more",
    ],
    3: [
      "I like working with technology",
      "I enjoy helping people",
      "I prefer creative work",
      "I'm still figuring it out",
    ],
    4: [
      "Yes, I've considered that",
      "No, but I'm open to it",
      "I need more information",
      "What else is available?",
    ],
    5: [
      "I want to stay in Hawaii",
      "I'm open to moving",
      "I prefer remote work",
      "Location doesn't matter to me",
    ],
    6: [
      "Soon, within a year",
      "In a few years",
      "I'm not in a rush",
      "As soon as possible",
    ],
  };

  // Post-profile prompts (after profile is built)
  const postProfilePrompts = [
    "Show me career matches",
    "What are the highest paying options?",
    "What education programs are available?",
    "Tell me about job openings",
  ];

  // If this is post-profile, use post-profile prompts
  if (isPostProfile) {
    return postProfilePrompts;
  }

  try {
    const promptGenerationPrompt = `Generate 3-4 natural student responses to this career counselor's question.

COUNSELOR'S QUESTION: "${lastAiMessage}"

CONTEXT:
- This is message ${userMessageCount + 1} from the student
- We still need info about: ${missingInfo.length > 0 ? missingInfo.join(", ") : "general details"}
- The student is in Hawaii

Create responses that:
1. Sound natural and conversational
2. Vary in detail (some brief, some detailed)
3. Cover different scenarios
4. Actually answer the question asked

Return ONLY a JSON array of strings. Example: ["response 1", "response 2", "response 3"]
Do not include any other text, explanations, or formatting.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You generate student response options for a career counseling chat. Return ONLY a valid JSON array of 3-4 strings, nothing else.",
        },
        { role: "user", content: promptGenerationPrompt },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    console.log("Raw Groq response for prompts:", content);

    // Aggressive cleaning to extract JSON array
    let cleaned = content.trim();

    // Remove code blocks
    cleaned = cleaned.replace(/```json\s*/gi, "");
    cleaned = cleaned.replace(/```\s*/gi, "");

    // Find the JSON array boundaries
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");

    if (
      firstBracket === -1 ||
      lastBracket === -1 ||
      lastBracket <= firstBracket
    ) {
      console.error("Could not find array boundaries in:", cleaned);
      throw new Error("No valid JSON array found in response");
    }

    // Extract just the array
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);

    // Additional cleaning
    // Fix common issues like trailing commas
    cleaned = cleaned.replace(/,\s*]/g, "]");
    // Fix escaped quotes that might break parsing
    cleaned = cleaned.replace(/\\"/g, '"');
    // Remove any newlines within strings (replace with space)
    cleaned = cleaned.replace(/\n/g, " ");

    console.log("Cleaned JSON string:", cleaned);

    // Try to parse
    const prompts = JSON.parse(cleaned);

    if (!Array.isArray(prompts)) {
      throw new Error("Parsed result is not an array");
    }

    // Validate and clean the prompts
    const validPrompts = prompts
      .filter(p => typeof p === "string" && p.trim().length > 0)
      .map(p => p.trim())
      .slice(0, 4);

    if (validPrompts.length === 0) {
      throw new Error("No valid prompts in array");
    }

    return validPrompts;
  } catch (error) {
    console.error("Smart prompt generation error:", error);

    // Return appropriate fallbacks
    if (userMessageCount >= 7) {
      return postProfilePrompts;
    }

    const fallbackKey = Math.min(userMessageCount, 6);
    return defaultPrompts[fallbackKey] || defaultPrompts[0];
  }
}

// More robust profiling response with better prompts
export async function getEnhancedProfilingResponse(
  messages: ChatMessage[],
  userMessageCount: number,
  missingInfo: string[],
  readinessScore: number
): Promise<{ message: string; prompts: string[] }> {
  const systemPrompt = `You are a warm, encouraging career counselor for Hawaii students. 

CONVERSATION STATUS:
- User has sent ${userMessageCount} messages
- Missing information: ${missingInfo.length > 0 ? missingInfo.join(", ") : "None"}
- Progress: ${readinessScore}%

GUIDELINES:
1. Ask ONE clear, specific question at a time
2. Be conversational and warm, not robotic
3. Show interest in what they've shared
4. Build on their previous responses
5. If they seem unsure, offer examples or options
6. After 7 messages, we'll build their profile

${userMessageCount < 3 ? "Focus on making them comfortable and learning about their current situation." : ""}
${userMessageCount >= 3 && userMessageCount < 5 ? "Dig deeper into their interests and what motivates them." : ""}
${userMessageCount >= 5 && userMessageCount < 7 ? "Explore their goals and any concerns they have." : ""}
${userMessageCount >= 7 ? "We have enough for a profile! Thank them and prepare to analyze." : ""}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-6).map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      temperature: 0.7,
    });

    const message =
      response.choices[0].message.content ||
      "Tell me more about your interests and goals.";

    // Check if this is post-profile (after 7 messages)
    const isPostProfile = userMessageCount >= 7;

    // Generate smart prompts based on the response
    const prompts = await generateSmartPrompts(
      message,
      userMessageCount,
      missingInfo,
      isPostProfile
    );

    return { message, prompts };
  } catch (error) {
    console.error("Groq profiling error:", error);

    // Return appropriate fallbacks based on conversation stage
    if (userMessageCount >= 7) {
      // Post-profile fallbacks
      return {
        message:
          "Perfect! I've built your profile. What would you like to explore about careers in Hawaii?",
        prompts: [
          "Show me career matches",
          "What are the highest paying options?",
          "What education programs are available?",
          "Tell me about job openings",
        ],
      };
    } else if (userMessageCount === 0) {
      return {
        message:
          "Hi! I'm here to help you explore career paths in Hawaii. What's your current situation - are you in school, working, or exploring your options?",
        prompts: [
          "I'm in high school",
          "I'm in college",
          "I'm working",
          "I'm exploring options",
        ],
      };
    } else if (missingInfo.includes("education_level")) {
      return {
        message:
          "Could you tell me about your education level? Are you in high school, college, or already working?",
        prompts: [
          "I'm in high school",
          "I'm in college",
          "I graduated",
          "I'm working",
        ],
      };
    } else if (missingInfo.includes("interests")) {
      return {
        message:
          "What subjects or activities do you enjoy? What gets you excited or curious?",
        prompts: [
          "I like technology",
          "I enjoy creative work",
          "I like helping people",
          "I'm not sure",
        ],
      };
    } else {
      return {
        message:
          "Tell me more about your situation and what you're looking for.",
        prompts: [
          "I want good pay",
          "I want to help my community",
          "I'm open to anything",
          "I need more guidance",
        ],
      };
    }
  }
}

// Generate personalized suggested questions based on user's profile
export async function generatePersonalizedSuggestions(
  profileSummary: string,
  extractedProfile: any
): Promise<string[]> {
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

  try {
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
          return validSuggestions;
        }
      }
    }
  } catch (error) {
    console.error("Error generating personalized suggestions:", error);
  }

  // Intelligent fallbacks based on profile
  const fallbacks = [];

  // Based on interests
  if (extractedProfile.interests && extractedProfile.interests.length > 0) {
    const interest = extractedProfile.interests[0];
    fallbacks.push(`Show me ${interest} careers in Hawaii`);
  } else {
    fallbacks.push("What careers match my profile?");
  }

  // Based on education level
  if (extractedProfile.educationLevel?.includes("high_school")) {
    fallbacks.push("What college programs should I consider?");
  } else if (extractedProfile.educationLevel?.includes("college")) {
    fallbacks.push("Show me entry-level opportunities");
  } else {
    fallbacks.push("What training programs are available?");
  }

  // Based on goals
  if (extractedProfile.careerGoals && extractedProfile.careerGoals.length > 0) {
    fallbacks.push(`How do I become a ${extractedProfile.careerGoals[0]}?`);
  } else {
    fallbacks.push("What are the highest paying careers?");
  }

  // Based on location
  if (extractedProfile.location && extractedProfile.location !== "null") {
    fallbacks.push(`What's available on ${extractedProfile.location}?`);
  } else {
    fallbacks.push("Show me all opportunities in Hawaii");
  }

  return fallbacks.slice(0, 4);
}
