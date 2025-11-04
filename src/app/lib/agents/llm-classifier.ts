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

  const systemPrompt = `You are a query classifier for an educational pathways system. Analyze the user's message and determine their intent.

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

DECISION RULES:
- Look at ASSISTANT's last message to understand context
- If ASSISTANT offered to search/find/explore programs AND user agrees → SEARCH
- If user mentions ANY subject, field, career, or program → SEARCH
- If user expresses interest, goals, or aspirations → SEARCH
- If user asks about specifics of RECENTLY SHOWN results → CLARIFICATION
- If user is explaining their situation without asking for programs → REASONING
- If unsure → REASONING (let conversation handle it)

OUTPUT: Return ONLY valid JSON:
{
  "needsTools": true/false,
  "queryType": "search" | "clarification" | "greeting" | "reasoning",
  "reasoning": "brief explanation including what assistant said if relevant"
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Classify this query: "${message}"` }
      ],
      model: "llama-3.3-70b-versatile",
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
        reasoning: classification.reasoning
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
