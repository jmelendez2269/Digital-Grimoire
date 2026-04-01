import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkTTSCap, recordTTSUsage } from '@/lib/tts/usage-tracker';

const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const AZURE_KEY = process.env.AZURE_SPEECH_KEY;

/** 128kbps mono MP3 = 16 000 bytes/second */
const MP3_BYTES_PER_SECOND = 16_000;
const MAX_CHARS = 10_000;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSSML(text: string, voice: string, rate: number, pitch: number, volume: number): string {
  const rateStr = (() => {
    const pct = Math.round((rate - 1) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  })();
  const pitchStr = (() => {
    const rel = (pitch - 1) * 50;
    return rel >= 0 ? `+${rel}%` : `${rel}%`;
  })();
  const volumePct = Math.round(volume * 100);

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${voice}"><prosody rate="${rateStr}" pitch="${pitchStr}" volume="${volumePct}">${escapeXml(text)}</prosody></voice></speak>`;
}

/**
 * POST /api/tts/synthesize
 * Server-side Azure TTS proxy. Checks quota before synthesis, derives usage
 * from server-observed text length — never trusts client-reported values.
 *
 * Body: { text, voice?, rate?, pitch?, volume? }
 * Returns: audio/mpeg binary
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!AZURE_REGION || !AZURE_KEY) {
      return NextResponse.json({ error: 'Azure TTS not configured on this server' }, { status: 503 });
    }

    const body = await req.json();
    const {
      text,
      voice = 'en-US-AriaNeural',
      rate = 1.0,
      pitch = 1.0,
      volume = 1.0,
    } = body ?? {};

    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `text exceeds maximum length of ${MAX_CHARS} characters` },
        { status: 400 },
      );
    }

    // Enforce quota BEFORE calling Azure
    const cap = await checkTTSCap(user.id);
    if (!cap.allowed) {
      return NextResponse.json({ error: 'Monthly TTS quota exceeded', cap }, { status: 429 });
    }

    // Rough pre-flight: ~12.5 chars/second (150 wpm × 5 chars/word ÷ 60)
    const estimatedSeconds = text.length / 12.5;
    if (estimatedSeconds > cap.remainingSeconds + 30) {
      // +30s grace to avoid rejecting requests that are slightly over estimate
      return NextResponse.json(
        { error: 'Insufficient remaining TTS quota for this request', cap },
        { status: 429 },
      );
    }

    const ssml = buildSSML(text, voice, rate, pitch, volume);

    const azureRes = await fetch(
      `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'digital-grimoire',
        },
        body: ssml,
      },
    );

    if (!azureRes.ok) {
      const detail = await azureRes.text().catch(() => '');
      console.error(`[tts/synthesize] Azure error ${azureRes.status}: ${detail}`);
      return NextResponse.json({ error: 'Speech synthesis failed' }, { status: 502 });
    }

    const audioBuffer = await azureRes.arrayBuffer();

    // Derive usage from server-observed values — never from client input
    const audioSeconds = audioBuffer.byteLength / MP3_BYTES_PER_SECOND;
    await recordTTSUsage(user.id, text.length, audioSeconds, 'azure');

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[POST /api/tts/synthesize]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
