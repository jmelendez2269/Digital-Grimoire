import { createClient } from '@/lib/supabase/server';

export interface ProviderUsageData {
  date: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  cost: number;
}

export interface UsageComparison {
  date: string;
  tracked: ProviderUsageData;
  provider: ProviderUsageData | null;
  discrepancy: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    percentage: number;
  } | null;
}

/**
 * Fetch tracked usage from our database
 * This represents what we've logged from API responses
 */
export async function fetchTrackedUsage(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<ProviderUsageData[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('api_usage')
    .select('created_at, units_used, unit_type, estimated_cost, request_metadata')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .in('service', ['convergence_query', 'openai_metadata', 'other'])
    .eq('unit_type', 'tokens');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching tracked usage:', error);
    return [];
  }

  // Group by date
  const usageByDate = new Map<string, ProviderUsageData>();

  (data || []).forEach((record) => {
    const date = new Date(record.created_at).toISOString().split('T')[0];
    const metadata = (record.request_metadata || {}) as Record<string, any>;
    
    // Extract token counts from metadata if available
    const inputTokens = metadata.inputTokens || 0;
    const outputTokens = metadata.outputTokens || 0;
    const cost = parseFloat(record.estimated_cost || '0');

    if (!usageByDate.has(date)) {
      usageByDate.set(date, {
        date,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
        cost: 0,
      });
    }

    const dayUsage = usageByDate.get(date)!;
    dayUsage.inputTokens += inputTokens;
    dayUsage.outputTokens += outputTokens;
    dayUsage.requests += 1;
    dayUsage.cost += cost;
  });

  return Array.from(usageByDate.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );
}

/**
 * Note: OpenAI doesn't provide a public API to fetch usage data
 * However, we can:
 * 1. Compare our tracked usage against what we see in their dashboard
 * 2. Use their billing API (if available with enterprise accounts)
 * 3. Export usage data manually and import it
 * 
 * For now, this function returns null and documents the limitation
 */
export async function fetchOpenAIProviderUsage(
  startDate: Date,
  endDate: Date
): Promise<ProviderUsageData[] | null> {
  // OpenAI doesn't provide a public usage API
  // This would require:
  // 1. Enterprise API access
  // 2. Manual export from OpenAI dashboard
  // 3. Webhook integration (if available)
  
  console.warn('[OpenAI Usage] Provider API not available. OpenAI does not provide a public usage API.');
  console.warn('[OpenAI Usage] To compare usage, manually export data from https://platform.openai.com/usage');
  
  return null;
}

/**
 * Compare tracked usage vs provider usage
 * Returns discrepancies for investigation
 */
export async function compareUsage(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<UsageComparison[]> {
  const tracked = await fetchTrackedUsage(startDate, endDate, userId);
  const provider = await fetchOpenAIProviderUsage(startDate, endDate);

  if (!provider) {
    // Return tracked usage with null provider data
    return tracked.map((t) => ({
      date: t.date,
      tracked: t,
      provider: null,
      discrepancy: null,
    }));
  }

  // Create date map for provider data
  const providerMap = new Map<string, ProviderUsageData>();
  provider.forEach((p) => providerMap.set(p.date, p));

  // Compare and find discrepancies
  return tracked.map((t) => {
    const p = providerMap.get(t.date);
    
    if (!p) {
      return {
        date: t.date,
        tracked: t,
        provider: null,
        discrepancy: null,
      };
    }

    const inputDiff = Math.abs(t.inputTokens - p.inputTokens);
    const outputDiff = Math.abs(t.outputTokens - p.outputTokens);
    const costDiff = Math.abs(t.cost - p.cost);
    const totalTracked = t.inputTokens + t.outputTokens;
    const totalProvider = p.inputTokens + p.outputTokens;
    const percentage = totalProvider > 0 
      ? ((totalTracked - totalProvider) / totalProvider) * 100 
      : 0;

    return {
      date: t.date,
      tracked: t,
      provider: p,
      discrepancy: {
        inputTokens: inputDiff,
        outputTokens: outputDiff,
        cost: costDiff,
        percentage,
      },
    };
  });
}

/**
 * Get summary statistics for usage comparison
 */
export async function getUsageSummary(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<{
  tracked: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalRequests: number;
    totalCost: number;
  };
  provider: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalRequests: number;
    totalCost: number;
  } | null;
  accuracy: {
    inputTokensAccuracy: number;
    outputTokensAccuracy: number;
    costAccuracy: number;
  } | null;
}> {
  const tracked = await fetchTrackedUsage(startDate, endDate, userId);
  const provider = await fetchOpenAIProviderUsage(startDate, endDate);

  const trackedSummary = tracked.reduce(
    (acc, day) => ({
      totalInputTokens: acc.totalInputTokens + day.inputTokens,
      totalOutputTokens: acc.totalOutputTokens + day.outputTokens,
      totalRequests: acc.totalRequests + day.requests,
      totalCost: acc.totalCost + day.cost,
    }),
    {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRequests: 0,
      totalCost: 0,
    }
  );

  if (!provider) {
    return {
      tracked: trackedSummary,
      provider: null,
      accuracy: null,
    };
  }

  const providerSummary = provider.reduce(
    (acc, day) => ({
      totalInputTokens: acc.totalInputTokens + day.inputTokens,
      totalOutputTokens: acc.totalOutputTokens + day.outputTokens,
      totalRequests: acc.totalRequests + day.requests,
      totalCost: acc.totalCost + day.cost,
    }),
    {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRequests: 0,
      totalCost: 0,
    }
  );

  const accuracy = {
    inputTokensAccuracy:
      providerSummary.totalInputTokens > 0
        ? (trackedSummary.totalInputTokens / providerSummary.totalInputTokens) * 100
        : 100,
    outputTokensAccuracy:
      providerSummary.totalOutputTokens > 0
        ? (trackedSummary.totalOutputTokens / providerSummary.totalOutputTokens) * 100
        : 100,
    costAccuracy:
      providerSummary.totalCost > 0
        ? (trackedSummary.totalCost / providerSummary.totalCost) * 100
        : 100,
  };

  return {
    tracked: trackedSummary,
    provider: providerSummary,
    accuracy,
  };
}
