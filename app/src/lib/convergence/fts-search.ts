import { createClient } from '@/lib/supabase/server';
import { LensFilters } from './vector-search';

export interface FTSSearchResult {
  text_id: string;
  content: string;
  relevance: number;
  text_title?: string;
  text_author?: string;
  text_type?: string;
  chunk_id?: string;
  chunk_index?: number;
}

/**
 * Full-text search using PostgreSQL FTS
 * Uses existing tsvector indexes on texts.content
 * @param query - Search query text
 * @param limit - Maximum number of results to return
 * @param filters - Optional lens/document filters
 * @returns Array of search results with relevance scores
 */
export async function ftsSearch(
  query: string,
  limit: number = 10,
  filters?: LensFilters
): Promise<FTSSearchResult[]> {
  const supabase = await createClient();

  // Clean and prepare query for PostgreSQL tsquery
  // Remove special characters that break tsquery
  const cleanQuery = query
    .replace(/[&|!():'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanQuery) {
    return [];
  }

  // Build search query - search in texts.content
  // PostgreSQL FTS uses to_tsquery format: 'word1 & word2'
  const searchQuery = cleanQuery
    .split(/\s+/)
    .filter(word => word.length > 2) // Ignore very short words
    .join(' & '); // AND operator for all terms

  if (!searchQuery) {
    return [];
  }

  // Start with base query on texts table
  let textQuery = supabase
    .from('texts')
    .select('id, title, author, type, content, lenses')
    .textSearch('content', searchQuery, {
      type: 'plain',
      config: 'english',
    });

  // Apply filters
  if (filters?.lenses && filters.lenses.length > 0) {
    textQuery = textQuery.contains('lenses', filters.lenses);
  }
  if (filters?.documentTypes && filters.documentTypes.length > 0) {
    textQuery = textQuery.in('type', filters.documentTypes);
  }
  if (filters?.domains && filters.domains.length > 0) {
    textQuery = textQuery.in('domain', filters.domains);
  }

  // Execute query with relevance ranking
  const { data: texts, error } = await textQuery
    .limit(limit * 2); // Get more results for ranking

  if (error) {
    console.error('Error in FTS search:', error);
    return [];
  }

  if (!texts || texts.length === 0) {
    return [];
  }

  // Calculate relevance scores using ts_rank
  // Since Supabase doesn't expose ts_rank directly, we'll use a simple heuristic:
  // Count occurrences of query terms in content
  const queryTerms = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  const results: FTSSearchResult[] = texts.map(text => {
    const content = (text.content || '').toLowerCase();

    // Calculate relevance: count of matching terms / total terms
    let matchCount = 0;
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = content.match(regex);
      matchCount += matches ? matches.length : 0;
    }

    // Normalize relevance score (0-1)
    const relevance = Math.min(1.0, matchCount / (queryTerms.length * 2));

    return {
      text_id: text.id,
      content: text.content || '',
      relevance,
      text_title: text.title,
      text_author: text.author,
      text_type: text.type,
    };
  });

  // Sort by relevance and limit
  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Search text_chunks using FTS RPC
 * This uses the database-native ts_rank_cd for high-performance relevance ranking.
 */
export async function ftsSearchChunks(
  query: string,
  limit: number = 10,
  filters?: LensFilters
): Promise<FTSSearchResult[]> {
  const supabase = await createClient();

  // Clean and prepare query for PostgreSQL
  const cleanQuery = query
    .replace(/[&|!():'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanQuery) return [];

  // Try RPC first for professional ranking
  try {
    const { data, error } = await supabase.rpc('match_text_fts', {
      search_query: cleanQuery,
      match_count: limit,
      lens_filter: filters?.lenses && filters.lenses.length > 0 ? filters.lenses : null,
      type_filter: filters?.documentTypes && filters.documentTypes.length > 0 ? filters.documentTypes : null,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        text_id: item.text_id,
        chunk_id: item.chunk_id,
        chunk_index: item.chunk_index,
        content: item.content,
        relevance: item.relevance,
        text_title: item.text_title,
        text_author: item.text_author,
        text_type: item.text_type,
      }));
    }
  } catch (err) {
    console.error('FTS RPC failed, falling back to basic matching:', err);
  }

  // Fallback to basic keyword search if RPC fails
  // First get matching texts with filters
  let textQuery = supabase.from('texts').select('id, title, author, type, lenses');

  if (filters?.lenses && filters.lenses.length > 0) {
    textQuery = textQuery.contains('lenses', filters.lenses);
  }
  if (filters?.documentTypes && filters.documentTypes.length > 0) {
    textQuery = textQuery.in('type', filters.documentTypes);
  }

  const { data: texts } = await textQuery;
  const textIds = texts?.map(t => t.id) || [];

  if (textIds.length === 0) return [];

  // Get chunks and manually rank (last resort)
  // We search for query terms using ILIKE for a basic fallback
  const queryWords = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryWords.length === 0) return [];

  // Build a query that looks for any of the words
  let chunksQuery = supabase.from('text_chunks').select('id, text_id, chunk_index, content').in('text_id', textIds);

  // Basic logical OR for the words (expensive but better than nothing)
  // For a last resort fallback, we just check the first word or use a simple filter
  if (queryWords[0]) {
    chunksQuery = chunksQuery.ilike('content', `%${queryWords[0]}%`);
  }

  const { data: chunks, error } = await chunksQuery.limit(limit * 3);

  if (error || !chunks || chunks.length === 0) return [];

  const textMap = new Map((texts || []).map(t => [t.id, t]));

  const results = chunks.map(chunk => {
    const content = (chunk.content || '').toLowerCase();
    let matchCount = 0;
    for (const term of queryWords) {
      if (content.includes(term)) matchCount++;
    }

    // Only return if at least one word matched
    if (matchCount === 0) return null;

    const relevance = Math.min(1.0, matchCount / (queryWords.length || 1));
    const meta = textMap.get(chunk.text_id);

    return {
      text_id: chunk.text_id,
      chunk_id: chunk.id,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      relevance,
      text_title: meta?.title,
      text_author: meta?.author,
      text_type: meta?.type,
    } as FTSSearchResult;
  })
    .filter((r): r is FTSSearchResult => r !== null);

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}
