import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordTTSUsage, checkTTSCap } from '@/lib/tts/usage-tracker';

/**
 * POST /api/tts/track
 * Called by the client after a successful TTS synthesis to record usage.
 * Body: { charsUsed: number, audioSeconds: number, engine?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { charsUsed, audioSeconds, engine = 'azure' } = body ?? {};

    if (typeof charsUsed !== 'number' || charsUsed < 0) {
      return NextResponse.json({ error: 'Invalid charsUsed' }, { status: 400 });
    }
    if (typeof audioSeconds !== 'number' || audioSeconds < 0) {
      return NextResponse.json({ error: 'Invalid audioSeconds' }, { status: 400 });
    }

    await recordTTSUsage(user.id, charsUsed, audioSeconds, engine);
    const cap = await checkTTSCap(user.id);
    return NextResponse.json({ success: true, cap });
  } catch (err: any) {
    console.error('[POST /api/tts/track]', err);
    return NextResponse.json({ error: 'Failed to record TTS usage' }, { status: 500 });
  }
}
