import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated and is admin
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('range') || '30'; // days
    const daysAgo = parseInt(timeRange);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get all rate limit records in the time range
    const { data: rateLimitRecords, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (rateLimitError) throw rateLimitError;

    // Calculate violations by checking if count exceeds limit within window
    // Group by identifier and window_seconds, then check if count > limit
    const violationsMap = new Map<string, {
      identifier: string;
      windowSeconds: number;
      limit: number;
      count: number;
      lastViolation: Date;
      violations: number;
    }>();

    const usageByWindow = new Map<number, {
      windowSeconds: number;
      totalRequests: number;
      uniqueIdentifiers: Set<string>;
      violations: number;
    }>();

    const identifierStats = new Map<string, {
      identifier: string;
      totalRequests: number;
      violations: number;
      windows: Map<number, { count: number; limit: number }>;
      lastRequest: Date;
    }>();

    // Process rate limit records
    for (const record of rateLimitRecords || []) {
      const windowKey = `${record.identifier}-${record.window_seconds}`;
      const windowStart = new Date(new Date(record.created_at).getTime() - record.window_seconds * 1000);

      // Count requests in this window
      const requestsInWindow = (rateLimitRecords || []).filter(r =>
        r.identifier === record.identifier &&
        r.window_seconds === record.window_seconds &&
        new Date(r.created_at) >= windowStart &&
        new Date(r.created_at) <= new Date(record.created_at)
      ).length;

      // Check if this is a violation
      if (requestsInWindow > record.limit) {
        const violationKey = `${record.identifier}-${record.window_seconds}`;
        if (!violationsMap.has(violationKey)) {
          violationsMap.set(violationKey, {
            identifier: record.identifier,
            windowSeconds: record.window_seconds,
            limit: record.limit,
            count: requestsInWindow,
            lastViolation: new Date(record.created_at),
            violations: 1,
          });
        } else {
          const existing = violationsMap.get(violationKey)!;
          existing.violations += 1;
          if (new Date(record.created_at) > existing.lastViolation) {
            existing.lastViolation = new Date(record.created_at);
          }
        }
      }

      // Track usage by window
      if (!usageByWindow.has(record.window_seconds)) {
        usageByWindow.set(record.window_seconds, {
          windowSeconds: record.window_seconds,
          totalRequests: 0,
          uniqueIdentifiers: new Set(),
          violations: 0,
        });
      }
      const windowStats = usageByWindow.get(record.window_seconds)!;
      windowStats.totalRequests += 1;
      windowStats.uniqueIdentifiers.add(record.identifier);

      // Track identifier stats
      if (!identifierStats.has(record.identifier)) {
        identifierStats.set(record.identifier, {
          identifier: record.identifier,
          totalRequests: 0,
          violations: 0,
          windows: new Map(),
          lastRequest: new Date(record.created_at),
        });
      }
      const identifierStat = identifierStats.get(record.identifier)!;
      identifierStat.totalRequests += 1;
      if (new Date(record.created_at) > identifierStat.lastRequest) {
        identifierStat.lastRequest = new Date(record.created_at);
      }

      // Track window-specific stats for this identifier
      if (!identifierStat.windows.has(record.window_seconds)) {
        identifierStat.windows.set(record.window_seconds, { count: 0, limit: record.limit });
      }
      const windowStat = identifierStat.windows.get(record.window_seconds)!;
      windowStat.count += 1;
    }

    // Update violation counts in window stats
    for (const violation of violationsMap.values()) {
      const windowStats = usageByWindow.get(violation.windowSeconds);
      if (windowStats) {
        windowStats.violations += violation.violations;
      }
      const identifierStat = identifierStats.get(violation.identifier);
      if (identifierStat) {
        identifierStat.violations += violation.violations;
      }
    }

    // Get top offenders (identifiers with most violations)
    const topOffenders = Array.from(identifierStats.values())
      .filter(stat => stat.violations > 0)
      .sort((a, b) => b.violations - a.violations)
      .slice(0, 20)
      .map(stat => ({
        identifier: stat.identifier,
        violations: stat.violations,
        totalRequests: stat.totalRequests,
        lastRequest: stat.lastRequest.toISOString(),
      }));

    // Get Convergence Machine statistics
    const { data: convergenceQueries, error: convergenceError } = await supabase
      .from('convergence_queries')
      .select('user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (convergenceError) {
      console.error('Error fetching convergence queries:', convergenceError);
    }

    // Get user subscription tiers for Convergence Machine stats
    const userIds = convergenceQueries ? [...new Set(convergenceQueries.map(q => q.user_id))] : [];
    const { data: userTiers } = await supabase
      .from('users')
      .select('id, subscription_status, role')
      .in('id', userIds.slice(0, 100)); // Limit to avoid query size issues

    const tierMap = new Map<string, string>();
    if (userTiers) {
      for (const user of userTiers) {
        if (user.role === 'admin') {
          tierMap.set(user.id, 'adept');
        } else if (user.subscription_status === 'student') {
          tierMap.set(user.id, 'student');
        } else if (user.subscription_status === 'scholar') {
          tierMap.set(user.id, 'scholar');
        } else if (user.subscription_status === 'adept') {
          tierMap.set(user.id, 'adept');
        } else {
          tierMap.set(user.id, 'free');
        }
      }
    }

    // Aggregate Convergence Machine queries by tier
    const convergenceByTier = {
      free: 0,
      student: 0,
      scholar: 0,
      adept: 0,
      unknown: 0,
    };

    const convergenceByUser = new Map<string, number>();

    for (const query of convergenceQueries || []) {
      const tier = tierMap.get(query.user_id) || 'unknown';
      convergenceByTier[tier as keyof typeof convergenceByTier] += 1;

      const userCount = convergenceByUser.get(query.user_id) || 0;
      convergenceByUser.set(query.user_id, userCount + 1);
    }

    // Get users approaching limits (for Convergence Machine)
    const usersApproachingLimit = Array.from(convergenceByUser.entries())
      .map(([userId, count]) => {
        const tier = tierMap.get(userId) || 'free';
        let limit = 5; // free tier default
        if (tier === 'student') limit = 5;
        else if (tier === 'scholar') limit = 25;
        else if (tier === 'adept') limit = 50;

        return {
          userId,
          tier,
          queryCount: count,
          limit,
          percentageUsed: (count / limit) * 100,
        };
      })
      .filter(user => user.percentageUsed >= 50) // Only show users at 50%+ of limit
      .sort((a, b) => b.percentageUsed - a.percentageUsed)
      .slice(0, 10);

    // Calculate overview statistics
    const totalRateLimitChecks = rateLimitRecords?.length || 0;
    const totalViolations = Array.from(violationsMap.values()).reduce((sum, v) => sum + v.violations, 0);
    const uniqueIdentifiers = new Set(rateLimitRecords?.map(r => r.identifier) || []).size;
    const activeWindows = Array.from(usageByWindow.keys());

    // Format window usage stats
    const windowUsageStats = Array.from(usageByWindow.values()).map(stats => ({
      windowSeconds: stats.windowSeconds,
      windowName: stats.windowSeconds === 60 ? 'Per Minute' :
                  stats.windowSeconds === 900 ? 'Auth (15 min)' :
                  stats.windowSeconds === 3600 ? 'Per Hour' :
                  `${stats.windowSeconds}s`,
      totalRequests: stats.totalRequests,
      uniqueIdentifiers: stats.uniqueIdentifiers.size,
      violations: stats.violations,
    }));

    return NextResponse.json({
      success: true,
      timeRange: daysAgo,
      startDate: startDate.toISOString(),
      overview: {
        totalRateLimitChecks,
        totalViolations,
        uniqueIdentifiers,
        activeWindows: activeWindows.length,
      },
      windowUsageStats,
      topOffenders,
      convergenceMachine: {
        totalQueries: convergenceQueries?.length || 0,
        queriesByTier: convergenceByTier,
        uniqueUsers: convergenceByUser.size,
        usersApproachingLimit,
      },
      violations: Array.from(violationsMap.values()).slice(0, 50), // Limit to 50 most recent
    });
  } catch (error) {
    console.error('Failed to fetch rate limit statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rate limit statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

