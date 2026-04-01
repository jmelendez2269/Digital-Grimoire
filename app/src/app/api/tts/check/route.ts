import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkTTSCap } from '@/lib/tts/usage-tracker';

/**
 * GET /api/tts/check
 * Returns whether the authenticated user may use premium TTS this month.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await checkTTSCap(user.id);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('[GET /api/tts/check]', err);
    return NextResponse.json({ error: 'Failed to check TTS cap' }, { status: 500 });
  }
}
