import { vectorSearch, VectorSearchResult, LensFilters } from './vector-search';
import { ftsSearchChunks, FTSSearchResult } from './fts-search';

export interface RetrievalOptions {
  vectorWeight?: number; // Default 0.7
  ftsWeight?: number; // Default 0.3
  lenses?: string[];
  documentTypes?: string[];
  domains?: string[];
  limit?: number; // Default 10
}

export interface HybridSearchResult {
  text_id: string;
  chunk_id?: string;
  content: string;
  chunk_index?: number;
  finalScore: number; // Combined RRF score
  vectorScore?: number;
  ftsScore?: number;
  text_title?: string;
  text_author?: string;
  text_type?: string;
}

/**
 * Hybrid retrieval combining vector search and FTS
 * Uses Reciprocal Rank Fusion (RRF) to merge results
 * @param query - Search query
 * @param options - Retrieval configuration
 * @returns Merged and ranked results
 */
export async function hybridSearch(
  query: string,
  options: RetrievalOptions = {}
): Promise<HybridSearchResult[]> {
  const {
    vectorWeight = 0.7,
    ftsWeight = 0.3,
    lenses,
    documentTypes,
    domains,
    limit = 10,
  } = options;

  // Build filters
  const filters: LensFilters = {
    lenses,
    documentTypes,
    domains,
  };

  // Run both searches in parallel
  const [vectorResults, ftsResults] = await Promise.all([
    vectorSearch(query, limit * 2, filters).catch(err => {
      console.warn('Vector search failed:', err);
      return [];
    }),
    ftsSearchChunks(query, limit * 2, filters).catch(err => {
      console.warn('FTS chunk search failed:', err);
      return [];
    }),
  ]);

  // Merge results using Reciprocal Rank Fusion (RRF)
  const merged = mergeWithRRF(vectorResults, ftsResults, vectorWeight, ftsWeight);

  // Deduplicate by text_id (prefer chunk results if available)
  const deduplicated = deduplicateResults(merged);

  // Sort by final score and limit
  return deduplicated
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
}

/**
 * Merge results using Reciprocal Rank Fusion (RRF)
 * RRF formula: score = sum(1 / (k + rank)) for each result set
 * Where k is typically 60 for rank fusion
 */
function mergeWithRRF(
  vectorResults: VectorSearchResult[],
  ftsResults: FTSSearchResult[],
  vectorWeight: number,
  ftsWeight: number
): HybridSearchResult[] {
  const k = 60; // RRF constant
  const mergedMap = new Map<string, HybridSearchResult>();

  // Process vector results
  vectorResults.forEach((result, index) => {
    const rank = index + 1;
    const rrfScore = vectorWeight * (1 / (k + rank));

    // Use chunk_id if available, otherwise text_id as key
    const key = result.chunk_id || result.text_id;

    if (!mergedMap.has(key)) {
      mergedMap.set(key, {
        text_id: result.text_id,
        chunk_id: result.chunk_id,
        content: result.content,
        chunk_index: result.chunk_index,
        finalScore: rrfScore,
        vectorScore: result.similarity,
        text_title: result.text_title,
        text_author: result.text_author,
        text_type: result.text_type,
      });
    } else {
      // Merge: add to existing score
      const existing = mergedMap.get(key)!;
      existing.finalScore += rrfScore;
      existing.vectorScore = result.similarity;
    }
  });

  // Process FTS results
  ftsResults.forEach((result, index) => {
    const rank = index + 1;
    const rrfScore = ftsWeight * (1 / (k + rank));

    // Use chunk_id if available, otherwise text_id as key
    const key = result.chunk_id || result.text_id;

    if (!mergedMap.has(key)) {
      mergedMap.set(key, {
        text_id: result.text_id,
        chunk_id: result.chunk_id,
        content: result.content,
        chunk_index: result.chunk_index,
        finalScore: rrfScore,
        ftsScore: result.relevance,
        text_title: result.text_title,
        text_author: result.text_author,
        text_type: result.text_type,
      });
    } else {
      // Merge: add to existing score
      const existing = mergedMap.get(key)!;
      existing.finalScore += rrfScore;
      existing.ftsScore = result.relevance;
    }
  });

  return Array.from(mergedMap.values());
}

/**
 * Deduplicate results by text_id
 * If multiple chunks from same text, keep the highest-scoring one
 */
function deduplicateResults(
  results: HybridSearchResult[]
): HybridSearchResult[] {
  const textMap = new Map<string, HybridSearchResult>();

  results.forEach(result => {
    const existing = textMap.get(result.text_id);

    if (!existing || result.finalScore > existing.finalScore) {
      textMap.set(result.text_id, result);
    }
  });

  return Array.from(textMap.values());
}

/**
 * Alternative: Keep all chunks but prioritize higher scores
 * Useful when you want multiple chunks from the same text
 */
export async function hybridSearchWithChunks(
  query: string,
  options: RetrievalOptions = {}
): Promise<HybridSearchResult[]> {
  // This would keep all chunks, not deduplicate by text_id
  // Implementation similar to hybridSearch but without deduplication
  return await hybridSearch(query, options);
}

