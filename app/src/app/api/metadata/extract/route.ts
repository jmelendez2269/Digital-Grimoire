import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';

// Initialize clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Extract metadata from document using Claude Vision API
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
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('ANTHROPIC_API_KEY not configured - skipping metadata extraction');
      return NextResponse.json(
        {
          message: 'Metadata extraction skipped - API key not configured',
          metadata: null,
        },
        { status: 200 }
      );
    }

    // Get document from S3 (first page/cover image)
    // For MVP, we'll use a placeholder. In production, you'd:
    // 1. Convert first page of PDF to image using pdf-lib or similar
    // 2. Or use S3 Select to get first N bytes
    // 3. Pass image to Claude Vision

    // For now, we'll use Claude to analyze the filename and any available text
    const filename = s3Key.split('/').pop() || '';
    
    // Prompt for Claude
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

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const metadata = JSON.parse(jsonMatch[0]);

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

