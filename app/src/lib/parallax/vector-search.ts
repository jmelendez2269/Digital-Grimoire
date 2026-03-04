import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from './embeddings';

export interface LensFilters {
  lenses?: string[]; // Filter by Parallax lenses
  documentTypes?: string[];
  domains?: string[];
}

export interface VectorSearchResult {
  text_id: string;
  chunk_id: string;
  content: string;
  chunk_index: number;
  similarity: number;
  text_title?: string;
  text_author?: string;
  text_type?: string;
}

/**
 * Vector similarity search using pgvector
 * @param query - Search query text
 * @param limit - Maximum number of results to return
 * @param filters - Optional lens/document filters
 * @returns Array of search results with similarity scores
 */
export async function vectorSearch(
  query: string,
  limit: number = 10,
  filters?: LensFilters
): Promise<VectorSearchResult[]> {
  const supabase = await createClient();

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Note: Supabase JS client doesn't directly support pgvector similarity operations
  // We need to use an RPC function for efficient vector search
  // For now, we'll use RPC which requires a database function to be created

  // Try RPC first (more efficient), fallback to manual if needed
  try {
    const rpcResults = await vectorSearchRPC(queryEmbedding.embedding, limit, filters);
    // Returning rpcResults even if it is empty. Only use manual fallback if RPC fails/throws.
    return rpcResults;
  } catch (error) {
    console.warn('RPC search failed, using manual calculation:', error);
    // Fallback: manual similarity calculation (slower but works)
    return await vectorSearchManual(queryEmbedding.embedding, limit, filters);
  }
}

/**
 * Manual vector search with similarity calculation
 * Fallback when RPC is unavailable. Slower but works.
 */
async function vectorSearchManual(
  queryEmbedding: number[],
  limit: number,
  filters?: LensFilters
): Promise<VectorSearchResult[]> {
  const supabase = await createClient();
  const MIN_SIMILARITY = 0.2;

  // Build filter query for texts
  let textQuery = supabase.from('texts').select('id, title, author, type, lenses');
  const hasFilters = filters && (filters.lenses?.length || filters.documentTypes?.length || filters.domains?.length);

  if (filters?.lenses && filters.lenses.length > 0) {
    textQuery = textQuery.contains('lenses', filters.lenses);
  }
  if (filters?.documentTypes && filters.documentTypes.length > 0) {
    textQuery = textQuery.in('type', filters.documentTypes);
  }

  const { data: allTexts } = hasFilters
    ? await textQuery
    : await textQuery.limit(1000);

  const textMap = new Map(
    (allTexts || []).map(t => [t.id, { title: t.title, author: t.author, type: t.type }])
  );

  let chunksQuery = supabase
    .from('text_chunks')
    .select('id, text_id, chunk_index, content, embedding')
    .not('embedding', 'is', null);

  if (hasFilters) {
    const textIds = allTexts?.map(t => t.id) || [];
    if (textIds.length === 0) return [];
    chunksQuery = chunksQuery.in('text_id', textIds);
  }

  // Fetch chunks in a larger but safe batch for manual calculation
  const { data: chunks, error: chunksError } = await chunksQuery.limit(5000);

  if (chunksError || !chunks || chunks.length === 0) return [];
  const resultsWithSimilarity = chunks
    .map(chunk => {
      if (!chunk.embedding || !Array.isArray(chunk.embedding)) return null;
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (similarity < MIN_SIMILARITY) return null;

      const textMeta = textMap.get(chunk.text_id);
      if (!textMeta) return null;
      return {
        text_id: chunk.text_id,
        chunk_id: chunk.id,
        content: chunk.content,
        chunk_index: chunk.chunk_index,
        similarity,
        text_title: textMeta.title,
        text_author: textMeta.author,
        text_type: textMeta.type,
      } as VectorSearchResult;
    })
    .filter((r): r is VectorSearchResult => r !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  // Log diagnostic info


  console.log(`[Vector Search] Returning ${resultsWithSimilarity.length} results after filtering`);

  return resultsWithSimilarity;
}

/**
 * Fallback: Use RPC function for vector similarity search
 * This requires creating a PostgreSQL function in the database
 */
async function vectorSearchRPC(
  queryEmbedding: number[],
  limit: number,
  filters?: LensFilters
): Promise<VectorSearchResult[]> {
  const supabase = await createClient();

  // Build filter conditions
  const lensFilter = filters?.lenses && filters.lenses.length > 0
    ? filters.lenses
    : null;
  const typeFilter = filters?.documentTypes && filters.documentTypes.length > 0
    ? filters.documentTypes
    : null;

  // Call RPC function (if it exists)
  const { data, error } = await supabase.rpc('match_text_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.2, // Minimum similarity score (lowered to match manual search)
    match_count: limit,
    lens_filter: lensFilter,
    type_filter: typeFilter,
  });

  if (error) {
    console.error('RPC function error:', error);
    // Throw error so the caller can fall back to manual search
    throw new Error(`RPC vector search failed: ${error.message || JSON.stringify(error)}`);
  }

  return (data || []).map((item: any) => ({
    text_id: item.text_id,
    chunk_id: item.chunk_id || item.id,
    content: item.content,
    chunk_index: item.chunk_index,
    similarity: item.similarity,
    text_title: item.text_title,
    text_author: item.text_author,
    text_type: item.text_type,
  }));
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

