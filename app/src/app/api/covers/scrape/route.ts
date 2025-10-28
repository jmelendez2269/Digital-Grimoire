// API endpoint for scraping book covers from public sources
// POST /api/covers/scrape

import { NextRequest, NextResponse } from 'next/server';
import { scrapeCover } from '@/lib/cover-scraper';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { textId, title, author } = body;

    // Validate required fields
    if (!textId || !title || !author) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['textId', 'title', 'author'],
        },
        { status: 400 }
      );
    }

    console.log(`\n📡 API: Scrape cover request for text ${textId}`);

    // Try scraping from multiple sources
    const result = await scrapeCover(title, author);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to find cover from any source',
          success: false,
        },
        { status: 404 }
      );
    }

    // Update database with scraped cover URL
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('texts')
      .update({
        cover_image_url: result.imageUrl,
        cover_source: result.source,
      })
      .eq('id', textId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    console.log(`✓ API: Cover scraped and saved successfully\n`);

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      source: result.source,
    });
  } catch (error) {
    console.error('Error in scrape cover API:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      },
      { status: 500 }
    );
  }
}

