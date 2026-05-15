import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseWebText } from '@/lib/parsers/sacred-texts-parser';

/**
 * POST /api/reimport-content
 * Re-fetches and updates content for an existing structured text document
 * 
 * Request body: { textId: string }
 */
export const maxDuration = 300;

export async function POST(request: Request) {
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

    // Parse request body
    const body = await request.json();
    const { textId } = body;

    if (!textId) {
      return NextResponse.json(
        { error: 'textId is required' },
        { status: 400 }
      );
    }

    // Fetch the existing document
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

    // Check if it's a structured text with sourceUrl
    const metadata = document.metadata as any;
    if (!metadata?.isStructuredText || !metadata?.sourceUrl) {
      return NextResponse.json(
        { error: 'Document is not a structured text with a source URL' },
        { status: 400 }
      );
    }

    const sourceUrl = metadata.sourceUrl;
    const format = metadata.format || 'html';

    console.log(`[Reimport] Re-fetching content from: ${sourceUrl}`);

    // Re-parse the content
    const parsedText = await parseWebText(sourceUrl, format);
    console.log(`[Reimport] Parsed ${parsedText.chapterCount} chapters`);

    // Update the document with new content
    const updatedMetadata = {
      ...metadata,
      chapters: parsedText.chapters,
      chapterCount: parsedText.chapterCount,
      totalLength: parsedText.totalLength,
      parsedAt: new Date().toISOString(),
    };

    const { data: updatedDocument, error: updateError } = await supabase
      .from('texts')
      .update({
        metadata: updatedMetadata,
        file_size: parsedText.totalLength,
      })
      .eq('id', textId)
      .select()
      .single();

    if (updateError) {
      console.error('[Reimport] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[Reimport] Successfully updated document:', textId);

    return NextResponse.json({
      success: true,
      textId: updatedDocument.id,
      title: updatedDocument.title,
      chapterCount: parsedText.chapterCount,
      totalLength: parsedText.totalLength,
      format,
    });
  } catch (error) {
    console.error('[Reimport] Error:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: details || 'Failed to re-import content',
        details,
      },
      { status: 500 }
    );
  }
}

