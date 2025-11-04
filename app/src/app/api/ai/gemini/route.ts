import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiUsage } from '@/lib/usage-tracker';

/**
 * POST /api/ai/gemini
 * Chat endpoint for Gemini (Google)
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

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content;

    // TODO: Implement actual Gemini API integration
    // For now, return a placeholder response
    const response = `This is a placeholder response from Gemini. Your message: "${userMessage}"\n\nGemini API integration coming soon!`;

    // Log API usage
    await logApiUsage({
      service: 'other',
      operation: 'gemini_chat',
      unitsUsed: 1,
      unitType: 'requests',
      userId: user.id,
      requestMetadata: {
        model: 'gemini',
        messageCount: messages.length,
      },
      success: true,
    });

    return NextResponse.json({
      response,
      model: 'gemini',
    });
  } catch (error) {
    console.error('Error in Gemini chat endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

