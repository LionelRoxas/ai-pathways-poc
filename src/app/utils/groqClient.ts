/* eslint-disable @typescript-eslint/no-explicit-any */
// app/utils/groqClient.ts (Enhanced with Multi-Language Support)
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Language-specific system prompts helper
export function getLanguagePrompt(language: string): string {
  switch (language) {
    case "haw":
      return `You are a career counselor who speaks fluent Hawaiian (ʻŌlelo Hawaiʻi). 
Respond entirely in Hawaiian, maintaining professionalism while being warm and supportive. 
Use proper Hawaiian grammar and diacritical marks (kahakō and ʻokina).
Keep responses conversational but professional.`;

    case "hwp":
      return `You are a career counselor who speaks Hawaiian Pidgin English. 
Respond in authentic Hawaiian Pidgin, being warm, friendly and professional.
Use natural Pidgin grammar and vocabulary like: "stay", "get", "da kine", "yeah", "brah", "shoots".
Keep it respectful and supportive while maintaining local style.`;

    case "tl":
      return `You are a career counselor who speaks fluent Tagalog. 
Respond entirely in Tagalog, maintaining professionalism while being warm and supportive.
Use proper Tagalog grammar and be respectful (use "po" and "opo" appropriately).
Keep responses professional but friendly.`;

    default:
      return `You are a professional career counselor in Hawaii. 
Respond in clear, professional English while being warm and supportive.
Be culturally aware of Hawaii's diverse population.`;
  }
}

// Analyze and improve user queries for better search results (with language support)
export async function analyzeAndImproveQuery(
  userMessage: string,
  userProfile?: string,
  extractedProfile?: any,
  language: string = "en"
): Promise<{
  improvedQuery: string;
  searchTerms: string[];
  intent: "search" | "profile_based" | "mixed";
  ignoreProfile: boolean;
  expandedTerms: Record<string, string[]>;
}> {
  const languageContext =
    language !== "en"
      ? `The user is communicating in ${language === "haw" ? "Hawaiian" : language === "hwp" ? "Pidgin" : language === "tl" ? "Tagalog" : "English"}. Understand their query in that context.`
      : "";

  const systemPrompt = `You are a query analysis expert for an education database system. ${languageContext}
Your job is to analyze user queries and determine:
1. Whether they want specific search results or profile-based recommendations
2. What search terms to use for best database matches
3. Whether to ignore their profile temporarily for this query

CRITICAL RULES:
- If user asks for specific programs (e.g., "computer science", "nursing", "engineering"), mark intent as 'search' and ignoreProfile as true
- Expand abbreviations to full terms (e.g., "comp sci" → ["computer science", "computing", "computer"])
- Include variations and related terms for better matching
- Preserve the user's actual intent - don't override with profile data
- Understand queries in the context of the language being used

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

  const userPrompt = `Analyze this query (language: ${language}):
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

// Expand search terms for better matching
export function expandSearchTerms(query: string): string[] {
  const terms = new Set<string>([query.toLowerCase()]);

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

  for (const [abbr, fullTerms] of Object.entries(expansions)) {
    if (queryLower.includes(abbr)) {
      fullTerms.forEach(term => {
        terms.add(term);
        terms.add(queryLower.replace(abbr, term));
      });
    }
  }

  if (queryLower.endsWith("s")) {
    terms.add(queryLower.slice(0, -1));
  } else {
    terms.add(queryLower + "s");
  }

  return Array.from(terms);
}

// Profiling conversation handler (basic, without language - kept for compatibility)
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

// Convert conversation to comprehensive text profile (with language support)
export async function generateUserProfile(
  transcript: string,
  language: string = "en"
): Promise<string | null> {
  const languageInstruction =
    language !== "en"
      ? `Note: The conversation may contain ${language === "haw" ? "Hawaiian" : language === "hwp" ? "Pidgin" : language === "tl" ? "Tagalog" : "English"} language. Understand it in context but write the profile in English for system use.`
      : "";

  const systemPrompt = `Analyze this career counseling conversation and create a comprehensive user profile.
${languageInstruction}

Write a detailed 4-5 sentence paragraph IN ENGLISH that captures:
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

// Generate smart contextual prompts based on the AI's last message (with language support)
export async function generateSmartPrompts(
  lastAiMessage: string,
  userMessageCount: number,
  missingInfo: string[],
  isPostProfile: boolean = false,
  language: string = "en"
): Promise<string[]> {
  // Language-specific default prompts
  const defaultPromptsByLanguage: Record<string, Record<number, string[]>> = {
    en: {
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
    },
    haw: {
      0: [
        "Aia au i ke kula kiʻekiʻe",
        "Aia au i ke kulanui",
        "Ke hana nei au",
        "Ke ʻimi nei au i nā koho",
      ],
      1: [
        "He senior au",
        "Ua hoʻomaka wale au",
        "Ua hana au no kekahi manawa",
        "ʻAʻole au i maopopo",
      ],
      2: [
        "Hauʻoli loa au i kēlā",
        "Hoihoi iaʻu kēlā",
        "ʻAʻole au i noʻonoʻo",
        "E haʻi hou mai",
      ],
      3: [
        "Makemake au e hana me ka ʻenehana",
        "Hauʻoli au e kōkua i ka poʻe",
        "Makemake au i ka hana noʻeau",
        "Ke ʻimi nei au",
      ],
      4: [
        "ʻAe, ua noʻonoʻo au",
        "ʻAʻole, akā hiki iaʻu",
        "Pono au i ka ʻike hou",
        "He aha hou?",
      ],
      5: [
        "Makemake au e noho i Hawaiʻi",
        "Hiki iaʻu ke neʻe",
        "Makemake au i ka hana mamao",
        "ʻAʻole koʻu kuleana ka wahi",
      ],
      6: [
        "Koke, i loko o hoʻokahi makahiki",
        "I kekahi mau makahiki",
        "ʻAʻole au e wikiwiki",
        "I kēia manawa koke",
      ],
    },
    hwp: {
      0: [
        "I stay high school",
        "I stay college",
        "I stay working",
        "I stay exploring options",
      ],
      1: [
        "I stay one senior",
        "I jus wen start",
        "I been working fo while",
        "I not sure yet",
      ],
      2: [
        "I really like dat",
        "Dat stay interesting",
        "I neva think about um",
        "Tell me more",
      ],
      3: [
        "I like work wit technology",
        "I like help people",
        "I like creative kine work",
        "I still figuring out",
      ],
      4: [
        "Yeah, I wen consider dat",
        "No, but I stay open",
        "I need more info",
        "Wat else get?",
      ],
      5: [
        "I like stay Hawaii",
        "I can move",
        "I like work from home",
        "No matter where",
      ],
      6: ["Soon, within one year", "In couple years", "No rush", "ASAP"],
    },
    tl: {
      0: [
        "Nasa high school ako",
        "Nasa kolehiyo ako",
        "Nagtatrabaho ako",
        "Nag-eeksplora ako",
      ],
      1: [
        "Senior na ako",
        "Nagsisimula pa lang ako",
        "Matagal na akong nagtatrabaho",
        "Hindi pa ako sigurado",
      ],
      2: [
        "Gustong-gusto ko yan",
        "Interesante yan",
        "Hindi ko pa naisip",
        "Sabihin mo pa",
      ],
      3: [
        "Gusto ko technology",
        "Gusto ko tumulong sa tao",
        "Gusto ko creative work",
        "Hinahanap ko pa",
      ],
      4: [
        "Oo, naisip ko na yan",
        "Hindi, pero open ako",
        "Kailangan ko pa ng info",
        "Ano pa meron?",
      ],
      5: [
        "Gusto ko sa Hawaii",
        "Pwede akong lumipat",
        "Gusto ko remote work",
        "Kahit saan",
      ],
      6: [
        "Malapit na, within isang taon",
        "Sa ilang taon",
        "Hindi nagmamadali",
        "Kaagad",
      ],
    },
  };

  const postProfilePromptsByLanguage: Record<string, string[]> = {
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
      "Sabihin tungkol sa job openings",
    ],
  };

  const defaultPrompts =
    defaultPromptsByLanguage[language] || defaultPromptsByLanguage.en;
  const postProfilePrompts =
    postProfilePromptsByLanguage[language] || postProfilePromptsByLanguage.en;

  if (isPostProfile) {
    return postProfilePrompts;
  }

  try {
    const languagePrompt = getLanguagePrompt(language);

    const promptGenerationPrompt = `${languagePrompt}

Generate 3-4 natural student responses to this career counselor's question.

COUNSELOR'S QUESTION: "${lastAiMessage}"

CONTEXT:
- This is message ${userMessageCount + 1} from the student
- We still need info about: ${missingInfo.length > 0 ? missingInfo.join(", ") : "general details"}
- The student is in Hawaii
- Respond in ${language === "haw" ? "Hawaiian" : language === "hwp" ? "Pidgin" : language === "tl" ? "Tagalog" : "English"}

Create responses that:
1. Sound natural and conversational in the specified language
2. Vary in detail (some brief, some detailed)
3. Cover different scenarios
4. Actually answer the question asked

Return ONLY a JSON array of strings. Example: ["response 1", "response 2", "response 3"]`;

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

    let cleaned = content.trim();
    cleaned = cleaned.replace(/```json\s*/gi, "");
    cleaned = cleaned.replace(/```\s*/gi, "");

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

    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    cleaned = cleaned.replace(/,\s*]/g, "]");
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\n/g, " ");

    console.log("Cleaned JSON string:", cleaned);

    const prompts = JSON.parse(cleaned);

    if (!Array.isArray(prompts)) {
      throw new Error("Parsed result is not an array");
    }

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

    if (userMessageCount >= 7) {
      return postProfilePrompts;
    }

    const fallbackKey = Math.min(userMessageCount, 6);
    return defaultPrompts[fallbackKey] || defaultPrompts[0];
  }
}

// Enhanced profiling response with language support
export async function getEnhancedProfilingResponse(
  messages: ChatMessage[],
  userMessageCount: number,
  missingInfo: string[],
  readinessScore: number,
  language: string = "en"
): Promise<{ message: string; prompts: string[] }> {
  const languagePrompt = getLanguagePrompt(language);

  const systemPrompt = `${languagePrompt}

You are a warm, encouraging career counselor for Hawaii students. 

IMPORTANT: You are in PROFILING MODE. Your ONLY job is to ask clarifying questions to learn about the student. 

DO NOT:
- Answer their questions about careers, programs, or jobs
- Provide recommendations or suggestions
- Give advice or information
- Explain anything about education or career paths

DO:
- Ask ONE clear, specific question at a time to learn about THEM
- Acknowledge what they share with brief warmth
- Probe deeper into their interests, goals, and situation
- Build on their previous responses
- Respond in ${language === "haw" ? "Hawaiian" : language === "hwp" ? "Pidgin" : language === "tl" ? "Tagalog" : "English"}

CONVERSATION STATUS:
- User has sent ${userMessageCount} messages
- Missing information: ${missingInfo.length > 0 ? missingInfo.join(", ") : "None"}
- Progress: ${readinessScore}%

RESPONSE FORMAT:
- Keep responses SHORT (1-2 sentences maximum)
- Use **bold text** for key terms and important points (surround with double asterisks)
- Write naturally and conversationally
- NO bullet points, italics, underlines, or numbered lists
- ALWAYS end with ONE clear question about the student

EXAMPLE RESPONSE STRUCTURE:
Great! I can see you're interested in **technology**. That opens up a lot of opportunities in Hawaii.

What specifically about technology excites you most?

${userMessageCount < 0 ? "Focus on making them comfortable and learning about their current situation." : ""}
${userMessageCount >= 1 ? "Dig deeper into their interests and what motivates them." : ""}
${userMessageCount >= 2 ? "Explore their goals and any concerns they have." : ""}
${userMessageCount >= 3 ? "We have enough for a profile! Thank them and prepare to analyze." : ""}`;

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
      response.choices[0].message.content || getDefaultMessage(language);

    const isPostProfile = userMessageCount >= 7;

    const prompts = await generateSmartPrompts(
      message,
      userMessageCount,
      missingInfo,
      isPostProfile,
      language
    );

    return { message, prompts };
  } catch (error) {
    console.error("Groq profiling error:", error);

    const fallbackMessages: Record<string, any> = {
      en: {
        postProfile:
          "Perfect! I've built your profile. What would you like to explore about careers in Hawaii?",
        initial:
          "Hi! I'm here to help you explore career paths in Hawaii. What's your current situation - are you in school, working, or exploring your options?",
        education:
          "Could you tell me about your education level? Are you in high school, college, or already working?",
        interests:
          "What subjects or activities do you enjoy? What gets you excited or curious?",
        general:
          "Tell me more about your situation and what you're looking for.",
      },
      haw: {
        postProfile:
          "Maikaʻi! Ua hana au i kou moʻolelo. He aha kāu makemake e ʻike e pili ana i nā ʻoihana ma Hawaiʻi?",
        initial:
          "Aloha! Eia au e kōkua iā ʻoe e ʻimi i nā ala ʻoihana ma Hawaiʻi. He aha kou kūlana i kēia manawa?",
        education:
          "E hiki paha iā ʻoe ke haʻi mai i kou pae hoʻonaʻauao? Aia ʻoe i ke kula kiʻekiʻe, kulanui, a i ʻole e hana ana?",
        interests:
          "He aha nā kumuhana a i ʻole nā hana āu e hauʻoli ai? He aha e hoʻopiʻi i kou hoihoi?",
        general: "E haʻi mai iaʻu e pili ana i kou kūlana a me kāu e ʻimi nei.",
      },
      hwp: {
        postProfile:
          "Shoots! I wen make your profile. Wat you like know about careers in Hawaii?",
        initial:
          "Howzit! I stay here fo help you find career paths in Hawaii. Wat's your situation - you stay school, working, or checking out options?",
        education:
          "Can tell me about your education? You stay high school, college, or working already?",
        interests:
          "Wat subjects or activities you like? Wat makes you excited?",
        general: "Tell me more about your situation and wat you looking for.",
      },
      tl: {
        postProfile:
          "Perpekto! Nagawa ko na ang iyong profile. Ano ang gusto mong malaman tungkol sa mga karera sa Hawaii?",
        initial:
          "Kumusta! Nandito ako para tulungan kang hanapin ang mga landas ng karera sa Hawaii. Ano ang iyong sitwasyon?",
        education:
          "Pwede mo bang sabihin ang iyong antas ng edukasyon? Nasa high school, kolehiyo, o nagtatrabaho ka na?",
        interests:
          "Anong mga subject o aktibidad ang gusto mo? Ano ang nag-eexcite sa iyo?",
        general:
          "Sabihin mo pa tungkol sa iyong sitwasyon at kung ano ang hinahanap mo.",
      },
    };

    const fallback = fallbackMessages[language] || fallbackMessages.en;

    if (userMessageCount >= 7) {
      return {
        message: fallback.postProfile,
        prompts: await generateSmartPrompts("", userMessageCount, [], true, language),
      };
    } else if (userMessageCount === 0) {
      return {
        message: fallback.initial,
        prompts: await generateSmartPrompts("", 0, missingInfo, false, language),
      };
    } else if (missingInfo.includes("education_level")) {
      return {
        message: fallback.education,
        prompts: await generateSmartPrompts(
          "",
          userMessageCount,
          missingInfo,
          false,
          language
        ),
      };
    } else if (missingInfo.includes("interests")) {
      return {
        message: fallback.interests,
        prompts: await generateSmartPrompts(
          "",
          userMessageCount,
          missingInfo,
          false,
          language
        ),
      };
    } else {
      return {
        message: fallback.general,
        prompts: await generateSmartPrompts(
          "",
          userMessageCount,
          missingInfo,
          false,
          language
        ),
      };
    }
  }
}

// Helper function to get default messages in different languages
function getDefaultMessage(language: string): string {
  const messages: Record<string, string> = {
    en: "Tell me more about your interests and goals.",
    haw: "E haʻi mai iaʻu e pili ana i kou mau hoihoi a me nā pahuhopu.",
    hwp: "Tell me more about wat you interested in and wat you like do.",
    tl: "Sabihin mo pa tungkol sa iyong mga interes at layunin.",
  };
  return messages[language] || messages.en;
}

// Generate personalized suggested questions based on user's profile (with language support)
export async function generatePersonalizedSuggestions(
  profileSummary: string,
  extractedProfile: any,
  language: string = "en"
): Promise<string[]> {
  const languagePrompt = getLanguagePrompt(language);

  const systemPrompt = `${languagePrompt}

Based on a student's profile, generate 4 highly relevant, personalized questions they might want to ask about careers in Hawaii.

The questions should:
1. Be specific to their interests, education level, and goals
2. Reference actual details from their profile
3. Sound natural and conversational in ${language === "haw" ? "Hawaiian" : language === "hwp" ? "Pidgin" : language === "tl" ? "Tagalog" : "English"}
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

Generate questions in ${language === "haw" ? "Hawaiian" : language === "hwp" ? "Pidgin" : language === "tl" ? "Tagalog" : "English"}.`;

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

  // Language-specific intelligent fallbacks
  const fallbacksByLanguage: Record<string, string[]> = {
    en: [
      extractedProfile?.interests?.[0]
        ? `Show me ${extractedProfile.interests[0]} careers in Hawaii`
        : "What careers match my profile?",
      extractedProfile?.educationLevel?.includes("high_school")
        ? "What college programs should I consider?"
        : "Show me entry-level opportunities",
      extractedProfile?.careerGoals?.[0]
        ? `How do I become a ${extractedProfile.careerGoals[0]}?`
        : "What are the highest paying careers?",
      extractedProfile?.location
        ? `What's available on ${extractedProfile.location}?`
        : "Show me all opportunities in Hawaii",
    ],
    haw: [
      extractedProfile?.interests?.[0]
        ? `E hōʻike mai i nā ʻoihana ${extractedProfile.interests[0]} ma Hawaiʻi`
        : "He aha nā ʻoihana kūpono iaʻu?",
      extractedProfile?.educationLevel?.includes("high_school")
        ? "He aha nā papahana kulanui e noʻonoʻo ai?"
        : "E hōʻike mai i nā ʻoihana hoʻomaka",
      extractedProfile?.careerGoals?.[0]
        ? `Pehea e lilo ai au i ${extractedProfile.careerGoals[0]}?`
        : "He aha nā ʻoihana uku kiʻekiʻe?",
      extractedProfile?.location
        ? `He aha ka mea ma ${extractedProfile.location}?`
        : "E hōʻike mai i nā mea ma Hawaiʻi",
    ],
    hwp: [
      extractedProfile?.interests?.[0]
        ? `Show me ${extractedProfile.interests[0]} careers in Hawaii`
        : "Wat careers match my profile?",
      extractedProfile?.educationLevel?.includes("high_school")
        ? "Wat college programs I should check out?"
        : "Show me entry-level kine",
      extractedProfile?.careerGoals?.[0]
        ? `How I going be one ${extractedProfile.careerGoals[0]}?`
        : "Wat stay da highest paying jobs?",
      extractedProfile?.location
        ? `Wat get on ${extractedProfile.location}?`
        : "Show me everything in Hawaii",
    ],
    tl: [
      extractedProfile?.interests?.[0]
        ? `Ipakita ang ${extractedProfile.interests[0]} careers sa Hawaii`
        : "Anong careers ang tugma sa akin?",
      extractedProfile?.educationLevel?.includes("high_school")
        ? "Anong college programs dapat kong tingnan?"
        : "Ipakita ang entry-level opportunities",
      extractedProfile?.careerGoals?.[0]
        ? `Paano ako magiging ${extractedProfile.careerGoals[0]}?`
        : "Ano ang pinakamataas na sahod?",
      extractedProfile?.location
        ? `Ano ang available sa ${extractedProfile.location}?`
        : "Ipakita lahat sa Hawaii",
    ],
  };

  return fallbacksByLanguage[language] || fallbacksByLanguage.en;
}
