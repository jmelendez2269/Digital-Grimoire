// API endpoint for AI-generating book covers using Nano Banana
// POST /api/covers/generate

import { NextRequest, NextResponse } from 'next/server';
import { generateBookCover } from '@/lib/nano-banana-cover';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { textId, title, author, domain, tags } = body;

    // Validate required fields
    if (!textId || !title || !author || !domain) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['textId', 'title', 'author', 'domain'],
        },
        { status: 400 }
      );
    }

    console.log(`\n📡 API: Generate AI cover request for text ${textId}`);

    // Check if Nano Banana API key is configured
    if (!process.env.NANO_BANANA_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Nano Banana API key not configured. Please add NANO_BANANA_API_KEY to environment variables.',
          success: false,
        },
        { status: 503 }
      );
    }

    // Generate cover with Nano Banana AI
    const result = await generateBookCover(title, author, domain, tags);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to generate cover',
          success: false,
        },
        { status: 500 }
      );
    }

    // Update database with AI-generated cover URL
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('texts')
      .update({
        cover_image_url: result.imageUrl,
        cover_source: 'ai-generated',
      })
      .eq('id', textId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    console.log(`✓ API: AI cover generated and saved successfully\n`);

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      source: 'ai-generated',
      creditsUsed: result.creditsUsed,
    });
  } catch (error) {
    console.error('Error in generate cover API:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      },
      { status: 500 }
    );
  }
}

