import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiUsage } from '@/lib/usage-tracker';
import { aiOrchestrator } from '@/lib/ai/ai-orchestrator';

/**
 * POST /api/ai/claude
 * Chat endpoint for Claude AI
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const aiResponse = await aiOrchestrator.chatComplete(messages, {
      model: 'claude-3-5-sonnet-latest',
    });

    // Log API usage
    await logApiUsage({
      service: 'other',
      operation: 'claude_chat',
      unitsUsed: aiResponse.usage.totalTokens,
      unitType: 'tokens',
      userId: user.id,
      requestMetadata: {
        model: aiResponse.model,
        provider: aiResponse.provider,
        messageCount: messages.length,
      },
      success: true,
    });

    return NextResponse.json({
      response: aiResponse.content,
      model: aiResponse.model,
    });
  } catch (error) {
    console.error('Error in Claude chat endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

