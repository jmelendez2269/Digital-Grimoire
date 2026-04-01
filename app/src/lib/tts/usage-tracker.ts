import { createServiceClient } from '@/lib/supabase/service';
import { getSubscriptionTier, SubscriptionTier } from '@/lib/parallax/rate-limit';

// TTS audio-time caps per tier (seconds per calendar month)
// free/student: no premium TTS allowed  scholar: 2 hours  adept: 6 hours
const TTS_CAP_SECONDS: Record<SubscriptionTier, number> = {
  free: 0,
  student: 0,
  scholar: 2 * 3600,  // 7200s
  adept: 6 * 3600,    // 21600s
};

export interface TTSCapStatus {
  allowed: boolean;
  tier: SubscriptionTier;
  capSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
}

export interface TTSUsageSummary {
  charsUsed: number;
  audioSeconds: number;
  periodStart: Date;
}

/**
 * Returns the start of the current calendar month in UTC.
 */
function currentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Record a TTS synthesis event for a user.
 */
export async function recordTTSUsage(
  userId: string,
  charsUsed: number,
  audioSeconds: number,
  engine: string = 'azure'
): Promise<void> {
  const svc = createServiceClient();
  const { error } = await svc.from('tts_usage').insert({
    user_id: userId,
    chars_used: charsUsed,
    audio_seconds: audioSeconds,
    engine,
  });
  if (error) {
    console.error('[tts-usage] Failed to record usage:', error.message);
  }
}

/**
 * Check whether a user is allowed to use premium TTS this month.
 */
export async function checkTTSCap(userId: string): Promise<TTSCapStatus> {
  const tier = await getSubscriptionTier(userId);
  const capSeconds = TTS_CAP_SECONDS[tier];
  const { audioSeconds: usedSeconds } = await getTTSUsage(userId);
  const remainingSeconds = Math.max(0, capSeconds - usedSeconds);
  return {
    allowed: capSeconds > 0 && remainingSeconds > 0,
    tier,
    capSeconds,
    usedSeconds,
    remainingSeconds,
  };
}

/**
 * Get total TTS usage for the current calendar month.
 */
export async function getTTSUsage(userId: string): Promise<TTSUsageSummary> {
  const svc = createServiceClient();
  const periodStart = currentPeriodStart();

  const { data, error } = await svc
    .from('tts_usage')
    .select('chars_used, audio_seconds')
    .eq('user_id', userId)
    .gte('created_at', periodStart.toISOString());

  if (error) {
    console.error('[tts-usage] Failed to fetch usage:', error.message);
    return { charsUsed: 0, audioSeconds: 0, periodStart };
  }

  const charsUsed = (data ?? []).reduce((sum, r) => sum + (r.chars_used ?? 0), 0);
  const audioSeconds = (data ?? []).reduce((sum, r) => sum + Number(r.audio_seconds ?? 0), 0);

  return { charsUsed, audioSeconds, periodStart };
}
