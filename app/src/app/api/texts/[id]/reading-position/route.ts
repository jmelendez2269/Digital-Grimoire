/**
 * API Route: Reading Position
 * Manages user's reading position for text-to-speech functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ReadingPosition {
  char_position: number;
  text_source: 'ocr' | 'pdf';
  playback_rate?: number;
  selected_voice?: string;
}

/**
 * GET /api/texts/[id]/reading-position
 * Fetch user's saved reading position for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: textId } = await params;

    // Fetch reading position
    const { data, error } = await supabase
      .from('reading_positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('text_id', textId)
      .single();

    if (error) {
      // No saved position found is OK
      if (error.code === 'PGRST116') {
        return NextResponse.json({ position: null });
      }
      throw error;
    }

    return NextResponse.json({
      position: {
        charPosition: data.char_position,
        textSource: data.text_source,
        playbackRate: data.playback_rate,
        selectedVoice: data.selected_voice,
      },
    });
  } catch (error) {
    console.error('Error fetching reading position:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading position' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/texts/[id]/reading-position
 * Save or update user's reading position
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: textId } = await params;
    const body = await request.json();

    // Validate input
    if (typeof body.charPosition !== 'number') {
      return NextResponse.json(
        { error: 'Invalid charPosition' },
        { status: 400 }
      );
    }

    if (!['ocr', 'pdf'].includes(body.textSource)) {
      return NextResponse.json(
        { error: 'Invalid textSource (must be "ocr" or "pdf")' },
        { status: 400 }
      );
    }

    // Upsert reading position
    const { data, error } = await supabase
      .from('reading_positions')
      .upsert(
        {
          user_id: user.id,
          text_id: textId,
          char_position: body.charPosition,
          text_source: body.textSource,
          playback_rate: body.playbackRate || 1.0,
          selected_voice: body.selectedVoice || null,
        },
        {
          onConflict: 'user_id,text_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      position: {
        charPosition: data.char_position,
        textSource: data.text_source,
        playbackRate: data.playback_rate,
        selectedVoice: data.selected_voice,
      },
    });
  } catch (error) {
    console.error('Error saving reading position:', error);
    return NextResponse.json(
      { error: 'Failed to save reading position' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/texts/[id]/reading-position
 * Clear user's reading position
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: textId } = await params;

    // Delete reading position
    const { error } = await supabase
      .from('reading_positions')
      .delete()
      .eq('user_id', user.id)
      .eq('text_id', textId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reading position:', error);
    return NextResponse.json(
      { error: 'Failed to delete reading position' },
      { status: 500 }
    );
  }
}
