import { createClient } from '@/lib/supabase/server';
import { LensWeights } from './lens-orchestrator';
import { getTrialStatus } from './trial';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: Date;
}

const FREE_TIER_LIMIT = 5;
const STUDENT_TIER_LIMIT = 5; // Same as free for now (unlimited journals is the value)
const SCHOLAR_TIER_LIMIT = 25; // Start conservative, may increase to 50
const ADEPT_TIER_LIMIT = 50; // Start conservative, may increase to 100

export type SubscriptionTier = 'free' | 'student' | 'scholar' | 'adept';

/**
 * Get subscription tier for user
 */
export async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('subscription_status, role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return 'free';
  }

  // Admins get adept tier for testing
  if (data.role === 'admin') {
    return 'adept';
  }

  // Map subscription_status to tier
  const status = data.subscription_status;
  if (status === 'student') return 'student';
  if (status === 'scholar') return 'scholar';
  if (status === 'adept') return 'adept';
  if (status === 'premium' || status === 'active') {
    // Legacy: treat 'premium'/'active' as 'scholar' for now
    // Can be migrated later
    return 'scholar';
  }

  return 'free';
}

/**
 * Get query limit for a subscription tier
 */
export function getTierLimit(tier: SubscriptionTier): number {
  switch (tier) {
    case 'free':
      return FREE_TIER_LIMIT;
    case 'student':
      return STUDENT_TIER_LIMIT;
    case 'scholar':
      return SCHOLAR_TIER_LIMIT;
    case 'adept':
      return ADEPT_TIER_LIMIT;
    default:
      return FREE_TIER_LIMIT;
  }
}

/**
 * Check if user has exceeded rate limit for Parallax Engine queries
 * Free tier: 5 queries per month (calendar month)
 * Student tier: 5 queries per billing period (unlimited journals is the value)
 * Scholar tier: 25-50 queries per billing period (beta - may adjust)
 * Adept tier: 50-100 queries per billing period (beta - may adjust)
 * 
 * @param userId - User ID to check
 * @returns Rate limit status
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = await createClient();

  // Trial users get scholar-level access
  const trial = await getTrialStatus(userId);
  if (trial.isInTrial) {
    const trialLimit = SCHOLAR_TIER_LIMIT;
    const periodStart = trial.trialStartedAt!;
    const periodEnd = trial.trialEndsAt!;
    const { data: queries } = await supabase
      .from('convergence_queries')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString());
    const queryCount = queries?.length || 0;
    const remaining = Math.max(0, trialLimit - queryCount);
    return { allowed: queryCount < trialLimit, remaining, limit: trialLimit, resetDate: periodEnd };
  }

  // Get user's subscription tier
  const tier = await getSubscriptionTier(userId);
  const limit = getTierLimit(tier);
  const isPaid = tier !== 'free';

  // Get period start date (subscription period for paid tiers, calendar month for free)
  const periodStart = await getPeriodStart(userId, isPaid);
  const periodEnd = await getPeriodEnd(userId, isPaid);

  // Get queries in current period
  const { data: queries, error } = await supabase
    // NOTE: 'convergence_queries' is the legacy table name. Do not change unless database migration is performed.
    .from('convergence_queries')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString());

  if (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the query (fail open)
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetDate: periodEnd,
    };
  }

  const queryCount = queries?.length || 0;
  const remaining = Math.max(0, limit - queryCount);
  const allowed = queryCount < limit;

  return {
    allowed,
    remaining,
    limit,
    resetDate: periodEnd,
  };
}

/**
 * Record a query for rate limiting
 * @param userId - User ID
 * @param queryText - The query text
 * @param lensWeights - Lens weights used
 */
export async function recordQuery(
  userId: string,
  queryText: string,
  lensWeights: LensWeights | Record<string, number>
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('convergence_queries')
    .insert({
      user_id: userId,
      query_text: queryText,
      lens_weights: lensWeights,
    });

  if (error) {
    console.error('Error recording query:', error);
    // Don't throw - rate limiting shouldn't break the query
  }
}

/**
 * Check if user has any paid subscription (legacy function for compatibility)
 * @deprecated Use getSubscriptionTier instead
 */
export async function checkPremiumStatus(userId: string): Promise<boolean> {
  const tier = await getSubscriptionTier(userId);
  return tier !== 'free';
}

/**
 * Get the start of the current billing period
 * For premium users: subscription_start_date (billing period)
 * For free users: start of current calendar month
 */
async function getPeriodStart(userId: string, isPremium: boolean): Promise<Date> {
  if (!isPremium) {
    // Free tier: use calendar month
    return getMonthStart();
  }

  const supabase = await createClient();
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_start_date, subscription_end_date')
    .eq('id', userId)
    .single();

  if (userData?.subscription_start_date) {
    const startDate = new Date(userData.subscription_start_date);
    const endDate = userData.subscription_end_date
      ? new Date(userData.subscription_end_date)
      : null;
    const now = new Date();

    // If we have both dates, calculate current period
    if (endDate && now >= startDate && now < endDate) {
      return startDate;
    }

    // If subscription has renewed, calculate new period
    // For monthly subscriptions, find the most recent period start
    if (endDate && now >= endDate) {
      // Subscription has renewed - use the end date as new start
      // This will be updated by webhook, but handle edge case
      return endDate;
    }

    return startDate;
  }

  // Fallback to calendar month if no subscription date
  return getMonthStart();
}

/**
 * Get the end of the current billing period
 * For premium users: subscription_end_date (billing period end)
 * For free users: start of next calendar month
 */
async function getPeriodEnd(userId: string, isPremium: boolean): Promise<Date> {
  if (!isPremium) {
    // Free tier: use next calendar month
    return getNextMonthStart();
  }

  const supabase = await createClient();
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_end_date, subscription_start_date')
    .eq('id', userId)
    .single();

  if (userData?.subscription_end_date) {
    return new Date(userData.subscription_end_date);
  }

  // Fallback: if we have start date but no end date, assume 1 month from start
  if (userData?.subscription_start_date) {
    const startDate = new Date(userData.subscription_start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  // Fallback to next calendar month
  return getNextMonthStart();
}

/**
 * Get the start of the current month (UTC) - for free tier
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Get the start of next month (UTC) - for free tier
 */
function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Get user's query count for current period
 */
export async function getQueryCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const tier = await getSubscriptionTier(userId);
  const isPaid = tier !== 'free';
  const periodStart = await getPeriodStart(userId, isPaid);
  const periodEnd = await getPeriodEnd(userId, isPaid);

  const { count, error } = await supabase
    .from('convergence_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString());

  if (error) {
    console.error('Error getting query count:', error);
    return 0;
  }

  return count || 0;
}

