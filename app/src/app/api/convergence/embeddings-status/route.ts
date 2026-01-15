import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/convergence/embeddings-status
 * Diagnostic endpoint to check which texts have embeddings
 * 
 * Query params:
 * - title?: string - Filter by title (partial match)
 * - limit?: number - Limit results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const titleFilter = searchParams.get('title');
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);

    // Get all texts (or filtered by title)
    let textsQuery = supabase
      .from('texts')
      .select('id, title, author, type, content')
      .limit(limit);

    if (titleFilter) {
      textsQuery = textsQuery.ilike('title', `%${titleFilter}%`);
    }

    const { data: texts, error: textsError } = await textsQuery;

    if (textsError) {
      return NextResponse.json(
        { error: 'Failed to fetch texts', details: textsError.message },
        { status: 500 }
      );
    }

    if (!texts || texts.length === 0) {
      return NextResponse.json({
        texts: [],
        summary: {
          total: 0,
          withEmbeddings: 0,
          withoutEmbeddings: 0,
          withContent: 0,
          withoutContent: 0,
        },
        message: titleFilter 
          ? `No texts found matching "${titleFilter}"`
          : 'No texts found',
      });
    }

    // Get text IDs
    const textIds = texts.map(t => t.id);

    // Check which texts have chunks (embeddings)
    const { data: chunks, error: chunksError } = await supabase
      .from('text_chunks')
      .select('text_id')
      .in('text_id', textIds);

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
    }

    // Count chunks per text
    const chunksByText = new Map<string, number>();
    (chunks || []).forEach(chunk => {
      chunksByText.set(chunk.text_id, (chunksByText.get(chunk.text_id) || 0) + 1);
    });

    // Build response with status for each text
    const textsWithStatus = texts.map(text => ({
      id: text.id,
      title: text.title,
      author: text.author,
      type: text.type,
      hasContent: !!text.content && text.content.length > 0,
      hasEmbeddings: chunksByText.has(text.id),
      chunkCount: chunksByText.get(text.id) || 0,
    }));

    // Calculate summary
    const summary = {
      total: texts.length,
      withEmbeddings: textsWithStatus.filter(t => t.hasEmbeddings).length,
      withoutEmbeddings: textsWithStatus.filter(t => !t.hasEmbeddings).length,
      withContent: textsWithStatus.filter(t => t.hasContent).length,
      withoutContent: textsWithStatus.filter(t => !t.hasContent).length,
    };

    return NextResponse.json({
      texts: textsWithStatus,
      summary,
      message: `Found ${texts.length} text(s)${titleFilter ? ` matching "${titleFilter}"` : ''}`,
    });
  } catch (error) {
    console.error('Error checking embeddings status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
