import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseOrRepairAiJsonObject } from '@/lib/ai/json';
import { getDefaultOpenRouterMetadataModel, getOpenRouterClient } from '@/lib/ai/openrouter-client';

/**
 * Extract metadata from document using OpenRouter-compatible chat completions
 * Analyzes first page/cover to extract title, author, year, type, etc.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const { textId, s3Key } = await request.json();

    if (!textId || !s3Key) {
      return NextResponse.json(
        { error: 'textId and s3Key are required' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('OPENROUTER_API_KEY not configured - skipping metadata extraction');
      return NextResponse.json(
        {
          message: 'Metadata extraction skipped - API key not configured',
          metadata: null,
        },
        { status: 200 }
      );
    }

    // For now, analyze the filename and any available text.
    const filename = s3Key.split('/').pop() || '';
    
    const prompt = `You are a librarian analyzing a document. Based on the filename "${filename}", extract the following metadata:

1. Title: The full title of the work
2. Author: The author's name (if determinable)
3. Year: Publication year (if determinable)
4. Type: Document classification (choose ONE from: book_esoteric, book_spiritual, book_psychology, article_scholarly, mythology, astrology, ritual_guide, commentary, reference_table, or misc)
5. Domain: Subject area (e.g., alchemy, astrology, qabalah, tarot, hermeticism, buddhism, etc.)
6. Confidence: Your confidence level (established, interpretive, speculative, or tradition)

Return ONLY valid JSON with this exact structure (no additional text):
{
  "title": "string",
  "author": "string or null",
  "year": number or null,
  "type": "string",
  "domain": "string",
  "confidence": "string",
  "tags": ["array", "of", "keywords"]
}`;

    const openai = getOpenRouterClient();
    const model = getDefaultOpenRouterMetadataModel();
    const response = await openai.chat.completions.create({
      model,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a librarian metadata extractor. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = response.choices[0].message.content || '{}';
    const metadata = await parseOrRepairAiJsonObject<Record<string, any>>(responseText, {
      client: openai,
      model,
      label: 'Filename metadata extraction',
    });

    // Update database with extracted metadata
    const { error: updateError } = await supabase
      .from('texts')
      .update({
        title: metadata.title || filename.replace(/\.(pdf|docx?)$/i, ''),
        author: metadata.author,
        year: metadata.year,
        type: metadata.type || 'misc',
        domain: metadata.domain,
        confidence: metadata.confidence || 'interpretive',
        tags: metadata.tags || [],
      })
      .eq('id', textId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log(`Metadata extracted for ${filename}:`, metadata);

    return NextResponse.json({
      message: 'Metadata extracted successfully',
      metadata,
    });
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

