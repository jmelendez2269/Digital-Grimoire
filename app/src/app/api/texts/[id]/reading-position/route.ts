/**
 * API Route: Reading Position
 * GET/POST endpoints for managing reading positions
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch reading position
    const { data, error } = await supabase
      .from('reading_positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('text_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is ok
      console.error('Error fetching reading position:', error);
      return NextResponse.json({ error: 'Failed to fetch reading position' }, { status: 500 });
    }

    return NextResponse.json({ data: data || null });
  } catch (error) {
    console.error('Error in GET /api/texts/[id]/reading-position:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { char_position, text_source, playback_rate, selected_voice } = body;

    // Upsert reading position
    const { data, error } = await supabase
      .from('reading_positions')
      .upsert(
        {
          user_id: user.id,
          text_id: id,
          char_position: char_position || 0,
          text_source: text_source || 'ocr',
          playback_rate: playback_rate || 1.0,
          selected_voice: selected_voice || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,text_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving reading position:', error);
      return NextResponse.json({ error: 'Failed to save reading position' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST /api/texts/[id]/reading-position:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete reading position
    const { error } = await supabase
      .from('reading_positions')
      .delete()
      .eq('user_id', user.id)
      .eq('text_id', id);

    if (error) {
      console.error('Error deleting reading position:', error);
      return NextResponse.json({ error: 'Failed to delete reading position' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/texts/[id]/reading-position:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

