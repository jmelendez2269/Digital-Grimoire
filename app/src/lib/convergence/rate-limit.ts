import { createClient } from '@/lib/supabase/server';
import { LensWeights } from './lens-orchestrator';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: Date;
}

const FREE_TIER_LIMIT = 5;
const PREMIUM_TIER_LIMIT = Infinity; // Unlimited

/**
 * Check if user has exceeded rate limit for Convergence Machine queries
 * Free tier: 5 queries per month
 * Premium tier: Unlimited
 * 
 * @param userId - User ID to check
 * @returns Rate limit status
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = await createClient();

  // Check if user is premium (for now, we'll assume all users are free tier)
  // TODO: Implement actual subscription check when premium system is ready
  const isPremium = await checkPremiumStatus(userId);
  const limit = isPremium ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT;

  if (isPremium) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: PREMIUM_TIER_LIMIT,
      resetDate: getNextMonthStart(),
    };
  }

  // Get current month's query count
  const monthStart = getMonthStart();
  const { data: queries, error } = await supabase
    .from('convergence_queries')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString());

  if (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the query (fail open)
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetDate: getNextMonthStart(),
    };
  }

  const queryCount = queries?.length || 0;
  const remaining = Math.max(0, limit - queryCount);
  const allowed = queryCount < limit;

  return {
    allowed,
    remaining,
    limit,
    resetDate: getNextMonthStart(),
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
 * Check if user has premium subscription
 * - Admins automatically get premium access (for testing)
 * - Checks subscription_status column in users table
 * - Future: Will integrate with Stripe or payment provider
 */
async function checkPremiumStatus(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('subscription_status, role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking premium status:', error);
    // Fail closed: assume free tier on error
    return false;
  }

  // Admins automatically get premium access (useful for testing)
  if (data?.role === 'admin') {
    return true;
  }

  // Check subscription status
  return data?.subscription_status === 'premium' || data?.subscription_status === 'active';
}

/**
 * Get the start of the current month (UTC)
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Get the start of next month (UTC)
 */
function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Get user's query count for current month
 */
export async function getQueryCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const monthStart = getMonthStart();

  const { count, error } = await supabase
    .from('convergence_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString());

  if (error) {
    console.error('Error getting query count:', error);
    return 0;
  }

  return count || 0;
}

