import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { source } = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Still track anonymous clicks
      await supabase.rpc('track_courses_click', {
        p_user_id: null,
        p_source: source || 'unknown',
      });
      return NextResponse.json({ success: true });
    }

    // Track the click
    await supabase.rpc('track_courses_click', {
      p_user_id: user.id,
      p_source: source || 'unknown',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking courses click:', error);
    // Don't fail the request - tracking is non-critical
    return NextResponse.json({ success: false, error: 'Tracking failed' }, { status: 500 });
  }
}
