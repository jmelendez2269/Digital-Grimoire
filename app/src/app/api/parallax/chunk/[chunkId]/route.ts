import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/convergence/chunk/[chunkId]
 * Fetch chunk content by chunk ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chunkId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { chunkId } = await params;

    if (!chunkId) {
      return new Response(
        JSON.stringify({ error: 'Chunk ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch chunk with text metadata
    const { data: chunk, error: chunkError } = await supabase
      .from('text_chunks')
      .select(`
        id,
        text_id,
        chunk_index,
        content,
        token_count,
        texts:text_id (
          id,
          title,
          author
        )
      `)
      .eq('id', chunkId)
      .single();

    if (chunkError || !chunk) {
      return new Response(
        JSON.stringify({ error: 'Chunk not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        chunk: {
          id: chunk.id,
          text_id: chunk.text_id,
          chunk_index: chunk.chunk_index,
          content: chunk.content,
          token_count: chunk.token_count,
          text_title: (chunk.texts as any)?.title,
          text_author: (chunk.texts as any)?.author,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching chunk:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

