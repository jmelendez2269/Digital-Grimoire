import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in seconds (e.g., 60 for per-minute, 3600 for per-hour) */
  window: number;
  /** Optional: Custom identifier (defaults to user ID or IP) */
  identifier?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

/**
 * General-purpose rate limiting utility
 * Uses Supabase database to track rate limits across server instances
 * 
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit status
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = await createClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.window * 1000);

  // Check existing rate limit records within the time window
  const { data: records, error } = await supabase
    .from('rate_limits')
    .select('created_at')
    .eq('identifier', identifier)
    .eq('window_seconds', config.window)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error checking rate limit:', error);
    // Fail open on database errors to avoid breaking the app
    return {
      allowed: true,
      remaining: config.limit,
      limit: config.limit,
      resetAt: new Date(now.getTime() + config.window * 1000),
    };
  }

  const requestCount = records?.length || 0;
  const remaining = Math.max(0, config.limit - requestCount);
  const allowed = requestCount < config.limit;

  // Calculate reset time (oldest request + window, or now + window if no requests)
  const resetAt = records && records.length > 0
    ? new Date(new Date(records[records.length - 1].created_at).getTime() + config.window * 1000)
    : new Date(now.getTime() + config.window * 1000);

  return {
    allowed,
    remaining,
    limit: config.limit,
    resetAt,
  };
}

/**
 * Record a rate limit request
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 */
export async function recordRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('rate_limits')
    .insert({
      identifier,
      window_seconds: config.window,
      limit: config.limit,
    });

  if (error) {
    console.error('Error recording rate limit:', error);
    // Don't throw - rate limiting shouldn't break the request
  }
}

/**
 * Get client IP address from request
 * @param request - Next.js request object
 * @returns IP address string
 */
export function getClientIP(request: NextRequest): string {
  // Try various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Rate limit middleware for API routes
 * Returns a NextResponse with 429 status if rate limit exceeded
 * 
 * @param request - Next.js request
 * @param config - Rate limit configuration
 * @param identifier - Optional custom identifier (defaults to user ID or IP)
 * @returns NextResponse if rate limited, null if allowed
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): Promise<NextResponse | null> {
  // Get identifier (user ID if authenticated, otherwise IP)
  let id = identifier;
  
  if (!id) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    id = user?.id || getClientIP(request);
  }

  const rateLimit = await checkRateLimit(id, config);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${rateLimit.resetAt.toISOString()}`,
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        resetAt: rateLimit.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.floor(rateLimit.resetAt.getTime() / 1000).toString(),
          'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Record the request
  await recordRateLimit(id, config);

  return null; // Allowed
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /** Strict: 10 requests per minute */
  STRICT: { limit: 10, window: 60 },
  /** Moderate: 60 requests per minute */
  MODERATE: { limit: 60, window: 60 },
  /** Generous: 100 requests per minute */
  GENEROUS: { limit: 100, window: 60 },
  /** Per hour: 1000 requests per hour */
  PER_HOUR: { limit: 1000, window: 3600 },
  /** File uploads: 10 uploads per hour */
  FILE_UPLOAD: { limit: 10, window: 3600 },
  /** Auth attempts: 5 attempts per 15 minutes */
  AUTH_ATTEMPTS: { limit: 5, window: 900 },
} as const;

