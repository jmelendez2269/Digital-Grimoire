import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const TRIAL_DAYS = 7;

export interface TrialStatus {
  isInTrial: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialExpired: boolean;
  daysRemaining: number;
}

/**
 * Get the trial status for a user.
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const svc = createServiceClient();
  const { data } = await svc
    .from('users')
    .select('trial_started_at, subscription_status')
    .eq('id', userId)
    .single();

  if (!data?.trial_started_at) {
    return { isInTrial: false, trialStartedAt: null, trialEndsAt: null, trialExpired: false, daysRemaining: 0 };
  }

  // Trial only applies to free users (paid users don't need it)
  const isPaid = data.subscription_status && data.subscription_status !== 'free';
  if (isPaid) {
    return { isInTrial: false, trialStartedAt: null, trialEndsAt: null, trialExpired: false, daysRemaining: 0 };
  }

  const trialStartedAt = new Date(data.trial_started_at);
  const trialEndsAt = new Date(trialStartedAt.getTime() + TRIAL_DAYS * 24 * 3600 * 1000);
  const now = new Date();
  const isInTrial = now < trialEndsAt;
  const trialExpired = !isInTrial;
  const daysRemaining = isInTrial
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 3600 * 1000))
    : 0;

  return { isInTrial, trialStartedAt, trialEndsAt, trialExpired, daysRemaining };
}

/**
 * Start the trial for a free user if they haven't started one yet.
 * Should be called on first lens click. Returns true if the trial was just started.
 */
export async function maybeStartTrial(userId: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data } = await svc
    .from('users')
    .select('trial_started_at, subscription_status')
    .eq('id', userId)
    .single();

  if (!data) return false;

  // Don't start a trial if already paid or already has one
  const isPaid = data.subscription_status && data.subscription_status !== 'free';
  if (isPaid || data.trial_started_at) return false;

  const { error } = await svc
    .from('users')
    .update({ trial_started_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[trial] Failed to start trial:', error.message);
    return false;
  }

  return true;
}
