import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Chapter {
  id: string;
  title: string;
  content: string;
  volume?: 'science' | 'religion';
  titleGenerated?: boolean;
}

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
    const { textId, chapters } = body;

    if (!textId) {
      return NextResponse.json(
        { error: 'textId is required' },
        { status: 400 }
      );
    }

    if (!chapters || !Array.isArray(chapters)) {
      return NextResponse.json(
        { error: 'chapters array is required' },
        { status: 400 }
      );
    }

    // Fetch the existing document
    const { data: document, error: fetchError } = await supabase
      .from('texts')
      .select('metadata')
      .eq('id', textId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if it's a structured text
    const metadata = document.metadata as any;
    if (!metadata?.isStructuredText || !metadata?.chapters) {
      return NextResponse.json(
        { error: 'Document is not a structured text with chapters' },
        { status: 400 }
      );
    }

    // Update chapters with new titles and metadata
    const updatedChapters = metadata.chapters.map((existingChapter: Chapter) => {
      const updatedChapter = chapters.find((ch: Chapter) => ch.id === existingChapter.id);
      if (updatedChapter) {
        return {
          ...existingChapter,
          title: updatedChapter.title,
          volume: updatedChapter.volume || existingChapter.volume,
          titleGenerated: updatedChapter.titleGenerated || false,
        };
      }
      return existingChapter;
    });

    // Update the document metadata
    const updatedMetadata = {
      ...metadata,
      chapters: updatedChapters,
    };

    const { data: updatedDocument, error: updateError } = await supabase
      .from('texts')
      .update({
        metadata: updatedMetadata,
      })
      .eq('id', textId)
      .select()
      .single();

    if (updateError) {
      console.error('[Update Chapter Names] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[Update Chapter Names] Successfully updated document:', textId);

    return NextResponse.json({
      success: true,
      textId: updatedDocument.id,
      chapters: updatedChapters,
    });
  } catch (error) {
    console.error('[Update Chapter Names] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update chapter names',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

