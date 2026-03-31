import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractMetadata } from '@/lib/claude-metadata';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { textId, title, author } = body;

    if (!textId || !title) {
      return NextResponse.json(
        { error: 'textId and title are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Fetch the document
    const { data: document, error: fetchError } = await supabase
      .from('texts')
      .select('*')
      .eq('id', textId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get content for analysis (sample chapters or full OCR text)
    let contentToAnalyze = '';
    const hasStructuredChapters = document.metadata?.isStructuredText && document.metadata?.chapters && document.metadata.chapters.length > 0;

    if (hasStructuredChapters) {
      const chapters = document.metadata.chapters;
      // Use first 3 chapters or all if fewer to provide context
      const sampleChapters = chapters.slice(0, 3);
      contentToAnalyze = sampleChapters
        .map((ch: any) => `${ch.title}\n\n${ch.content}`)
        .join('\n\n---\n\n')
        .substring(0, 10000);
    } else if (document.content) {
      // Use full OCR content if limited, or first 10k chars
      contentToAnalyze = document.content.substring(0, 10000);
    }

    if (!contentToAnalyze && !title) {
      return NextResponse.json(
        { error: 'Neither content nor title is available for analysis' },
        { status: 400 }
      );
    }

    // Call extractMetadata with knownTitle and knownAuthor
    const { metadata } = await extractMetadata(
      contentToAnalyze,
      document.s3_key?.split('/').pop() || 'document',
      session.user.id,
      textId,
      title,
      author || undefined
    );

    // Update the document
    const { error: updateError } = await supabase
      .from('texts')
      .update({
        title: metadata.title,
        author: metadata.author || null,
        year: metadata.year || null,
        short_summary: metadata.shortSummary,
        long_summary: metadata.longSummary, // This is not shown on the edit page but stored
        type: metadata.type,
        domain: metadata.domain || null,
        tags: metadata.tags,
        lenses: metadata.lenses,
        confidence: metadata.confidence,
        curator_note: metadata.curatorNote || null,
      })
      .eq('id', textId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (error) {
    console.error('[Rescan All Metadata] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to rescan metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
