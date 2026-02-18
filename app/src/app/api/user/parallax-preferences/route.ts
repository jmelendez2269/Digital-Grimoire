/**
 * API Route: Parallax Engine Preferences
 * Manages user's default lens weights and response length preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LensWeights, ResponseLength } from '@/lib/parallax/lens-orchestrator';

interface ParallaxPreferences {
  lensWeights?: LensWeights;
  responseLength?: ResponseLength;
}

/**
 * GET /api/user/parallax-preferences
 * Fetch user's Parallax Engine preferences
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

    // Fetch user with convergence preferences (stored as legacy column name)
    const { data, error } = await supabase
      .from('users')
      .select('convergence_preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      throw error;
    }

    // Return preferences (default to empty object if none set)
    const preferences: ParallaxPreferences = data.convergence_preferences || {};

    return NextResponse.json({
      preferences,
    });
  } catch (error) {
    console.error('Error fetching parallax preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parallax preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/parallax-preferences
 * Save user's Parallax Engine preferences
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

    // Validate responseLength if provided
    if (body.responseLength && !['short', 'medium', 'long'].includes(body.responseLength)) {
      return NextResponse.json(
        { error: 'Invalid responseLength (must be "short", "medium", or "long")' },
        { status: 400 }
      );
    }

    // Validate lensWeights if provided
    if (body.lensWeights) {
      const requiredLenses = ['scientific', 'psychological', 'philosophical', 'religious_spiritual', 'historical_anthropological', 'symbolic_occult', 'mathematical'];
      const providedLenses = Object.keys(body.lensWeights);

      // Check if all required lenses are present
      for (const lens of requiredLenses) {
        if (!(lens in body.lensWeights)) {
          return NextResponse.json(
            { error: `Missing required lens: ${lens}` },
            { status: 400 }
          );
        }
        // Validate weight is a number between 0 and 100
        const weight = body.lensWeights[lens];
        if (typeof weight !== 'number' || weight < 0 || weight > 100) {
          return NextResponse.json(
            { error: `Invalid weight for ${lens}: must be a number between 0 and 100` },
            { status: 400 }
          );
        }
      }
    }

    // Build preferences object (merge with existing)
    const { data: currentData } = await supabase
      .from('users')
      .select('convergence_preferences')
      .eq('id', user.id)
      .single();

    const currentPreferences = currentData?.convergence_preferences || {};
    const updatedPreferences: ParallaxPreferences = {
      ...currentPreferences,
      ...(body.lensWeights && { lensWeights: body.lensWeights }),
      ...(body.responseLength && { responseLength: body.responseLength }),
    };

    // Update user preferences
    const { error } = await supabase
      .from('users')
      .update({ convergence_preferences: updatedPreferences })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error saving parallax preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save parallax preferences' },
      { status: 500 }
    );
  }
}

