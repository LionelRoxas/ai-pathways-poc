/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/ai-pathways/route.ts (Complete with Language and Markdown Support)
import { NextRequest, NextResponse } from "next/server";
import { handleMCPRequest } from "../../lib/mcp/pathways-mcp-server";
import Groq from "groq-sdk";
import { analyzeAndImproveQuery } from "../../utils/groqClient";
import { CacheService } from "../../lib/cache/cache-service";
import {
  AIPathwaysResponse,
  MCPQueryPlan,
  CurrentData,
  ExtractedProfile,
} from "../../components/AIPathwaysChat/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const cache = CacheService.getInstance();

// Language-specific system prompts
function getLanguageSystemPrompt(language: string): string {
  switch (language) {
    case "haw":
      return `You are a career counselor who speaks fluent Hawaiian (ʻŌlelo Hawaiʻi). 
Respond entirely in Hawaiian, maintaining professionalism while being warm and supportive. 
Use proper Hawaiian grammar and diacritical marks (kahakō and ʻokina).
When discussing programs, keep the English names but explain them in Hawaiian.`;

    case "hwp":
      return `You are a local Hawaii career counselor who speaks Hawaiian Pidgin English. 
Respond in authentic Hawaiian Pidgin, being warm, friendly and professional.
Use natural Pidgin grammar and vocabulary like: "stay", "get", "da kine", "yeah", "brah", "shoots".
Keep it respectful and supportive while maintaining local style.`;

    case "tl":
      return `You are a career counselor who speaks fluent Tagalog. 
Respond entirely in Tagalog, maintaining professionalism while being warm and supportive.
Use proper Tagalog grammar and be respectful (use "po" and "opo" appropriately).
When discussing programs, keep the English names but explain them in Tagalog.`;

    default:
      return `You are a professional career counselor in Hawaii. 
Respond in clear, professional English while being warm and supportive.
Be culturally aware of Hawaii's diverse population.`;
  }
}

// Plan MCP queries based on analyzed query and profile
async function planMCPQueries(
  userProfile: string,
  message: string,
  extractedProfile?: ExtractedProfile,
  language: string = "en"
): Promise<MCPQueryPlan> {
  // Step 1: Analyze and improve the user's query (pass language for better understanding)
  const queryAnalysis = await analyzeAndImproveQuery(
    message,
    userProfile,
    extractedProfile,
    language
  );

  console.log("Query analysis result:", queryAnalysis);

  const queries: MCPQueryPlan["queries"] = [];

  // Step 2: Determine if we should use profile or query-based search
  const useProfile = !queryAnalysis.ignoreProfile;

  // Check if user is asking about high school courses specifically
  const messageLower = message.toLowerCase();
  const isAskingAboutHSCourses =
    messageLower.includes("class") ||
    messageLower.includes("course") ||
    messageLower.includes("sophomore") ||
    messageLower.includes("junior") ||
    messageLower.includes("senior") ||
    messageLower.includes("freshman") ||
    messageLower.includes("high school") ||
    messageLower.includes("next year") ||
    messageLower.includes("grade");

  // Context from profile (only used if not ignoring profile)
  const context = useProfile
    ? {
        educationLevel: extractedProfile?.educationLevel || undefined,
        gradeLevel:
          extractedProfile?.gradeLevel ||
          (extractedProfile?.educationLevel === "high_school_student"
            ? 9
            : undefined),
        interests: extractedProfile?.interests || [],
        careerGoals: extractedProfile?.careerGoals || [],
        location: extractedProfile?.location || "Hawaii",
        timeline: extractedProfile?.timeline || undefined,
      }
    : {
        location: extractedProfile?.location || "Hawaii",
      };

  // Step 3: Build queries based on intent and search terms
  if (
    isAskingAboutHSCourses &&
    (context.educationLevel === "high_school" ||
      context.educationLevel === "high_school_student" ||
      queryAnalysis.intent === "profile_based")
  ) {
    queries.push({
      tool: "getDOEPrograms",
      params: {
        interests: context.interests,
        gradeLevel: context.gradeLevel || 9,
        careerGoals: context.careerGoals,
        limit: 30,
      },
      priority: "primary",
    });

    queries.push({
      tool: "getEducationPathways",
      params: {
        interests: context.interests,
        gradeLevel: context.gradeLevel || 9,
        location: context.location,
        limit: 30,
      },
      priority: "supporting",
    });

    queries.push({
      tool: "getUHPrograms",
      params: {
        interests: context.interests,
        educationLevel: context.educationLevel,
        location: context.location,
        careerGoals: context.careerGoals,
        limit: 20,
      },
      priority: "supporting",
    });
  } else {
    switch (queryAnalysis.intent) {
      case "search":
        if (queryAnalysis.searchTerms.length > 0) {
          queries.push({
            tool: "searchPrograms",
            params: {
              query: queryAnalysis.searchTerms[0],
              expandedTerms: queryAnalysis.searchTerms,
              type: "all",
              limit: 100,
              getAllMatches: true,
            },
            priority: "primary",
          });

          queries.push({
            tool: "getUHPrograms",
            params: {
              interests: queryAnalysis.searchTerms,
              location: context.location,
              limit: 100,
              getAllMatches: true,
              ignoreProfile: true,
            },
            priority: "primary",
          });

          queries.push({
            tool: "getDOEPrograms",
            params: {
              interests: queryAnalysis.searchTerms,
              limit: 50,
              getAllMatches: true,
              ignoreProfile: true,
            },
            priority: "supporting",
          });
        }
        break;

      case "profile_based":
        const isHighSchoolStudent =
          context.educationLevel === "high_school" ||
          context.educationLevel === "high_school_student" ||
          context.gradeLevel !== undefined;

        if (isHighSchoolStudent) {
          queries.push({
            tool: "getDOEPrograms",
            params: {
              interests: context.interests,
              gradeLevel: context.gradeLevel || 9,
              careerGoals: context.careerGoals,
              limit: 30,
            },
            priority: "primary",
          });

          queries.push({
            tool: "getEducationPathways",
            params: {
              interests: context.interests,
              gradeLevel: context.gradeLevel || 9,
              location: context.location,
              limit: 50,
            },
            priority: "supporting",
          });

          queries.push({
            tool: "getUHPrograms",
            params: {
              interests: context.interests,
              educationLevel: context.educationLevel,
              location: context.location,
              careerGoals: context.careerGoals,
              limit: 20,
            },
            priority: "supporting",
          });
        } else {
          queries.push({
            tool: "getUHPrograms",
            params: {
              interests: context.interests,
              educationLevel: context.educationLevel,
              gradeLevel: context.gradeLevel,
              location: context.location,
              careerGoals: context.careerGoals,
              limit: 50,
            },
            priority: "primary",
          });
        }
        break;

      case "mixed":
        const combinedInterests = [
          ...queryAnalysis.searchTerms,
          ...(useProfile ? context.interests || [] : []),
        ];

        queries.push({
          tool: "getUHPrograms",
          params: {
            interests: combinedInterests,
            educationLevel: useProfile ? context.educationLevel : undefined,
            location: context.location,
            careerGoals: useProfile ? context.careerGoals : undefined,
            limit: 75,
            getAllMatches: true,
          },
          priority: "primary",
        });
        break;

      default:
        if (queryAnalysis.searchTerms.length > 0) {
          queries.push({
            tool: "searchPrograms",
            params: {
              query: queryAnalysis.searchTerms[0],
              expandedTerms: queryAnalysis.searchTerms,
              type: "all",
              limit: 50,
            },
            priority: "primary",
          });
        } else {
          queries.push({
            tool: "getUHPrograms",
            params: {
              interests: context.interests,
              educationLevel: context.educationLevel,
              location: context.location,
              careerGoals: context.careerGoals,
              limit: 50,
            },
            priority: "primary",
          });
        }
        break;
    }
  }

  // Always add database stats
  queries.push({
    tool: "getDatabaseStats",
    params: {},
    priority: "supporting",
  });

  // Add career data lookup if we have search terms or interests
  if (
    queryAnalysis.searchTerms.length > 0 ||
    (context.interests?.length ?? 0) > 0
  ) {
    queries.push({
      tool: "getLightcastCareerData",
      params: {
        programName: queryAnalysis.searchTerms[0],
        interests: context.interests || queryAnalysis.searchTerms,
        limit: 100,
      },
      priority: "supporting",
    });
  }

  return {
    intent: queryAnalysis.intent as any,
    queries,
    extractedContext: {
      ...context,
      searchTerms: queryAnalysis.searchTerms,
      improvedQuery: queryAnalysis.improvedQuery,
      ignoreProfile: queryAnalysis.ignoreProfile,
    },
  };
}

// Generate response based on MCP data with language and Markdown support
// Generate response based on MCP data with language and Markdown support
async function generateDataDrivenResponse(
  userProfile: string,
  message: string,
  mcpData: any,
  queryPlan: MCPQueryPlan,
  language: string = "en"
): Promise<string> {
  const languagePrompt = getLanguageSystemPrompt(language);

  // Prepare career data summary for the prompt
  let careerDataSummary = "";
  if (mcpData.careerData && mcpData.careerData.length > 0) {
    const topCareers = mcpData.careerData
      .filter(
        (career: any) =>
          career.subjectArea &&
          career.medianSalary !== undefined &&
          career.uniquePostings !== undefined &&
          career.uniqueCompanies !== undefined
      )
      .slice(0, 10);

    if (topCareers.length > 0) {
      const careerList = topCareers
        .map(
          (career: any) =>
            `- ${career.subjectArea}: $${career.medianSalary.toLocaleString()} median salary, ${career.uniquePostings} job postings, ${career.uniqueCompanies} companies`
        )
        .join("\n");

      careerDataSummary = `\n\nAVAILABLE CAREER MARKET DATA:
${careerList}

CRITICAL: You may ONLY mention salary figures and job numbers that are EXPLICITLY listed above. Do NOT:
- Calculate averages or ranges
- Estimate or approximate salaries
- Combine or aggregate numbers
- Mention career data if none exists for the program being discussed
If a program has no matching career data above, simply discuss the program WITHOUT mentioning salaries or job markets.`;
    }
  }

  const systemPrompt = `${languagePrompt}

You are helping students find educational pathways in Hawaii.

USER PROFILE: ${userProfile}
USER MESSAGE: ${message}
QUERY ANALYSIS: User asked for: "${queryPlan.extractedContext?.improvedQuery || message}"
SEARCH TERMS: ${queryPlan.extractedContext?.searchTerms?.join(", ") || "none"}
IGNORE PROFILE: ${queryPlan.extractedContext?.ignoreProfile ? "YES - User wants specific programs, not profile-based recommendations" : "NO - Use profile for recommendations"}
DATABASE RESULTS: ${JSON.stringify(mcpData, null, 2)}${careerDataSummary}

CRITICAL RULES:
1. Respond in ${language === "haw" ? "Hawaiian" : language === "hwp" ? "Pidgin" : language === "tl" ? "Tagalog" : "English"}
2. **FORMAT YOUR RESPONSE IN MARKDOWN** with ONLY these two formatting options:
   - Use **bold** for important program names, campuses, and key terms
   - Use bullet points (- ) for listing multiple programs or features
   - DO NOT use italics, underlines, headers, or any other markdown formatting
3. If the user asked for SPECIFIC programs, focus ONLY on those programs
4. Do NOT recommend unrelated programs just because they match the profile
5. If no results match the specific request, say so clearly and suggest alternatives
6. Focus on programs with highest relevance scores
7. Mention specific program names, campuses, and degrees (keep these in English)
8. For DOE programs, explain course sequences if relevant
9. Keep response concise (2-3 paragraphs max, or structured lists)

CAREER DATA RULES (MOST IMPORTANT):
- ONLY mention salary/job numbers that are EXPLICITLY listed in "AVAILABLE CAREER MARKET DATA" above
- Use EXACT figures - never calculate, average, estimate, or approximate
- If discussing a program with no matching career data, DO NOT mention salaries or job markets at all
- Never say things like "typically earn" or "average salary" unless you're quoting an exact figure from the data
- When in doubt, omit career data rather than risk inaccuracy

CORRECT EXAMPLES:
✓ "For example, careers in Plant Science show a median salary of $67,328 with 39 job postings"
✓ "Biology-related positions have a median salary of $67,072 and 20 current job openings"

INCORRECT EXAMPLES (NEVER DO THIS):
✗ "Graduates typically earn between $65,000-$91,000" (combining/ranging)
✗ "The average salary is around $67,000" (approximating)
✗ "Most positions pay well" (vague, no data)
✗ Mentioning any salary for a program with no matching career data

Generate a helpful, well-formatted Markdown response. Only include career insights if exact matching data exists.`;

  try {
    const response = await groq.chat.completions.create({
      model: "groq/compound",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Generate a Markdown-formatted response addressing the user's specific request in the appropriate language. Use ONLY bold text and bullet points for formatting. Include career data ONLY if exact matching figures exist - never estimate or approximate.",
        },
      ],
      temperature: 0.2,
    });

    return response.choices[0].message.content || getDefaultResponse(language);
  } catch (error) {
    console.error("Response generation error:", error);
    return getDefaultResponse(language);
  }
}

// Default responses with Markdown in different languages
function getDefaultResponse(language: string): string {
  const responses: Record<string, string> = {
    en: "I found **several programs** matching your request. Please check the **data panel** for details.",
    haw: "Ua loaʻa iaʻu **nā papahana** e kūlike ana me kāu noi. E ʻoluʻolu e nānā i ka **papa ʻikepili** no nā kikoʻī.",
    hwp: "I wen find **plenny programs** dat match wat you asking for. Check da **data panel** fo see all da details yeah.",
    tl: "Nakahanap ako ng **ilang programa** na tumutugma sa iyong kahilingan. Pakitingnan ang **data panel** para sa mga detalye.",
  };
  return responses[language] || responses.en;
}

// Generate contextual follow-up questions with language support
function generateSmartQuestions(
  queryPlan: MCPQueryPlan,
  mcpData: any,
  extractedProfile: any,
  language: string = "en"
): string[] {
  const questions: string[] = [];
  const searchTerms = queryPlan.extractedContext?.searchTerms || [];

  // Language-specific question templates
  const questionTemplates: Record<string, any> = {
    en: {
      admissionReqs: (term: string) =>
        `What are the admission requirements for ${term} programs?`,
      campusPrograms: (term: string) =>
        `Show me ${term} programs at different UH campuses`,
      careerOptions: (term: string) =>
        `What careers can I get with a ${term} degree?`,
      onlinePrograms: (term: string) =>
        `Are there online ${term} programs available?`,
      admissionInfo: "Tell me more about admission requirements",
      convenientCampus: "Which campus would be most convenient for me?",
      nextYearCourses: "What courses should I take next year?",
      collegePrep: "Which program best prepares me for college?",
      whichIsland: "Which island are you on?",
      interests: "What subjects interest you most?",
      defaults: [
        "Show me computer science programs",
        "What nursing programs are available?",
        "Find business programs at UH",
        "Show me all programs on Oahu",
      ],
    },
    haw: {
      admissionReqs: (term: string) =>
        `He aha nā koi komo no nā papahana ${term}?`,
      campusPrograms: (term: string) =>
        `E hōʻike mai i nā papahana ${term} ma nā kahua UH`,
      careerOptions: (term: string) =>
        `He aha nā ʻoihana hiki me ka kēkelē ${term}?`,
      onlinePrograms: (term: string) =>
        `Aia nā papahana ${term} ma ka pūnaewele?`,
      admissionInfo: "E haʻi hou mai e pili ana i nā koi komo",
      convenientCampus: "ʻO ka hea kahua kūpono iaʻu?",
      nextYearCourses: "He aha nā papa aʻo e lawe ai i ka makahiki aʻe?",
      collegePrep: "ʻO ka hea papahana e hoʻomākaukau maikaʻi no ke kulanui?",
      whichIsland: "Aia ʻoe ma ka hea mokupuni?",
      interests: "He aha nā kumuhana e hoihoi ana iā ʻoe?",
      defaults: [
        "E hōʻike mai i nā papahana kamepiula",
        "He aha nā papahana kahu maʻi?",
        "E ʻimi i nā papahana ʻoihana ma UH",
        "E hōʻike mai i nā papahana ma Oʻahu",
      ],
    },
    hwp: {
      admissionReqs: (term: string) =>
        `Wat da requirements fo get inside ${term} programs?`,
      campusPrograms: (term: string) =>
        `Show me ${term} programs at different UH campuses`,
      careerOptions: (term: string) =>
        `Wat kine jobs I can get wit one ${term} degree?`,
      onlinePrograms: (term: string) => `Get ${term} programs online o wat?`,
      admissionInfo: "Tell me more bout how fo get in",
      convenientCampus: "Which campus stay most convenient fo me?",
      nextYearCourses: "Wat classes I should take next year?",
      collegePrep: "Which program going prepare me best fo college?",
      whichIsland: "Wat island you stay on?",
      interests: "Wat subjects you stay interested in?",
      defaults: [
        "Show me computer science programs",
        "Wat nursing programs get?",
        "Find business programs at UH",
        "Show me all da programs on Oahu",
      ],
    },
    tl: {
      admissionReqs: (term: string) =>
        `Ano ang mga requirements para sa ${term} programs?`,
      campusPrograms: (term: string) =>
        `Ipakita ang ${term} programs sa iba't ibang UH campus`,
      careerOptions: (term: string) =>
        `Anong mga karera ang makukuha ko sa ${term} degree?`,
      onlinePrograms: (term: string) => `May online na ${term} programs ba?`,
      admissionInfo: "Sabihin pa tungkol sa admission requirements",
      convenientCampus: "Aling campus ang pinaka-convenient para sa akin?",
      nextYearCourses: "Anong mga kurso ang dapat kong kunin next year?",
      collegePrep: "Aling programa ang maghahanda sa akin para sa kolehiyo?",
      whichIsland: "Saang isla ka nakatira?",
      interests: "Anong mga subject ang interesado ka?",
      defaults: [
        "Ipakita ang computer science programs",
        "Anong nursing programs ang available?",
        "Hanapin ang business programs sa UH",
        "Ipakita lahat ng programa sa Oahu",
      ],
    },
  };

  const templates = questionTemplates[language] || questionTemplates.en;

  if (searchTerms.length > 0 && queryPlan.extractedContext?.ignoreProfile) {
    const term = searchTerms[0];
    questions.push(
      templates.admissionReqs(term),
      templates.campusPrograms(term),
      templates.careerOptions(term),
      templates.onlinePrograms(term)
    );
  } else {
    if (mcpData.uhPrograms?.length > 0) {
      questions.push(templates.admissionInfo, templates.convenientCampus);
    }

    if (mcpData.doePrograms?.length > 0) {
      questions.push(templates.nextYearCourses, templates.collegePrep);
    }

    if (!extractedProfile?.location) {
      questions.push(templates.whichIsland);
    }

    if (!extractedProfile?.interests?.length) {
      questions.push(templates.interests);
    }
  }

  if (questions.length < 4) {
    questions.push(...templates.defaults);
  }

  return questions.slice(0, 4);
}

// Main route handler with caching and language support
export async function POST(req: NextRequest) {
  let language = "en"; // Default language
  try {
    console.log("AI Pathways POST endpoint hit");

    const body = await req.json();
    const {
      message,
      userProfile,
      extractedProfile,
      language: requestLanguage = "en",
    } = body;
    language = requestLanguage; // Store language in outer scope

    console.log("Request data:", {
      message: message,
      hasUserProfile: !!userProfile,
      hasExtractedProfile: !!extractedProfile,
      language: language,
    });

    if (!message?.trim() || !userProfile) {
      return NextResponse.json(
        { error: "Message and userProfile are required" },
        { status: 400 }
      );
    }

    // Generate cache key for the full response (include language)
    const responseCacheKey = cache.generateCacheKey(
      "/api/ai-pathways",
      {
        message: message.toLowerCase().trim(),
        language: language,
      },
      userProfile
    );

    // Check cache first
    const cachedResponse = await cache.get(responseCacheKey);
    if (cachedResponse) {
      console.log("Serving from cache:", responseCacheKey);

      const response = NextResponse.json(cachedResponse);
      response.headers.set("X-Cache", "HIT");
      // response.headers.set("X-Cache-Key", responseCacheKey);
      return response;
    }

    // Check for similar cached queries (RAG-like functionality)
    const similarCached = await cache.findSimilar(message, 0.7);
    if (
      similarCached &&
      similarCached.metadata?.userProfile === userProfile &&
      similarCached.metadata?.language === language
    ) {
      console.log("Serving similar cached response");

      const response = NextResponse.json(similarCached);
      response.headers.set("X-Cache", "SIMILAR");
      return response;
    }

    // Step 1: Plan MCP queries with query analysis
    console.log("Planning MCP queries with query analysis...");
    const queryPlan = await planMCPQueries(
      userProfile,
      message,
      extractedProfile,
      language
    );
    console.log("Query plan with analysis:", queryPlan);

    // Step 2: Execute MCP queries with individual query caching
    const mcpData: CurrentData = {
      uhPrograms: undefined,
      doePrograms: undefined,
      pathways: undefined,
      searchResults: undefined,
      stats: undefined,
    };
    const queriesExecuted: string[] = [];
    let totalResults = 0;

    console.log("Executing MCP queries...");
    for (const query of queryPlan.queries) {
      try {
        // Check if this specific MCP query is cached
        const queryKey = cache.generateCacheKey(
          `mcp:${query.tool}`,
          query.params
        );

        let result = await cache.get(queryKey);

        if (!result) {
          // Not cached, execute query
          console.log(`Executing ${query.tool} with params:`, query.params);
          const mcpResult = await handleMCPRequest({
            tool: query.tool,
            params: query.params,
          });

          if (mcpResult.success && mcpResult.data) {
            result = mcpResult;

            // Cache individual MCP query results
            const ttl = query.priority === "primary" ? 3600 : 7200; // 1-2 hours
            await cache.set(
              queryKey,
              result,
              {
                ttl,
                tags: [query.tool, "mcp_query"],
              },
              {
                tool: query.tool,
                params: query.params,
              }
            );
          } else {
            console.error(
              `MCP query failed for ${query.tool}:`,
              mcpResult.error
            );
            continue;
          }
        } else {
          console.log(`Using cached result for ${query.tool}`);
        }

        // Process result data
        if (result && result.data) {
          switch (query.tool) {
            case "getUHPrograms":
              mcpData.uhPrograms = result.data;
              totalResults += result.data.length;
              break;
            case "getDOEPrograms":
              mcpData.doePrograms = result.data;
              totalResults += result.data.length;
              break;
            case "getEducationPathways":
              mcpData.pathways = result.data;
              totalResults += result.data.length;
              break;
            case "searchPrograms":
              mcpData.searchResults = result.data;
              totalResults +=
                (result.data.uhPrograms?.length || 0) +
                (result.data.doePrograms?.length || 0);
              break;
            case "getDatabaseStats":
              mcpData.stats = result.data;
              break;
            case "getLightcastCareerData":
              mcpData.careerData = result.data;
              totalResults += result.data.length;
              break;
          }
          queriesExecuted.push(query.tool);
        }
      } catch (error) {
        console.error(`MCP query failed for ${query.tool}:`, error);
      }
    }

    console.log("MCP queries completed. Total results:", totalResults);

    // Step 3: Generate response with language and Markdown support
    console.log("Generating response in language:", language);
    const responseMessage = await generateDataDrivenResponse(
      userProfile,
      message,
      mcpData,
      queryPlan,
      language
    );

    // Step 4: Generate follow-up questions in appropriate language
    const suggestedQuestions = generateSmartQuestions(
      queryPlan,
      mcpData,
      extractedProfile,
      language
    );

    // Step 5: Build structured response
    const response: AIPathwaysResponse = {
      message: responseMessage,
      data: mcpData,
      metadata: {
        intent: queryPlan.intent as AIPathwaysResponse["metadata"]["intent"],
        dataSource: "hawaii_education_db",
        queriesExecuted,
        totalResults,
        relevanceScoring: true,
        queryAnalysis: {
          improvedQuery: queryPlan.extractedContext?.improvedQuery,
          searchTerms: queryPlan.extractedContext?.searchTerms,
          ignoreProfile: queryPlan.extractedContext?.ignoreProfile,
        },
      },
      suggestedQuestions,
      userProfile,
    };

    // Cache the complete response with language metadata
    const cacheTTL = totalResults > 0 ? 3600 : 300; // 1 hour if results, 5 min otherwise
    await cache.set(
      responseCacheKey,
      response,
      {
        ttl: cacheTTL,
        tags: ["ai_pathways", "response", `lang_${language}`],
      },
      {
        userProfile,
        queryIntent: queryPlan.intent,
        resultCount: totalResults,
        language: language,
      }
    );

    console.log("Sending response with:", {
      dataKeys: Object.keys(mcpData),
      totalResults,
      intent: queryPlan.intent,
      ignoreProfile: queryPlan.extractedContext?.ignoreProfile,
      language: language,
    });

    const httpResponse = NextResponse.json(response);
    httpResponse.headers.set("X-Cache", "MISS");
    // httpResponse.headers.set("X-Cache-Key", responseCacheKey);
    httpResponse.headers.set("X-Language", language);

    return httpResponse;
  } catch (error) {
    console.error("AI Pathways POST error:", error);

    const errorResponse: AIPathwaysResponse = {
      message: getErrorMessage(language),
      data: {},
      metadata: {
        intent: "error",
        dataSource: "hawaii_education_db",
        queriesExecuted: [],
        totalResults: 0,
        relevanceScoring: false,
      },
      suggestedQuestions: getErrorSuggestions(language),
      userProfile: "",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Error messages in different languages
function getErrorMessage(language: string): string {
  const messages: Record<string, string> = {
    en: "I'm having trouble accessing the education database. Please try again.",
    haw: "E kala mai, ua loaʻa kekahi pilikia i ka hoʻokele ʻana i ka ʻikepili. E ʻoluʻolu e hoʻāʻo hou.",
    hwp: "Ho brah, get one problem wit da database right now. Try ask again yeah?",
    tl: "Pasensya na, nagkaproblema sa pag-access ng database. Pakisubukan ulit.",
  };
  return messages[language] || messages.en;
}

// Error recovery suggestions in different languages
function getErrorSuggestions(language: string): string[] {
  const suggestions: Record<string, string[]> = {
    en: [
      "Show me computer science programs",
      "Find nursing programs at UH",
      "What business degrees are available?",
      "Show me programs on Oahu",
    ],
    haw: [
      "E hōʻike mai i nā papahana kamepiula",
      "E ʻimi i nā papahana kahu maʻi ma UH",
      "He aha nā kēkelē ʻoihana?",
      "E hōʻike mai i nā papahana ma Oʻahu",
    ],
    hwp: [
      "Show me computer science programs",
      "Find nursing programs at UH",
      "Wat business degrees get?",
      "Show me all programs on Oahu",
    ],
    tl: [
      "Ipakita ang computer science programs",
      "Hanapin ang nursing programs sa UH",
      "Anong business degrees ang available?",
      "Ipakita lahat ng programa sa Oahu",
    ],
  };
  return suggestions[language] || suggestions.en;
}

// Health check endpoint
export async function GET() {
  try {
    console.log("AI Pathways GET endpoint hit");

    // Get cache statistics
    const cacheStats = await cache.getStats();

    const statsResponse = await handleMCPRequest({
      tool: "getDatabaseStats",
      params: {},
    });

    console.log("Database stats:", statsResponse);

    return NextResponse.json({
      status: "healthy",
      message:
        "Hawaii Education Pathways API - Query-aware intelligent matching with multi-language and Markdown support",
      database: statsResponse.success ? statsResponse.data : null,
      cache: cacheStats,
      features: {
        queryAnalysis: true,
        intelligentQueries: true,
        relevanceScoring: true,
        pathwayMapping: true,
        multiCampusSupport: true,
        gradeAlignment: true,
        searchTermExpansion: true,
        responseCache: true,
        queryCaching: true,
        semanticCache: true,
        multiLanguage: ["en", "haw", "hwp", "tl"],
        markdownFormatting: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Pathways GET error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "API running but database unavailable",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
