import { createServiceClient } from '@/lib/supabase/service';

const CACHE_TTL_SECONDS = 3600; // 1 hour

/**
 * Build a stable cache key from concept search parameters.
 */
export function buildConceptCacheKey(params: {
  q?: string | null;
  tradition?: string | null;
  traditionId?: string | null;
  tag?: string | null;
  limit?: number;
}): string {
  const parts = [
    `q:${(params.q || '').toLowerCase().trim()}`,
    `trad:${params.tradition || ''}`,
    `tradId:${params.traditionId || ''}`,
    `tag:${params.tag || ''}`,
    `limit:${params.limit ?? 50}`,
  ];
  return parts.join('|');
}

/**
 * Retrieve cached concept search results. Returns null on miss or expired entry.
 */
export async function getCachedConceptSearch(cacheKey: string): Promise<unknown[] | null> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('search_cache')
      .select('results, created_at')
      .eq('query', cacheKey)
      .single();

    if (error || !data) return null;

    const ageSeconds = (Date.now() - new Date(data.created_at).getTime()) / 1000;
    if (ageSeconds > CACHE_TTL_SECONDS) {
      // Stale — delete asynchronously and treat as miss
      svc.from('search_cache').delete().eq('query', cacheKey).then(() => {});
      return null;
    }

    return data.results as unknown[];
  } catch {
    return null;
  }
}

/**
 * Store concept search results in cache. Fire-and-forget; errors are non-fatal.
 */
export function setCachedConceptSearch(cacheKey: string, results: unknown[]): void {
  createServiceClient()
    .from('search_cache')
    .upsert({ query: cacheKey, results })
    .then(({ error }) => {
      if (error) console.warn('[search-cache] Failed to write cache:', error.message);
    });
}
