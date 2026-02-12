import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTextEmbeddings } from '@/lib/parallax/embeddings';

/**
 * POST /api/convergence/generate-embeddings-by-title
 * Generate embeddings for a text by searching for it by title
 * 
 * Body: { title: string }
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
    const { title } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Search for text by title (case-insensitive partial match)
    const { data: texts, error: searchError } = await supabase
      .from('texts')
      .select('id, title, author, content')
      .ilike('title', `%${title}%`)
      .limit(10);

    if (searchError) {
      return NextResponse.json(
        { error: 'Failed to search texts', details: searchError.message },
        { status: 500 }
      );
    }

    if (!texts || texts.length === 0) {
      return NextResponse.json(
        { 
          error: 'Text not found',
          message: `No texts found matching "${title}"`,
          suggestion: 'Try a partial title match or check the library for the exact title',
        },
        { status: 404 }
      );
    }

    // If multiple matches, return them for user to choose
    if (texts.length > 1) {
      return NextResponse.json({
        message: `Found ${texts.length} texts matching "${title}"`,
        texts: texts.map(t => ({
          id: t.id,
          title: t.title,
          author: t.author,
          hasContent: !!t.content && t.content.length > 0,
        })),
        instruction: 'Use the textId from one of these texts with /api/convergence/generate-embeddings',
      });
    }

    // Single match - proceed with generating embeddings
    const text = texts[0];

    if (!text.content) {
      return NextResponse.json(
        { 
          error: 'Text has no content',
          text: {
            id: text.id,
            title: text.title,
            author: text.author,
          },
          message: 'This text has no content to generate embeddings from. Please upload content first.',
        },
        { status: 400 }
      );
    }

    // Check if embeddings already exist
    const { data: existingChunks } = await supabase
      .from('text_chunks')
      .select('id')
      .eq('text_id', text.id)
      .limit(1);

    if (existingChunks && existingChunks.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Text "${text.title}" already has embeddings`,
        textId: text.id,
        title: text.title,
        author: text.author,
        existingChunks: true,
      });
    }

    // Generate embeddings
    console.log(`Generating embeddings for "${text.title}" (${text.id})...`);
    const chunksCreated = await generateTextEmbeddings(text.id, text.content);

    return NextResponse.json({
      success: true,
      textId: text.id,
      title: text.title,
      author: text.author,
      chunksCreated,
      message: `Successfully generated ${chunksCreated} chunks for "${text.title}"`,
    });
  } catch (error) {
    console.error('Error generating embeddings by title:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
