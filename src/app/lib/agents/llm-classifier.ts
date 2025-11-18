/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/llm-classifier.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * LLM-BASED QUERY CLASSIFIER
 * Uses AI to intelligently determine user intent - much more flexible than pattern matching
 */
export async function classifyQueryWithLLM(
  message: string,
  conversationHistory: any[] = []
): Promise<{
  needsTools: boolean;
  queryType: 'search' | 'followup' | 'clarification' | 'reasoning' | 'greeting';
  reasoning: string;
  searchScope?: {
    type: 'island' | 'school' | 'general';
    location?: string;
  };
  degreePreference?: 'Non-Credit' | '2-Year' | '4-Year';
  institutionFilter?: {
    type: 'school' | 'college';
    name: string;
  };
}> {
  const lowerMessage = message.toLowerCase().trim();
  
  console.log('[LLM Classifier] 🔍 Analyzing message:', lowerMessage);

  // FAST PATH: Simple affirmative responses always trigger search
  const simpleAffirmative = /^(yes|yeah|yep|yup|sure|ok|okay)$/i;
  if (simpleAffirmative.test(lowerMessage)) {
    console.log('[LLM Classifier] ✅ Simple affirmative - auto-triggering tools');
    return {
      needsTools: true,
      queryType: 'followup',
      reasoning: 'User gave affirmative response'
    };
  }

  // FAST PATH: Simple greetings/acknowledgments never trigger search
  const simpleGreeting = /^(hi|hello|hey|aloha|thanks|thank you|got it|cool)$/i;
  if (simpleGreeting.test(lowerMessage)) {
    console.log('[LLM Classifier] 👋 Simple greeting/acknowledgment - conversational');
    return {
      needsTools: false,
      queryType: lowerMessage.match(/^(thanks|thank you|got it|cool)$/i) ? 'clarification' : 'greeting',
      reasoning: 'Simple greeting or acknowledgment'
    };
  }

  // LLM CLASSIFICATION for everything else
  const recentHistory = conversationHistory.slice(-4); // Get last 4 messages for better context
  const historyContext = recentHistory
    .map(msg => {
      const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      return `${role}: ${msg.content}`;
    })
    .join('\n\n');

  const systemPrompt = `You are a query classifier for an educational pathways system in Hawaii. Analyze the user's message and determine their intent AND search scope.

CONVERSATION CONTEXT (Recent Messages):
${historyContext || 'No previous conversation'}

CURRENT USER MESSAGE: "${message}"

CLASSIFICATION OPTIONS:

1. **SEARCH** - User wants to find/explore programs, careers, or pathways
   Examples:
   - "I'm interested in engineering"
   - "What programs are available?"
   - "Show me computer science options"
   - "I want to learn about healthcare careers"
   - Any mention of specific fields (culinary, science, business, etc.)
   
   IMPORTANT: If user says "yes" after assistant mentioned searching/exploring programs → SEARCH

2. **CLARIFICATION** - User asking questions about previous results or context
   Examples:
   - "Are there coding programs?" (when results were just shown)
   - "How many schools offer this?"
   - "What about on Oahu?"
   - "Do these programs have labs?"
   - Short questions starting with "any", "is there", "what about"
   
   IMPORTANT: Only CLARIFICATION if assistant JUST showed results or programs

3. **GREETING** - Simple greetings or social niceties
   Examples:
   - "Good morning"
   - "Hey there"
   - "Thanks for helping"

4. **REASONING** - Explaining their situation, goals, or asking for advice
   Examples:
   - "I'm not sure what to study"
   - "I'm trying to decide between two fields"
   - "What would be best for me?"
   - Sharing background information without requesting specific programs

SEARCH SCOPE (if queryType is "search"):

Determine if the search is:

A. **ISLAND-BASED** - User wants programs on a specific island
   - Mentions: Oahu, Maui, Kauai, Hawaii, Big Island
   - Mentions cities: Honolulu, Hilo, Kahului, Lihue, Waipahu, Mililani, Pearl City, etc.
   - Extract the island/city name as "location"

B. **SCHOOL-BASED** - User wants programs at a specific high school
   - Mentions: "high school", "school"
   - Specific schools: Pearl City High, Waipahu High, Campbell, Mililani, Farrington, etc.
   - Extract the school name as "location" (just the main name, e.g., "Pearl City" not "Pearl City High School")

C. **GENERAL** - Broad search across all locations
   - No specific location mentioned
   - General interest queries

HAWAII HIGH SCHOOLS TO RECOGNIZE:
Oahu: Aiea, Campbell, Castle, Farrington, Kahuku, Kailua, Kaimuki, Kaiser, Kalaheo, Kalani, Kapolei, Leilehua, McKinley, Mililani, Moanalua, Nanakuli, Pearl City, Radford, Roosevelt, Waialua, Waianae, Waipahu
Maui: Baldwin, Hana, King Kekaulike, Lahainaluna, Lanai, Maui, Molokai
Kauai: Kapaa, Kauai, Waimea
Hawaii: Hilo, Honokaa, Kau, Keaau, Kealakehe, Kohala, Konawaena, Pahoa, Waiakea

DEGREE LEVEL PREFERENCE (if queryType is "search"):

Detect if user wants a specific degree level:

A. **Non-Credit** (certificates, training, workshops, no college required):
   - "without college", "no college", "without going to college"
   - "certificate", "certification", "training", "workshop"
   - "non-credit", "noncredit", "continuing education"
   - Return: "Non-Credit"

B. **2-Year** (associate degrees, community college):
   - "associate", "associate degree", "associate's"
   - "community college", "2-year", "two year"
   - Return: "2-Year"

C. **4-Year** (bachelor's degrees, university):
   - "bachelor", "bachelor's", "bachelor's degree"
   - "university", "4-year", "four year"
   - Return: "4-Year"

D. **No Preference** (show all levels):
   - No specific degree level mentioned
   - Return: null

INSTITUTION FILTER (if user specifies a particular school or college):

Detect if user wants programs from a SPECIFIC institution:

A. **High School Filter**:
   - Mentions specific high school name: "Pearl City High School", "at Campbell", "Waipahu High"
   - Format: Return institutionFilter: { type: "school", name: "Pearl City" } (just the main name)

B. **College Filter**:
   - Mentions specific college/university: "at UH Manoa", "Honolulu Community College", "Hawaii Pacific University"
   - Common colleges: UH (University of Hawaii), KCC (Kapiolani Community College), LCC (Leeward), WCC (Windward), HonCC (Honolulu CC), HPU (Hawaii Pacific), Chaminade, BYU-Hawaii
   - Format: Return institutionFilter: { type: "college", name: "extracted college name" }

C. **No Institution Filter**:
   - General search across all institutions
   - Return: null

OUTPUT: Return ONLY valid JSON:
{
  "needsTools": true/false,
  "queryType": "search" | "clarification" | "greeting" | "reasoning",
  "reasoning": "brief explanation",
  "searchScope": {
    "type": "island" | "school" | "general",
    "location": "extracted location name or null"
  },
  "degreePreference": "Non-Credit" | "2-Year" | "4-Year" | null,
  "institutionFilter": {
    "type": "school" | "college",
    "name": "institution name"
  } | null
}

If queryType is NOT "search", omit searchScope or set it to null.`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Classify this query: "${message}"` }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
    });

    const content = response.choices[0].message.content || '{}';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const classification = JSON.parse(jsonMatch[0]);
      
      console.log('[LLM Classifier] 🤖 Classification:', classification);
      
      return {
        needsTools: classification.needsTools,
        queryType: classification.queryType,
        reasoning: classification.reasoning,
        searchScope: classification.searchScope || undefined,
        degreePreference: classification.degreePreference || undefined,
        institutionFilter: classification.institutionFilter || undefined
      };
    }
  } catch (error) {
    console.error('[LLM Classifier] Error:', error);
  }

  // FALLBACK: Default to conversational if LLM fails
  console.log('[LLM Classifier] ⚠️ LLM failed - defaulting to CONVERSATIONAL');
  return {
    needsTools: false,
    queryType: 'clarification',
    reasoning: 'Fallback classification - being conversational'
  };
}
