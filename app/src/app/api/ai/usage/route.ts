import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/ai/usage
 * Get usage statistics for AI chat models (Claude, GPT, Gemini)
 * Returns count of API calls per model for current month
 */
export async function GET() {
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

    // Get current month start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Query api_usage table for current month
    // We track chat usage with service='other' and operation='{model}_chat'
    const { data: usageData, error } = await supabase
      .from('api_usage')
      .select('service, operation, request_metadata')
      .gte('created_at', monthStart.toISOString())
      .eq('service', 'other');

    if (error) {
      console.error('Error fetching AI usage:', error);
      // Return default zero counts on error
      return NextResponse.json({
        claude: 0,
        gpt: 0,
        gemini: 0,
      });
    }

    // Count usage by model based on operation field
    let claudeCount = 0;
    let gptCount = 0;
    let geminiCount = 0;

    usageData?.forEach((record) => {
      const operation = record.operation?.toLowerCase() || '';
      const metadata = record.request_metadata as Record<string, any> || {};
      
      // Check operation name first (most reliable)
      if (operation === 'claude_chat' || operation.includes('claude')) {
        claudeCount++;
      } else if (operation === 'gpt_chat' || operation.includes('gpt') || operation.includes('openai')) {
        gptCount++;
      } else if (operation === 'gemini_chat' || operation.includes('gemini') || operation.includes('google')) {
        geminiCount++;
      } else if (metadata.model) {
        // Fallback to metadata if operation doesn't match
        const model = metadata.model.toLowerCase();
        if (model.includes('claude') || model.includes('anthropic')) {
          claudeCount++;
        } else if (model.includes('gpt') || model.includes('openai')) {
          gptCount++;
        } else if (model.includes('gemini') || model.includes('google')) {
          geminiCount++;
        }
      }
    });

    return NextResponse.json({
      claude: claudeCount,
      gpt: gptCount,
      gemini: geminiCount,
    });
  } catch (error) {
    console.error('Error in AI usage endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

