import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { vectorSearch } from '@/lib/convergence/vector-search';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 *     chunks: Array<{ content: string, similarity: number, page?: number }>
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

    // 2. Perform Deep Vector Search
    // We fetch a high number of chunks (e.g. 500) to cover many books
    const searchPromise = vectorSearch(query, 500).catch((error) => {
      console.error('Vector search error:', error);
      // Return empty array on error rather than failing the whole request
      return [];
    });

    const [relatedTerms, results] = await Promise.all([termsPromise, searchPromise]);
    
    console.log(`Deep search for "${query}": Found ${results.length} chunks from vector search`);

    // 3. Group by Book (text_id) and select Top 3
    const booksMap = new Map();

    for (const result of results) {
      if (!booksMap.has(result.text_id)) {
        booksMap.set(result.text_id, {
          text_id: result.text_id,
          title: result.text_title || 'Unknown Title',
          author: result.text_author || 'Unknown Author',
          chunks: []
        });
      }
      
      const book = booksMap.get(result.text_id);
      // Only keep top 3
      if (book.chunks.length < 3) {
        book.chunks.push({
          chunk_id: result.chunk_id,
          content: result.content,
          similarity: result.similarity,
          chunk_index: result.chunk_index
        });
      }
    }

    // Convert map to array and sort books by highest single chunk score
    const books = Array.from(booksMap.values()).sort((a, b) => {
      const bestA = Math.max(...a.chunks.map((c: any) => c.similarity));
      const bestB = Math.max(...b.chunks.map((c: any) => c.similarity));
      return bestB - bestA;
    });

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
