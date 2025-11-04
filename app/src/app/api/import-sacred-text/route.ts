import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseWebText } from '@/lib/parsers/sacred-texts-parser';
import { extractMetadata } from '@/lib/claude-metadata';

interface ImportRequestBody {
  url: string;
  format?: 'html' | 'markdown' | 'plaintext';
  useAI?: boolean;
  metadata?: {
    title?: string;
    author?: string;
    year?: number;
    type?: string;
    domain?: string;
    publisher?: string;
    tags?: string[];
    lenses?: string[];
    summary?: string;
  };
}

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

    // Parse request body
    const body: ImportRequestBody = await request.json();
    const { url, format = 'html', useAI = true, metadata: manualMetadata } = body;

    // Validate URL - check for supported domains
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format only - allow any valid HTTP/HTTPS URL
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'Invalid URL. Please provide a valid HTTP or HTTPS URL.' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format. Please provide a valid URL.' },
        { status: 400 }
      );
    }

    // Parse the web text
    console.log('[Import API] Parsing web text from:', url);
    const parsedText = await parseWebText(url, format);
    console.log(`[Import API] Parsed ${parsedText.chapterCount} chapters`);

    // AI-enhanced metadata extraction (if enabled)
    let aiMetadata = null;
    let aiWarning = null;
    
    if (useAI) {
      try {
        console.log('[Import API] Running AI metadata extraction...');
        
        // Extract sample content from first 3 chapters (max 10k chars)
        const sampleContent = parsedText.chapters
          .slice(0, 3)
          .map(ch => `${ch.title}\n\n${ch.content}`)
          .join('\n\n---\n\n')
          .slice(0, 10000);

        // Call AI metadata extraction
        const aiResult = await extractMetadata(
          sampleContent,
          parsedText.metadata.title,
          session.user.id
        );
        
        aiMetadata = aiResult.metadata;
        console.log('[Import API] AI metadata extracted:', {
          lenses: aiMetadata.lenses,
          tags: aiMetadata.tags.slice(0, 3),
          hasSummary: !!aiMetadata.shortSummary
        });
      } catch (aiError) {
        console.error('[Import API] AI metadata extraction failed:', aiError);
        aiWarning = 'AI analysis unavailable - using parsed metadata only';
        // Continue with import even if AI fails
      }
    }

    // Merge metadata: manual overrides > AI suggestions > parsed data
    const finalMetadata = {
      title: manualMetadata?.title || aiMetadata?.title || parsedText.metadata.title,
      author: manualMetadata?.author || aiMetadata?.author || parsedText.metadata.author,
      year: manualMetadata?.year || aiMetadata?.year || parsedText.metadata.year,
      publisher: manualMetadata?.publisher || aiMetadata?.publisher || parsedText.metadata.publisher,
      type: manualMetadata?.type || aiMetadata?.type || 'book_esoteric',
      domain: manualMetadata?.domain || aiMetadata?.domain || 'spirituality',
      tags: manualMetadata?.tags?.length ? manualMetadata.tags : (aiMetadata?.tags || []),
      lenses: manualMetadata?.lenses?.length ? manualMetadata.lenses : (aiMetadata?.lenses || []),
      summary: manualMetadata?.summary || aiMetadata?.shortSummary || parsedText.metadata.description,
      shortSummary: manualMetadata?.summary || aiMetadata?.shortSummary || parsedText.metadata.description,
      longSummary: aiMetadata?.longSummary || null,
      curatorNote: aiMetadata?.curatorNote || null,
    };

    // Prepare text record for database
    const textRecord = {
      title: finalMetadata.title,
      author: finalMetadata.author,
      year: finalMetadata.year,
      publisher: finalMetadata.publisher,
      type: finalMetadata.type,
      domain: finalMetadata.domain,
      tags: finalMetadata.tags,
      lenses: finalMetadata.lenses,
      summary: finalMetadata.summary,
      short_summary: finalMetadata.shortSummary || null,
      curator_note: finalMetadata.curatorNote || null,
      status: 'ready',
      content: null, // We store content in metadata.chapters
      s3_key: null, // No S3 storage for web-imported texts
      file_size: parsedText.totalLength,
      source_format: 'html', // We'll add this column in migration
      metadata: {
        isStructuredText: true,
        format: format,
        chapters: parsedText.chapters,
        sourceUrl: parsedText.metadata.sourceUrl,
        originalFormat: 'html',
        parsedAt: new Date().toISOString(),
        chapterCount: parsedText.chapterCount,
        totalLength: parsedText.totalLength,
        longSummary: finalMetadata.longSummary,
        aiEnhanced: useAI && aiMetadata !== null,
      },
      uploaded_by: session.user.id,
    };

    // Insert into database
    const { data: insertedText, error: insertError } = await supabase
      .from('texts')
      .insert(textRecord)
      .select()
      .single();

    if (insertError) {
      console.error('[Import API] Database error:', insertError);
      return NextResponse.json(
        { 
          error: 'Failed to save text to database', 
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    console.log('[Import API] Successfully imported text:', insertedText.id);

    return NextResponse.json({
      success: true,
      textId: insertedText.id,
      title: insertedText.title,
      chapterCount: parsedText.chapterCount,
      totalLength: parsedText.totalLength,
      format: format,
      aiEnhanced: useAI && aiMetadata !== null,
      warning: aiWarning || undefined,
    });

  } catch (error) {
    console.error('[Import API] Unexpected error:', error);
    
    // Handle specific parser errors
    if (error instanceof Error) {
      if (error.message.includes('Failed to parse')) {
        return NextResponse.json(
          { 
            error: 'Failed to parse sacred text', 
            details: error.message 
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Failed to fetch')) {
        return NextResponse.json(
          { 
            error: 'Failed to fetch content from URL', 
            details: error.message 
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint to test if a URL is valid
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL format only
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'Invalid URL protocol. Please provide a valid HTTP or HTTPS URL.' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format.' },
        { status: 400 }
      );
    }

    // Try to fetch and validate the URL
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'URL is not accessible', status: response.status },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      url: url,
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to validate URL', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

