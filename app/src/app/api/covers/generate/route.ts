// API endpoint for AI-generating book covers using Replicate
// POST /api/covers/generate

import { NextRequest, NextResponse } from 'next/server';
import { generateBookCover } from '@/lib/replicate-cover';
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

    // Check if Replicate API token is configured
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { 
          error: 'Replicate API token not configured. Please add REPLICATE_API_TOKEN to environment variables. You can get an API token from https://replicate.com/account/api-tokens',
          success: false,
        },
        { status: 503 }
      );
    }

    // Generate cover with Replicate FLUX.1 [schnell] model
    console.log(`[API] Calling generateBookCover with:`, { title, author, domain, tags });
    const result = await generateBookCover(title, author, domain, tags);
    console.log(`[API] generateBookCover result:`, { success: result.success, hasImageUrl: !!result.imageUrl, error: result.error });

    if (!result.success) {
      console.error(`[API] Cover generation failed:`, result.error);
      return NextResponse.json(
        { 
          error: result.error || 'Failed to generate cover',
          success: false,
        },
        { status: 500 }
      );
    }

    if (!result.imageUrl) {
      console.error(`[API] Cover generation succeeded but no imageUrl returned`);
      return NextResponse.json(
        { 
          error: 'Cover generated but no image URL returned',
          success: false,
        },
        { status: 500 }
      );
    }

    // Update database with AI-generated cover URL
    console.log(`[API] Updating database with cover URL:`, result.imageUrl);
    const supabase = await createClient();
    const { error: updateError, data: updateData } = await supabase
      .from('texts')
      .update({
        cover_image_url: result.imageUrl,
        cover_source: 'ai-generated',
      })
      .eq('id', textId)
      .select();

    if (updateError) {
      console.error('[API] Database update error:', updateError);
      // Don't throw - return error but still return the image URL so user can save manually
      console.warn('[API] Database update failed, but cover was generated. Returning image URL for manual save.');
      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        source: 'ai-generated',
        creditsUsed: result.creditsUsed,
        warning: 'Cover generated but database update failed. Please save manually.',
      });
    }

    console.log(`[API] Database updated successfully. Rows affected:`, updateData?.length || 0);

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

