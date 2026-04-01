import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTTSUsage } from '@/lib/tts/usage-tracker';

/**
 * GET /api/tts/usage
 * Returns the authenticated user's TTS usage for the current calendar month.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await getTTSUsage(user.id);
    return NextResponse.json({
      charsUsed: usage.charsUsed,
      audioSeconds: usage.audioSeconds,
      periodStart: usage.periodStart.toISOString(),
    });
  } catch (err: any) {
    console.error('[GET /api/tts/usage]', err);
    return NextResponse.json({ error: 'Failed to fetch TTS usage' }, { status: 500 });
  }
}
