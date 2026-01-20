import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { vectorSearch, VectorSearchResult } from '@/lib/convergence/vector-search';
import { ftsSearchChunks, FTSSearchResult } from '@/lib/convergence/fts-search';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calculate keyword frequency in content
 */
function calculateKeywordFrequency(content: string, query: string): number {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

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
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Start with base semantic similarity (vector score)
  let score = vectorScore || 0;

  // Boost for FTS matches (keyword matches) - more weight on exact keyword matches
  if (ftsScore) {
    // If we have both, favor the higher one but blend them
    const maxScore = Math.max(score, ftsScore);
    const minScore = Math.min(score, ftsScore);
    score = maxScore * 0.8 + minScore * 0.2;
  }

  // Calculate keyword frequency in content
  const keywordFreq = calculateKeywordFrequency(contentLower, query);
  const keywordBoost = Math.min(0.15, keywordFreq / 100); // Max 0.15 boost for high frequency
  score += keywordBoost;

  // STRONG boost if query appears in title (primary texts should rank much higher)
  if (title.includes(queryLower)) {
    score += 0.4; // Very strong boost for exact title match
  } else {
    // Partial title match boost
    const titleMatchCount = queryWords.filter(word => title.includes(word)).length;
    if (titleMatchCount > 0) {
      score += 0.2 * (titleMatchCount / queryWords.length);
    }
  }

  // Boost for exact keyword matches in content (word boundaries)
  const exactMatches = queryWords.filter(word => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(contentLower);
  }).length;

  if (exactMatches > 0) {
    // More boost for more exact matches
    score += 0.15 * (exactMatches / Math.max(1, queryWords.length));
  }

  // Boost for related terms (e.g., "alchemical" when searching "alchemy")
  const relatedTerms: { [key: string]: string[] } = {
    'alchemy': ['alchemical', 'alchemist', 'alchemists', 'alchemically', 'alchemie', 'alchimie'],
    'hermetic': ['hermeticism', 'hermetical', 'hermetically', 'hermeticus'],
    'kabbalah': ['kabbalistic', 'cabala', 'qabalah', 'cabbalistic', 'kabbalah'],
    'gnostic': ['gnosticism', 'gnosis', 'gnosticism'],
    'mystic': ['mystical', 'mysticism', 'mystics', 'mysticality'],
    'esoteric': ['esotericism', 'esoterically', 'esoterica'],
    'occult': ['occultism', 'occultist', 'occultists', 'occultly'],
    'magic': ['magical', 'magician', 'magicians', 'magick'],
    'divine': ['divinity', 'divinely', 'divinization'],
    'sacred': ['sacredness', 'sacrality', 'sacralization'],
  };

  let relatedTermBoost = 0;
  for (const [key, variants] of Object.entries(relatedTerms)) {
    if (queryLower.includes(key) || queryWords.some(w => w.includes(key))) {
      const variantMatches = variants.filter(variant => {
        const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(contentLower);
      }).length;
      if (variantMatches > 0) {
        relatedTermBoost += 0.1 * variantMatches; // More variants = more boost
      }
    }
  }
  score += Math.min(0.2, relatedTermBoost); // Cap related term boost at 0.2

  // Boost if query appears at the beginning of content (often more relevant)
  if (contentLower.substring(0, 200).includes(queryLower)) {
    score += 0.1;
  }

  return Math.min(1.0, score); // Cap at 1.0
}

/**
 * Extract the sentence containing the search query from a chunk
 */
function extractSentenceWithQuery(chunkContent: string, query: string): string {
  // Split into sentences (basic sentence detection)
  const sentences = chunkContent.split(/(?<=[.!?])\s+/);

  // Find the sentence that contains the query (case-insensitive)
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2); // Filter out short words

  // Try to find a sentence containing the query or its key words
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    // Check if sentence contains the full query or significant words
    if (sentenceLower.includes(queryLower) ||
      queryWords.some(word => sentenceLower.includes(word))) {
      return sentence.trim();
    }
  }

  // If no exact match, return the first sentence
  return sentences[0]?.trim() || chunkContent.substring(0, 200) + '...';
}

/**
 * Generate a summary of the excerpt using AI
 */
async function generateExcerptSummary(chunkContent: string, query: string): Promise<string> {
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
    return summary || 'Discusses the concept in context.';
  } catch (e) {
    console.error('Error generating summary:', e);
    return 'Discusses the concept in context.';
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

    // Log top 5 results for debugging
    if (results.length > 0) {
      const topResults = results.slice(0, 5);
      console.log('Top 5 chunk relevance scores:', topResults.map(r => ({
        title: r.text_title,
        score: (r as any).relevanceScore || r.similarity,
        similarity: r.similarity
      })));
    }

    // 3. Group by Book (text_id) and collect all chunks
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
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

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
          generateExcerptSummary(chunk.content, query).then(summary => {
            chunk.summary = summary;
          })
        );
      }
    }

    // Wait for all summaries to complete (with timeout)
    await Promise.allSettled(summaryPromises);

    return new Response(
      JSON.stringify({
        relatedTerms,
        books
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
