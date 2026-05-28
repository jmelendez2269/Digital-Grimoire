import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractMetadata } from '@/lib/claude-metadata';
import { getR2Client, GetObjectCommand } from '@/lib/storage/r2-client';
import { performOCR } from '@/lib/ocr';
import { extractPdfTextLocally, isTextSubstantial } from '@/lib/utils/server-pdf-extractor';

function getRescanMetadataError(error: unknown) {
  const details = error instanceof Error ? error.message : 'Unknown error';
  const normalized = details.toLowerCase();

  if (normalized.includes('429') || normalized.includes('quota') || normalized.includes('rate limit')) {
    return {
      status: 429,
      error: 'AI metadata rescan is currently unavailable because the AI provider quota or rate limit has been exceeded. Check billing or try again later.',
      details,
    };
  }

  if (normalized.includes('openrouter api key not configured') || normalized.includes('openai api key not configured')) {
    return {
      status: 500,
      error: 'AI metadata rescan is not configured because the OpenRouter API key is missing.',
      details,
    };
  }

  return {
    status: 500,
    error: details || 'Failed to rescan metadata',
    details,
  };
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
    const { textId, title, author, reExtractText } = body;

    if (!textId || !title) {
      return NextResponse.json(
        { error: 'textId and title are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
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

    // If reExtractText is requested, re-download the PDF from R2 and re-run OCR
    if (reExtractText && document.s3_key) {
      console.log(`[Rescan] Re-extracting text from R2: ${document.s3_key}`);
      try {
        const s3Client = getR2Client();
        const bucketName = process.env.R2_BUCKET_NAME || 'convergence-library';
        const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: document.s3_key });
        const fileResponse = await s3Client.send(getCommand);

        if (fileResponse.Body) {
          const chunks: Uint8Array[] = [];
          for await (const chunk of fileResponse.Body as any) {
            chunks.push(chunk);
          }
          const fileBuffer = Buffer.concat(chunks);
          const mimeType = fileResponse.ContentType || 'application/pdf';
          const isPDF = mimeType === 'application/pdf';

          let reExtractedText = '';

          if (isPDF) {
            try {
              const localResult = await extractPdfTextLocally(fileBuffer);
              if (isTextSubstantial(localResult.text, localResult.pageCount)) {
                reExtractedText = localResult.text;
                console.log('[Rescan] ✅ Local PDF extraction succeeded');
              } else {
                console.log('[Rescan] Local PDF text insufficient, falling back to local OCR...');
              }
            } catch (e) {
              console.log('[Rescan] Local PDF extraction failed, falling back to local OCR...');
            }
          }

          if (!reExtractedText) {
            const fileUrl = `${process.env.R2_PUBLIC_URL}/${document.s3_key}`;
            try {
              const ocrResult = await performOCR(fileUrl, session.user.id);
              reExtractedText = ocrResult.text;
              console.log(`[Rescan] ✅ local OCR succeeded: ${ocrResult.lineCount} lines`);
            } catch (ocrError) {
              console.error('[Rescan] local OCR failed:', ocrError);
            }
          }

          if (reExtractedText) {
            contentToAnalyze = reExtractedText.substring(0, 10000);
            // Update stored content so future rescans use the good text
            await supabase.from('texts').update({ content: reExtractedText }).eq('id', textId);
            console.log('[Rescan] ✅ Stored re-extracted text to database');
          }
        }
      } catch (reExtractError) {
        console.error('[Rescan] Re-extraction failed (falling back to stored content):', reExtractError);
      }
    }

    if (!contentToAnalyze) {
      if (hasStructuredChapters) {
        const chapters = document.metadata.chapters;
        const sampleChapters = chapters.slice(0, 3);
        contentToAnalyze = sampleChapters
          .map((ch: any) => `${ch.title}\n\n${ch.content}`)
          .join('\n\n---\n\n')
          .substring(0, 10000);
      } else if (document.content) {
        // Use full OCR content if limited, or first 10k chars
        contentToAnalyze = document.content.substring(0, 10000);
      }
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
    const failure = getRescanMetadataError(error);

    return NextResponse.json(
      failure,
      { status: failure.status }
    );
  }
}
