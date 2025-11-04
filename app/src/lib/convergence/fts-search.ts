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
 * Search text_chunks using FTS
 * Useful for finding specific chunks that match the query
 */
export async function ftsSearchChunks(
  query: string,
  limit: number = 10,
  filters?: LensFilters
): Promise<FTSSearchResult[]> {
  const supabase = await createClient();

  // Clean query
  const cleanQuery = query
    .replace(/[&|!():'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanQuery) {
    return [];
  }

  const searchQuery = cleanQuery
    .split(/\s+/)
    .filter(word => word.length > 2)
    .join(' & ');

  if (!searchQuery) {
    return [];
  }

  // First get matching texts with filters
  let textQuery = supabase.from('texts').select('id, title, author, type, lenses');

  if (filters?.lenses && filters.lenses.length > 0) {
    textQuery = textQuery.contains('lenses', filters.lenses);
  }
  if (filters?.documentTypes && filters.documentTypes.length > 0) {
    textQuery = textQuery.in('type', filters.documentTypes);
  }
  if (filters?.domains && filters.domains.length > 0) {
    textQuery = textQuery.in('domain', filters.domains);
  }

  const { data: texts } = await textQuery;
  const textIds = texts?.map(t => t.id) || [];

  if (textIds.length === 0) {
    return [];
  }

  // Get chunks for matching texts
  // Note: We can't use textSearch directly on text_chunks.content since it's not indexed
  // Instead, we'll filter chunks manually and rank by term matches
  const { data: chunks, error } = await supabase
    .from('text_chunks')
    .select('id, text_id, chunk_index, content')
    .in('text_id', textIds)
    .limit(limit * 3);

  if (error || !chunks || chunks.length === 0) {
    return [];
  }

  // Create text metadata map
  const textMap = new Map(
    (texts || []).map(t => [t.id, { title: t.title, author: t.author, type: t.type }])
  );

  // Calculate relevance for each chunk
  const queryTerms = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  const results: FTSSearchResult[] = chunks.map(chunk => {
    const content = (chunk.content || '').toLowerCase();
    
    let matchCount = 0;
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = content.match(regex);
      matchCount += matches ? matches.length : 0;
    }
    
    const relevance = Math.min(1.0, matchCount / (queryTerms.length * 2));
    const textMeta = textMap.get(chunk.text_id);

    return {
      text_id: chunk.text_id,
      chunk_id: chunk.id,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      relevance,
      text_title: textMeta?.title,
      text_author: textMeta?.author,
      text_type: textMeta?.type,
    };
  });

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

