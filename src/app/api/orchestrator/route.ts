/**
 * Orchestrator API Route
 *
 * Main entry point for the orchestrator-agent system.
 * Handles all education pathway queries using the CIP-based architecture.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator, OrchestratorRequest } from '@/app/lib/orchestrator';
import { generateDataDrivenResponse, generateSmartQuestions } from '@/app/utils/groqClient';

let initialized = false;

/**
 * Ensure orchestrator is initialized
 */
async function ensureInitialized() {
  if (!initialized) {
    console.log('Initializing orchestrator on first request...');
    const orchestrator = getOrchestrator();
    await orchestrator.initialize();
    initialized = true;
    console.log('Orchestrator initialized successfully');
  }
}

/**
 * POST handler for orchestrator requests
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await req.json();
    const { message, userProfile, extractedProfile, focusArea, language } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid message parameter'
        },
        { status: 400 }
      );
    }

    // Ensure orchestrator is initialized
    await ensureInitialized();

    // Get orchestrator instance
    const orchestrator = getOrchestrator();

    // Build request
    const orchestratorRequest: OrchestratorRequest = {
      message,
      userProfile,
      extractedProfile,
      focusArea: focusArea || detectFocusArea(message),
      language: language || 'en'
    };

    console.log('Processing orchestrator request:', {
      message: message.substring(0, 100),
      focusArea: orchestratorRequest.focusArea,
      language: orchestratorRequest.language,
      hasProfile: !!extractedProfile
    });

    // Route through orchestrator
    const orchestratorResponse = await orchestrator.route(orchestratorRequest);

    console.log('Orchestrator response:', {
      highSchoolCount: orchestratorResponse.relatedHighSchool.length,
      collegeCount: orchestratorResponse.collegeOptions.length,
      careerCount: orchestratorResponse.careerPaths.length,
      cipCodesUsed: orchestratorResponse.cipCodesUsed.length,
      processingTime: orchestratorResponse.metadata.processingTimeMs
    });

    // Generate AI response using Groq
    const aiMessage = await generateResponseMessage(
      message,
      orchestratorResponse,
      language || 'en',
      userProfile
    );

    // Generate suggested questions (use orchestrator's suggestions or generate new ones)
    const suggestedQuestions = orchestratorResponse.suggestedQuestions.length > 0
      ? orchestratorResponse.suggestedQuestions
      : await generateSmartQuestions(
          message,
          orchestratorResponse,
          extractedProfile,
          language || 'en'
        );

    const totalTime = Date.now() - startTime;

    // Build response
    const response = {
      success: true,
      message: aiMessage,
      data: {
        relatedHighSchool: orchestratorResponse.relatedHighSchool,
        collegeOptions: orchestratorResponse.collegeOptions,
        careerPaths: orchestratorResponse.careerPaths
      },
      metadata: {
        intent: orchestratorResponse.metadata.intent,
        focusArea: orchestratorResponse.metadata.focusArea,
        dataSource: 'orchestrator-agent',
        agentsInvoked: orchestratorResponse.metadata.agentsInvoked,
        cipCodesUsed: orchestratorResponse.cipCodesUsed,
        cip2DigitUsed: orchestratorResponse.cip2DigitUsed,
        totalResults: orchestratorResponse.metadata.totalResults,
        processingTimeMs: totalTime,
        orchestratorTimeMs: orchestratorResponse.metadata.processingTimeMs,
        cipContext: orchestratorResponse.metadata.cipContext
      },
      suggestedQuestions,
      userProfile
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Orchestrator API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        message: 'I encountered an error while processing your request. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate AI response message using Groq
 */
async function generateResponseMessage(
  userMessage: string,
  orchestratorResponse: any,
  language: string,
  userProfile?: string
): Promise<string> {
  try {
    // Use existing Groq response generation
    const response = await generateDataDrivenResponse(
      userMessage,
      {
        relatedHighSchool: orchestratorResponse.relatedHighSchool,
        collegeOptions: orchestratorResponse.collegeOptions,
        careerPaths: orchestratorResponse.careerPaths,
        stats: {
          totalHighSchool: orchestratorResponse.relatedHighSchool.length,
          totalCollege: orchestratorResponse.collegeOptions.length,
          totalCareers: orchestratorResponse.careerPaths.length,
          cipCategoriesUsed: orchestratorResponse.cip2DigitUsed.length
        }
      },
      userProfile,
      language
    );

    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);

    // Fallback response
    const totalResults =
      orchestratorResponse.relatedHighSchool.length +
      orchestratorResponse.collegeOptions.length +
      orchestratorResponse.careerPaths.length;

    return `I found ${totalResults} pathways related to your interest. Check the data panel for details about high school programs, college options, and career paths.`;
  }
}

/**
 * Detect focus area from message
 */
function detectFocusArea(message: string): 'highschool' | 'college' | 'workforce' | 'general' {
  const lower = message.toLowerCase();

  // High school indicators
  if (
    lower.includes('high school') ||
    lower.includes('grade') ||
    lower.includes('freshman') ||
    lower.includes('sophomore') ||
    lower.includes('junior') ||
    lower.includes('senior') ||
    lower.includes('doe')
  ) {
    return 'highschool';
  }

  // College indicators
  if (
    lower.includes('college') ||
    lower.includes('university') ||
    lower.includes('uh') ||
    lower.includes('bachelor') ||
    lower.includes('associate') ||
    lower.includes('degree') ||
    lower.includes('campus') ||
    lower.includes('manoa') ||
    lower.includes('hilo')
  ) {
    return 'college';
  }

  // Workforce indicators
  if (
    lower.includes('career') ||
    lower.includes('job') ||
    lower.includes('work') ||
    lower.includes('salary') ||
    lower.includes('employment') ||
    lower.includes('occupation')
  ) {
    return 'workforce';
  }

  return 'general';
}

/**
 * GET handler for health check
 */
export async function GET() {
  try {
    const orchestrator = getOrchestrator();
    const stats = orchestrator.getStats();

    return NextResponse.json({
      status: 'healthy',
      initialized,
      stats
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        initialized,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
