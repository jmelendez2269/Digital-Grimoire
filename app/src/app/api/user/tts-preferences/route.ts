/**
 * API Route: TTS Preferences
 * GET/POST endpoints for managing user TTS preferences
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user TTS preferences
    const { data, error } = await supabase
      .from('users')
      .select('tts_preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching TTS preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json({ data: data?.tts_preferences || {} });
  } catch (error) {
    console.error('Error in GET /api/user/tts-preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 });
    }

    // Update user TTS preferences
    const { data, error } = await supabase
      .from('users')
      .update({
        tts_preferences: preferences,
      })
      .eq('id', user.id)
      .select('tts_preferences')
      .single();

    if (error) {
      console.error('Error saving TTS preferences:', error);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json({ data: data?.tts_preferences || {} });
  } catch (error) {
    console.error('Error in POST /api/user/tts-preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

