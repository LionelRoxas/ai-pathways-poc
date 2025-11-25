/* eslint-disable @typescript-eslint/no-explicit-any */
// api/exa-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";
import Groq from "groq-sdk";

const exa = new Exa(process.env.EXA_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { query, numResults = 5, conversationContext = [], generateSummary = false } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    // Generate enhanced search query using conversation context
    let enhancedQuery = query;
    if (conversationContext.length > 0) {
      console.log(`[EXA] Enhancing query with ${conversationContext.length} messages of context`);
      
      const recentMessages = conversationContext.slice(-6); // Last 3 exchanges
      const contextSummary = recentMessages
        .map((msg: any) => `${msg.role}: ${msg.content.slice(0, 200)}`)
        .join("\n");

      const queryEnhancement = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a search query optimizer. Focus ONLY on the user's current question. Use the conversation context only to add specificity (like location 'Hawaii' or institution 'UH'), but never change the core topic. If the user asks about engineering, search for engineering - not previous topics. Return ONLY the optimized search query, nothing else. Keep it concise (under 15 words).",
          },
          {
            role: "user",
            content: `Recent conversation:\n${contextSummary}\n\nCurrent question to search for: ${query}\n\nOptimized search query (focusing on current question):`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2, // Lower temperature for more focused output
      });

      enhancedQuery = queryEnhancement.choices[0]?.message?.content?.trim() || query;
      console.log(`[EXA] Enhanced query: "${enhancedQuery}"`);
    }

    console.log(`[EXA] Searching for: "${enhancedQuery}" (${numResults} results)`);

    // Search with Exa using the modern API with shorter summaries
    const searchResponse = await exa.search(enhancedQuery, {
      type: "auto", // Uses intelligent combination of neural and other search methods
      numResults,
      contents: {
        summary: { query: "Summarize the key findings in 2-3 sentences" }, // Request concise summary
      },
    });

    // Format results with concise information
    const results = searchResponse.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: (result.summary || result.text || "").slice(0, 300), // Limit to 300 chars
      summary: result.summary || null,
      publishedDate: result.publishedDate || null,
      author: result.author || null,
      score: result.score || null,
    }));

    console.log(`[EXA] ✅ Found ${results.length} results`);

    // Generate summary if requested
    let summary = null;
    if (generateSummary && results.length > 0) {
      console.log(`[EXA] 📝 Generating summary from ${results.length} sources...`);
      
      // Compile all summaries and text content from the SAME results shown in DataPanel
      const contentForSummary = results
        .map((result: any, idx: number) => {
          const content = result.summary || result.snippet || "No content available";
          console.log(`[EXA] Source ${idx + 1}: ${result.title.slice(0, 50)}... (${content.length} chars)`);
          return `Source ${idx + 1}: ${result.title}\n${content}`;
        })
        .join("\n\n");

      console.log(`[EXA] 📄 Total content for summary: ${contentForSummary.length} chars`);

      try {
        const summaryResponse = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a research assistant helping a student in Hawaii explore educational pathways. Synthesize the web sources into a well-structured markdown summary that directly answers the student's question.

**Format Requirements:**
- Start with a brief overview (1-2 sentences)
- Use clear headers (##) to organize main topics
- Use bullet points (-) for key information
- Use **bold** for important terms or numbers
- Keep it concise and scannable
- Focus on actionable information relevant to Hawaii students
- Do NOT cite sources or use phrases like "according to" or "the sources mention"

**Example structure:**
[Brief overview sentence]

## Key Findings
- Point 1 with **important details**
- Point 2 with relevant information

## Opportunities in Hawaii
- Local programs or opportunities
- Requirements or pathways
`,
            },
            {
              role: "user",
              content: `Student's question: ${query}\n\nWeb sources:\n\n${contentForSummary}\n\nProvide a well-structured markdown summary:`,
            },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 1000,
        });

        summary = summaryResponse.choices[0]?.message?.content?.trim() || null;
        console.log(`[EXA] ✅ Generated summary (${summary?.length || 0} chars)`);
      } catch (error) {
        console.error("[EXA] ❌ Error generating summary:", error);
      }
    }

    return NextResponse.json({
      results,
      summary,
      query: enhancedQuery,
      originalQuery: query,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[EXA] ❌ Search error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to perform web search" },
      { status: 500 }
    );
  }
}
