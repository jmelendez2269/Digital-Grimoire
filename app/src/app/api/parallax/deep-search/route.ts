import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { vectorSearch, VectorSearchResult } from '@/lib/convergence/vector-search';
import { ftsSearchChunks, FTSSearchResult } from '@/lib/convergence/fts-search';
import OpenAI from 'openai';
import { logApiUsage } from '@/lib/usage-tracker';
import { getSearchVariants, ESOTERIC_DICTIONARY, STOP_WORDS } from '@/lib/convergence/search-dictionary';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calculate keyword frequency in content
 */
function calculateKeywordFrequency(content: string, query: string): number {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

  if (queryWords.length === 0) return 0;

  let totalMatches = 0;
  for (const word of queryWords) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = contentLower.match(regex);
    totalMatches += matches ? matches.length : 0;
  }

  // Normalize by content length (words per 1000 words)
  const contentWords = contentLower.split(/\s+/).length;
  return contentWords > 0 ? (totalMatches / contentWords) * 1000 : 0;
}

/**
 * Helper to clean query for scoring
 * Removes stop words to focus on meaningful concepts
 */
function cleanQueryForScoring(query: string): string {
  return query.toLowerCase().split(/\s+/)
    .filter(w => !STOP_WORDS.has(w))
    .join(' ');
}

/**
 * Calculate relevance score with keyword and title boosting
 * This produces more differentiated scores for better ranking
 */
function calculateRelevanceScore(
  result: VectorSearchResult | FTSSearchResult,
  query: string,
  vectorScore?: number,
  ftsScore?: number
): number {
  const queryLower = query.toLowerCase();
  const title = (result.text_title || '').toLowerCase();
  const contentLower = (result.content || '').toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Clean query for exact/phrase matching
  const cleanQuery = cleanQueryForScoring(query);
  const cleanTitle = cleanQueryForScoring(title);

  // 1. Base Score: Blend Vector (Semantic) and FTS (Keyword)
  let score = 0;
  if (vectorScore !== undefined && ftsScore !== undefined) {
    // Hybrid: Semantic context (50%) + Keyword precision (50%)
    const normVector = Math.max(0, (vectorScore - 0.5) / 0.5); // Normalize 0.5-1.0 to 0-1.0
    const normFts = Math.min(1.0, ftsScore); // Cap FTS at 1.0 for blending
    score = (normVector * 0.5) + (normFts * 0.5);
  } else if (vectorScore !== undefined) {
    score = Math.max(0, (vectorScore - 0.5) / 0.5);
  } else if (ftsScore !== undefined) {
    score = Math.min(1.0, ftsScore);
  }

  // 2. Keyword Density Boost
  const keywordFreq = calculateKeywordFrequency(contentLower, query);
  const keywordBoost = Math.min(0.2, keywordFreq / 50); // Cap boost at 0.2
  score += keywordBoost;

  // 3. Title Match Boost (Primary texts should rank much higher)
  if (cleanTitle === cleanQuery) {
    score += 0.5; // Perfect title match (ignoring stop words)
  } else if (cleanTitle.includes(cleanQuery)) {
    score += 0.3; // Contains full query
  } else {
    // Partial word match boost
    const titleMatchCount = queryWords.filter(word => title.includes(word)).length;
    if (titleMatchCount > 0 && queryWords.length > 0) {
      score += 0.2 * (titleMatchCount / queryWords.length);
    }
  }

  // 4. Exact Phrase Boost (using clean query)
  if (contentLower.includes(cleanQuery)) {
    score += 0.25; // Increased boost for phrase match
  }

  // 5. Esoteric Dictionary Boost (Variants from search-dictionary.ts)
  const variants = getSearchVariants(query);
  if (variants.length > 1) {
    // If the content contains any variants of the search term
    if (variants.some(v => v.toLowerCase() !== queryLower && contentLower.includes(v.toLowerCase()))) {
      score += 0.15; // Significant boost for recognizing the concept via variant
    }
  }

  return Math.min(1.0, score); // Cap at 1.0 (100% relevance)
}

/**
 * Extract the best sentence containing the search query
 */
function extractSentenceWithQuery(chunkContent: string, query: string): string {
  // Split into sentences using a more robust regex
  const sentences = chunkContent.split(/(?<=[.!?])\s+/);

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Rank sentences by how well they match the query
  const rankedSentences = sentences.map(sentence => {
    const sLower = sentence.toLowerCase();
    let score = 0;
    if (sLower.includes(queryLower)) score += 10;
    queryWords.forEach(word => {
      if (sLower.includes(word)) score += 1;
    });
    return { sentence, score };
  }).sort((a, b) => b.score - a.score);

  const bestMatch = rankedSentences[0];
  if (bestMatch && bestMatch.score > 0) {
    return bestMatch.sentence.trim();
  }

  // Fallback to first 200 chars
  return sentences[0]?.trim() || chunkContent.substring(0, 200).trim() + '...';
}

/**
 * Generate a summary of the excerpt using AI
 */
async function generateExcerptSummary(chunkContent: string, query: string, userId: string): Promise<{ summary: string, usage: { prompt_tokens: number, completion_tokens: number } }> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use cheaper model for summaries
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Generate a brief, one-sentence summary (max 20 words) of what this excerpt discusses in relation to the search query. Be concise and specific.'
        },
        {
          role: 'user',
          content: `Search query: "${query}"\n\nExcerpt: "${chunkContent.substring(0, 1000)}"\n\nProvide a one-sentence summary:`
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || '';
    const usage = completion.usage;

    // Log usage for each summary
    if (usage) {
      await logApiUsage({
        service: 'other',
        operation: 'deep_search_summary',
        unitsUsed: usage.total_tokens,
        unitType: 'tokens',
        userId: userId,
        requestMetadata: {
          model: 'gpt-4o-mini',
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
        }
      });
    }

    return {
      summary: summary || 'Discusses the concept in context.',
      usage: {
        prompt_tokens: usage?.prompt_tokens || 0,
        completion_tokens: usage?.completion_tokens || 0
      }
    };
  } catch (e) {
    console.error('Error generating summary:', e);
    return {
      summary: 'Discusses the concept in context.',
      usage: { prompt_tokens: 0, completion_tokens: 0 }
    };
  }
}

/**
 * POST /api/convergence/deep-search
 * 
 * Body: { query: string }
 * 
 * Returns:
 * {
 *   relatedTerms: string[],
 *   books: Array<{
 *     text_id: string,
 *     title: string,
 *     author: string,
 *     chunks: Array<{ 
 *       chunk_id: string,
 *       content: string, 
 *       similarity: number,
 *       chunk_index: number,
 *       sentence: string,
 *       summary: string
 *     }>
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please sign in to use deep search.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Generate Related Terms
    const termsPromise = (async () => {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Generate 5 semantically related concepts or search terms for the user\'s query. Return ONLY a JSON array of strings, e.g., ["Term 1", "Term 2"]. Do not include markdown formatting.' },
            { role: 'user', content: query }
          ],
          temperature: 0.7,
        });

        // Log usage for related terms
        const usage = completion.usage;
        if (usage) {
          await logApiUsage({
            service: 'other',
            operation: 'deep_search_terms',
            unitsUsed: usage.total_tokens,
            unitType: 'tokens',
            userId: user.id,
            requestMetadata: {
              model: 'gpt-4o',
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
            }
          });
        }

        const content = completion.choices[0]?.message?.content || '[]';
        // Clean up potential markdown code fence if present
        const cleanContent = content.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');
        return JSON.parse(cleanContent);
      } catch (e) {
        console.error('Error generating related terms:', e);
        return [];
      }
    })();

    // 2. Perform Hybrid Search (Vector + FTS) for better keyword matching
    const searchPromise = Promise.all([
      vectorSearch(query, 500).catch((error) => {
        console.error('Vector search error:', error);
        return [];
      }),
      ftsSearchChunks(query, 500).catch((error) => {
        console.error('FTS search error:', error);
        return [];
      })
    ]).then(([vectorResults, ftsResults]) => {
      // Merge results: combine vector and FTS, deduplicate by chunk_id
      const resultsMap = new Map<string, VectorSearchResult & { ftsScore?: number; relevanceScore?: number }>();

      // Add vector results
      for (const result of vectorResults) {
        const key = result.chunk_id;
        resultsMap.set(key, {
          ...result,
          relevanceScore: calculateRelevanceScore(result, query, result.similarity)
        });
      }

      // Merge FTS results (add keyword match scores)
      for (const ftsResult of ftsResults) {
        const key = ftsResult.chunk_id || ftsResult.text_id;
        const existing = resultsMap.get(key);

        if (existing) {
          // Update relevance score with FTS boost
          existing.ftsScore = ftsResult.relevance;
          existing.relevanceScore = calculateRelevanceScore(
            existing,
            query,
            existing.similarity,
            ftsResult.relevance
          );
        } else {
          // Add new result from FTS
          resultsMap.set(key, {
            text_id: ftsResult.text_id,
            chunk_id: ftsResult.chunk_id || ftsResult.text_id,
            content: ftsResult.content,
            chunk_index: ftsResult.chunk_index || 0,
            similarity: ftsResult.relevance, // Use FTS relevance as similarity
            text_title: ftsResult.text_title,
            text_author: ftsResult.text_author,
            text_type: ftsResult.text_type,
            ftsScore: ftsResult.relevance,
            relevanceScore: calculateRelevanceScore(ftsResult, query, undefined, ftsResult.relevance)
          });
        }
      }

      // Convert to array and sort by relevance score
      return Array.from(resultsMap.values()).sort((a, b) => {
        const scoreA = a.relevanceScore || a.similarity || 0;
        const scoreB = b.relevanceScore || b.similarity || 0;
        return scoreB - scoreA;
      });
    });

    const [relatedTerms, results] = await Promise.all([termsPromise, searchPromise]);

    console.log(`Deep search for "${query}": Found ${results.length} chunks from hybrid search`);

    // Check for "unindexed" books that might be relevant
    const unindexedBooks: string[] = [];
    if (query.toLowerCase().includes('doctrine') || query.toLowerCase().includes('parabrahman')) {
      // Check specifically for Secret Doctrine status if it didn't appear in results
      const sdExists = results.some(r => r.text_title?.includes('Secret Doctrine'));
      if (!sdExists) {
        const { data: sd } = await supabase.from('texts').select('id, title').ilike('title', '%Secret Doctrine%').single();
        if (sd) {
          const { count } = await supabase.from('text_chunks').select('*', { count: 'exact', head: true }).eq('text_id', sd.id);
          if (!count || count === 0) {
            unindexedBooks.push(sd.title);
          }
        }
      }
    }

    // Log top 5 results for debugging
    if (results.length > 0) {
      const topResults = results.slice(0, 5);
      console.log('Top 5 chunk relevance scores:', topResults.map(r => ({
        title: r.text_title,
      })));
    }

    // 3. Group by Book (text_id)
    // The `results` array already contains the merged and sorted chunks from both vector and FTS searches.
    // We now group these `results` by book.
    const booksMap = new Map<string, {
      text_id: string;
      title: string;
      author: string;
      chunks: Array<{
        chunk_id: string;
        content: string;
        similarity: number;
        chunk_index: number;
        sentence: string;
        relevanceScore: number;
        summary?: string;
      }>;
    }>();

    for (const result of results) {
      if (!booksMap.has(result.text_id)) {
        booksMap.set(result.text_id, {
          text_id: result.text_id,
          title: result.text_title || 'Unknown Title',
          author: result.text_author || 'Unknown Author',
          chunks: []
        });
      }

      const book = booksMap.get(result.text_id)!;
      // Extract sentence containing the query
      const sentence = extractSentenceWithQuery(result.content, query);

      // Use relevance score if available, otherwise calculate it from similarity
      let finalScore = (result as any).relevanceScore;
      if (!finalScore) {
        // Recalculate relevance score if not already calculated
        finalScore = calculateRelevanceScore(result, query, result.similarity);
      }

      book.chunks.push({
        chunk_id: result.chunk_id,
        content: result.content,
        similarity: finalScore, // Store relevance score as similarity (for display)
        chunk_index: result.chunk_index,
        sentence: sentence,
        relevanceScore: finalScore // Also store separately for sorting
      });
    }

    // Convert map to array, select top 3 chunks per book, and sort books by relevance
    const books = Array.from(booksMap.values()).map(book => {
      // Sort chunks by relevance score (highest first) and take top 3
      const sortedChunks = book.chunks
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);

      if (sortedChunks.length === 0) {
        return {
          ...book,
          chunks: [],
          relevanceScore: 0
        };
      }

      // Calculate book-level relevance score from top chunks
      const bestChunkScore = sortedChunks[0].relevanceScore;
      const avgChunkScore = sortedChunks.reduce((sum, c) => sum + c.relevanceScore, 0) / sortedChunks.length;

      // Calculate additional book-level signals
      const title = (book.title || '').toLowerCase();
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

      // Title boost (already calculated in chunk scores, but add extra for book-level)
      let titleBoost = 0;
      if (title.includes(queryLower)) {
        titleBoost = 0.3; // Very strong boost for exact title match at book level
      } else {
        const titleMatchCount = queryWords.filter(word => title.includes(word)).length;
        if (titleMatchCount > 0) {
          titleBoost = 0.15 * (titleMatchCount / queryWords.length);
        }
      }

      // Boost for number of high-quality chunks (more chunks = more relevant)
      const highQualityChunks = sortedChunks.filter(c => c.relevanceScore > 0.5).length;
      const chunkCountBoost = Math.min(0.1, highQualityChunks * 0.03);

      // Calculate total book relevance score
      // Weight: 60% best chunk, 20% average, 15% title, 5% chunk count
      const bookRelevanceScore =
        (bestChunkScore * 0.6) +
        (avgChunkScore * 0.2) +
        titleBoost +
        chunkCountBoost;

      return {
        ...book,
        chunks: sortedChunks.map(({ relevanceScore, ...chunk }) => chunk), // Remove relevanceScore from chunk before sending
        relevanceScore: Math.min(1.0, bookRelevanceScore) // Cap at 1.0
      };
    }).sort((a, b) => {
      // Sort by relevance score (highest first) - this ensures most relevant books appear first
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;

      // If scores are very close (within 0.01), prefer books with more chunks
      if (Math.abs(scoreA - scoreB) < 0.01) {
        return b.chunks.length - a.chunks.length;
      }

      return scoreB - scoreA;
    });

    // Log top 5 books for debugging
    if (books.length > 0) {
      const topBooks = books.slice(0, 5);
      console.log('Top 5 book relevance scores:', topBooks.map(b => ({
        title: b.title,
        relevanceScore: b.relevanceScore,
        bestChunk: b.chunks.length > 0 ? b.chunks[0].similarity : 0,
        chunkCount: b.chunks.length
      })));
    }

    // 4. Generate summaries for all chunks in parallel (batch processing)
    const summaryPromises: Promise<void>[] = [];
    for (const book of books) {
      for (const chunk of book.chunks) {
        summaryPromises.push(
          generateExcerptSummary(chunk.content, query, user.id).then(res => {
            chunk.summary = res.summary;
          })
        );
      }
    }

    // Wait for all summaries to complete (with timeout)
    await Promise.allSettled(summaryPromises);

    // 5. Identify Variant Suggestions
    // If we have few results, suggest variants that might have more
    const suggestions: string[] = [];
    if (books.length < 3) {
      const allVariants = getSearchVariants(query);
      const otherVariants = allVariants.filter(v => v.toLowerCase() !== query.toLowerCase());

      // We only suggest variants that are actually present in the dictionary entry
      // (The dictionary already filters for the relevant mapping)
      suggestions.push(...otherVariants);
    }

    return new Response(
      JSON.stringify({
        relatedTerms,
        books,
        suggestions, // Add suggestions to response
        warning: unindexedBooks.length > 0
          ? `Some relevant books (like "${unindexedBooks.join(', ')}") are not yet fully indexed for deep search.`
          : results.length === 0 ? "No matches found in your library." : undefined
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in deep search:', error);

    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for common issues
      if (error.message.includes('OPENAI_API_KEY')) {
        errorMessage = 'OpenAI API key not configured';
      } else if (error.message.includes('embedding')) {
        errorMessage = 'Failed to generate search embedding';
      } else if (error.message.includes('vector') || error.message.includes('similarity')) {
        errorMessage = 'Vector search failed';
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.stack
          : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
