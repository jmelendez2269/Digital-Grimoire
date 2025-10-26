import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/reading-progress?text_id=xxx - Get reading progress for a specific text
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const text_id = searchParams.get('text_id');

    if (!text_id) {
      // Get all reading progress for user
      const { data, error } = await supabase
        .from('reading_progress')
        .select(`
          *,
          texts (
            id,
            title,
            author,
            year,
            type,
            domain,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching reading progress:', error);
        return NextResponse.json(
          { error: 'Failed to fetch reading progress' },
          { status: 500 }
        );
      }

      return NextResponse.json({ progress: data || [] });
    }

    // Get progress for specific text
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('text_id', text_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching reading progress:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reading progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ progress: data || null });
  } catch (error) {
    console.error('Error in GET /api/reading-progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/reading-progress - Create or update reading progress
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      text_id,
      current_page,
      total_pages,
      progress_percent,
      last_position,
      time_spent_seconds,
      completed,
    } = body;

    if (!text_id) {
      return NextResponse.json(
        { error: 'text_id is required' },
        { status: 400 }
      );
    }

    // Check if progress already exists
    const { data: existing } = await supabase
      .from('reading_progress')
      .select('id, time_spent_seconds')
      .eq('user_id', user.id)
      .eq('text_id', text_id)
      .single();

    const progressData: any = {
      user_id: user.id,
      text_id,
    };

    if (current_page !== undefined) progressData.current_page = current_page;
    if (total_pages !== undefined) progressData.total_pages = total_pages;
    if (progress_percent !== undefined) progressData.progress_percent = progress_percent;
    if (last_position !== undefined) progressData.last_position = last_position;
    if (time_spent_seconds !== undefined) {
      // Add to existing time
      progressData.time_spent_seconds = existing 
        ? (existing.time_spent_seconds || 0) + time_spent_seconds
        : time_spent_seconds;
    }
    if (completed !== undefined) {
      progressData.completed = completed;
      if (completed) {
        progressData.completed_at = new Date().toISOString();
        progressData.progress_percent = 100;
      }
    }

    if (existing) {
      // Update existing progress
      const { data, error } = await supabase
        .from('reading_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating reading progress:', error);
        return NextResponse.json(
          { error: 'Failed to update reading progress' },
          { status: 500 }
        );
      }

      return NextResponse.json({ progress: data });
    } else {
      // Create new progress
      const { data, error } = await supabase
        .from('reading_progress')
        .insert(progressData)
        .select()
        .single();

      if (error) {
        console.error('Error creating reading progress:', error);
        return NextResponse.json(
          { error: 'Failed to create reading progress' },
          { status: 500 }
        );
      }

      return NextResponse.json({ progress: data }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in POST /api/reading-progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/reading-progress?text_id=xxx - Delete reading progress
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const text_id = searchParams.get('text_id');

    if (!text_id) {
      return NextResponse.json(
        { error: 'text_id is required' },
        { status: 400 }
      );
    }

    // Delete reading progress
    const { error } = await supabase
      .from('reading_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('text_id', text_id);

    if (error) {
      console.error('Error deleting reading progress:', error);
      return NextResponse.json(
        { error: 'Failed to delete reading progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/reading-progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

