/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/market-intelligence/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MarketIntelligenceAgent } from '@/app/lib/agents/market-intelligence-agent';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/market-intelligence
 * Generate market intelligence report from SOC codes
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { socCodes, conversationContext, userProfile } = await request.json();

    // Validate input
    if (!socCodes || !Array.isArray(socCodes) || socCodes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'SOC codes are required and must be a non-empty array',
        },
        { status: 400 }
      );
    }

    console.log(`[Market Intelligence API] 📊 Processing request for ${socCodes.length} SOC codes:`, socCodes);
    if (conversationContext) {
      console.log(`[Market Intelligence API] 💬 Conversation context provided with ${conversationContext.length} messages`);
    }
    if (userProfile) {
      console.log(`[Market Intelligence API] 👤 User profile provided:`, userProfile);
    }

    // Create agent instance (runs server-side with access to GROQ_API_KEY)
    const agent = new MarketIntelligenceAgent();

    // Fetch market data from all SOC APIs
    console.log('[Market Intelligence API] 🔄 Fetching market data...');
    const marketData = await agent.fetchMarketData(socCodes);
    console.log('[Market Intelligence API] ✅ Market data fetched:', {
      jobTitlesSkills: !!marketData.jobTitlesSkills,
      jobTitlesCompanies: !!marketData.jobTitlesCompanies,
      companiesSkills: !!marketData.companiesSkills,
      activePosts: !!marketData.activePosts,
    });

    // Generate AI-powered report using Groq with context
    console.log('[Market Intelligence API] 🤖 Generating personalized report with AI...');
    const report = await agent.generateReport(marketData, socCodes, conversationContext, userProfile);
    console.log('[Market Intelligence API] ✅ Report generated, length:', report.markdown.length);

    console.log(`[Market Intelligence API] ✅ Complete - Processing time: ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      markdown: report.markdown,
      summary: report.summary,
      processingTime: Date.now() - startTime,
    });

  } catch (error: any) {
    console.error('[Market Intelligence API] ❌ Error:', error);
    console.error('[Market Intelligence API] ❌ Error stack:', error.stack);
    console.error('[Market Intelligence API] ❌ Error message:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate market intelligence report',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        processingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/market-intelligence
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Market Intelligence Report API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: {
        path: '/api/market-intelligence',
        description: 'Generate market intelligence report from SOC codes',
        requestBody: {
          socCodes: {
            type: 'array',
            required: true,
            description: 'Array of SOC codes to analyze',
            example: ['15-1252', '15-1256'],
          },
        },
        response: {
          success: 'boolean',
          markdown: 'string - AI-generated market report with interactive components',
          summary: {
            totalCompanies: 'number',
            totalSkills: 'number',
            topCompanies: 'array of strings',
            topSkills: 'array of strings',
            activePosts: 'number',
          },
          processingTime: 'number in milliseconds',
        },
      },
    },
  });
}
