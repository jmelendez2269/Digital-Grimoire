import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTextEmbeddings, backfillAllTextEmbeddings } from '@/lib/convergence/embeddings';

/**
 * POST /api/convergence/generate-embeddings
 * Generate embeddings for texts
 * 
 * Body options:
 * - { textId: string } - Generate embeddings for a specific text
 * - { all: true, batchSize?: number, maxTexts?: number } - Backfill all texts
 */
export async function POST(request: NextRequest) {
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { textId, all, batchSize, maxTexts } = body;

    // Validate request
    if (!textId && !all) {
      return NextResponse.json(
        { error: 'Either textId or all=true must be provided' },
        { status: 400 }
      );
    }

    if (textId) {
      // Generate embeddings for a specific text
      const { data: text, error: textError } = await supabase
        .from('texts')
        .select('id, content')
        .eq('id', textId)
        .single();

      if (textError || !text) {
        return NextResponse.json(
          { error: 'Text not found' },
          { status: 404 }
        );
      }

      if (!text.content) {
        return NextResponse.json(
          { error: 'Text has no content to embed' },
          { status: 400 }
        );
      }

      const chunksCreated = await generateTextEmbeddings(textId, text.content);

      return NextResponse.json({
        success: true,
        textId,
        chunksCreated,
        message: `Generated ${chunksCreated} chunks for text ${textId}`,
      });
    }

    if (all) {
      // Backfill all texts
      const result = await backfillAllTextEmbeddings(
        batchSize || 10,
        maxTexts
      );

      return NextResponse.json({
        success: true,
        ...result,
        message: `Backfilled ${result.textsProcessed} texts with ${result.totalChunks} total chunks`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

