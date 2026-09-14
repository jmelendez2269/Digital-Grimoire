import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

export interface SimpleRateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

const RATE_LIMIT_OPERATION_PREFIX = "rate_limit:";

/**
 * Lightweight, best-effort per-user rate limiter for customer-reachable AI
 * generation routes that don't have their own credit-metering system
 * (see src/lib/working/metered-working.server.ts for the metered pattern).
 * Backed by the existing api_usage table, so no new migration is required.
 *
 * This is a backstop against runaway cost/abuse, not a precise billing
 * limit: the check-then-insert is not atomic, so a burst of concurrent
 * requests can slip a few over the limit. On a lookup failure it fails
 * open, matching src/lib/parallax/rate-limit.ts.
 */
export async function checkAndRecordRateLimit(
  userId: string,
  action: string,
  options: { limit: number; windowMs: number },
): Promise<SimpleRateLimitResult> {
  const supabase = createServiceClient();
  const windowStart = new Date(Date.now() - options.windowMs);
  const resetAt = new Date(Date.now() + options.windowMs);
  const operation = `${RATE_LIMIT_OPERATION_PREFIX}${action}`;

  const { count, error } = await supabase
    .from("api_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("operation", operation)
    .gte("created_at", windowStart.toISOString());

  if (error) {
    console.error(
      `[Rate Limit] Failed to check "${action}" for user ${userId}:`,
      error,
    );
    return { allowed: true, remaining: options.limit, limit: options.limit, resetAt };
  }

  const used = count ?? 0;
  if (used >= options.limit) {
    return { allowed: false, remaining: 0, limit: options.limit, resetAt };
  }

  const { error: insertError } = await supabase.from("api_usage").insert({
    service: "other",
    operation,
    units_used: 1,
    unit_type: "requests",
    estimated_cost: 0,
    user_id: userId,
  });

  if (insertError) {
    console.error(
      `[Rate Limit] Failed to record "${action}" for user ${userId}:`,
      insertError,
    );
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - used - 1),
    limit: options.limit,
    resetAt,
  };
}
