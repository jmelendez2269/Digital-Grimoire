/**
 * API Route: TTS Preferences
 * Manages user's global text-to-speech preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TTSPreferences {
  engine?: 'web-speech' | 'azure';
  defaultVoice?: string;
  defaultRate?: number;
  defaultVolume?: number;
  azureCredentialsSet?: boolean;
}

/**
 * GET /api/user/tts-preferences
 * Fetch user's TTS preferences
 */
export async function GET(request: NextRequest) {
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

    // Fetch user with TTS preferences
    const { data, error } = await supabase
      .from('users')
      .select('tts_preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      throw error;
    }

    // Return preferences (default to empty object if none set)
    const preferences: TTSPreferences = data.tts_preferences || {};

    return NextResponse.json({
      preferences,
    });
  } catch (error) {
    console.error('Error fetching TTS preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TTS preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/tts-preferences
 * Save user's TTS preferences
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate engine if provided
    if (body.engine && !['web-speech', 'azure'].includes(body.engine)) {
      return NextResponse.json(
        { error: 'Invalid engine (must be "web-speech" or "azure")' },
        { status: 400 }
      );
    }

    // Validate rate if provided
    if (body.defaultRate && (body.defaultRate < 0.5 || body.defaultRate > 2.0)) {
      return NextResponse.json(
        { error: 'Invalid defaultRate (must be between 0.5 and 2.0)' },
        { status: 400 }
      );
    }

    // Validate volume if provided
    if (body.defaultVolume && (body.defaultVolume < 0 || body.defaultVolume > 1.0)) {
      return NextResponse.json(
        { error: 'Invalid defaultVolume (must be between 0 and 1.0)' },
        { status: 400 }
      );
    }

    // Build preferences object (merge with existing)
    const { data: currentData } = await supabase
      .from('users')
      .select('tts_preferences')
      .eq('id', user.id)
      .single();

    const currentPreferences = currentData?.tts_preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...body,
    };

    // Update user preferences
    const { error } = await supabase
      .from('users')
      .update({ tts_preferences: updatedPreferences })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error saving TTS preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save TTS preferences' },
      { status: 500 }
    );
  }
}
