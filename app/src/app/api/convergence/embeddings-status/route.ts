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

    // 1. Get global summary via RPC
    const { data: globalSummary, error: summaryError } = await supabase.rpc('get_library_indexing_summary').single();

    // 2. Get batch of texts
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
        summary: globalSummary || {
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

    // 3. Get chunk counts for this batch via RPC
    const textIds = texts.map(t => t.id);
    const { data: chunkCounts, error: countsError } = await supabase.rpc('get_text_chunk_counts', { text_ids: textIds });

    // Map chunk counts
    const chunksByText = new Map<string, number>();
    if (!countsError && chunkCounts) {
      chunkCounts.forEach((row: { text_id: string; chunk_count: number }) => {
        chunksByText.set(row.text_id, Number(row.chunk_count));
      });
    } else {
      // Fallback if RPC fails/not migrated
      console.warn('Fallback: get_text_chunk_counts failed, using basic check');
      const { data: fallbackChunks } = await supabase
        .from('text_chunks')
        .select('text_id')
        .in('text_id', textIds)
        .limit(1000);

      fallbackChunks?.forEach(c => {
        chunksByText.set(c.text_id, (chunksByText.get(c.text_id) || 0) + 1);
      });
    }

    // Build response
    const textsWithStatus = texts.map(text => ({
      id: text.id,
      title: text.title,
      author: text.author,
      type: text.type,
      hasContent: !!text.content && text.content.length > 0,
      hasEmbeddings: chunksByText.has(text.id),
      chunkCount: chunksByText.get(text.id) || 0,
    }));

    // Normalize summary keys (handle both snake_case and camelCase)
    const rawSummary: any = globalSummary || {};
    const summary = {
      total: rawSummary.total ?? rawSummary.total_texts ?? texts.length,
      withEmbeddings: rawSummary.withEmbeddings ?? rawSummary.with_embeddings ?? textsWithStatus.filter(t => t.hasEmbeddings).length,
      withoutEmbeddings: rawSummary.withoutEmbeddings ?? rawSummary.without_embeddings ?? textsWithStatus.filter(t => !t.hasEmbeddings).length,
      withContent: rawSummary.withContent ?? rawSummary.with_content ?? textsWithStatus.filter(t => t.hasContent).length,
      withoutContent: rawSummary.withoutContent ?? rawSummary.without_content ?? textsWithStatus.filter(t => !t.hasContent).length,
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
