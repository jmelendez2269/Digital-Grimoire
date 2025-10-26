import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/bookmarks - Get all bookmarks for the current user
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

    // Get bookmarks with text details
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select(`
        id,
        text_id,
        notes,
        created_at,
        texts (
          id,
          title,
          author,
          year,
          type,
          domain,
          tags,
          status,
          file_size,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookmarks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmarks: data || [] });
  } catch (error) {
    console.error('Error in GET /api/bookmarks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/bookmarks - Add a bookmark
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
    const { text_id, notes } = body;

    if (!text_id) {
      return NextResponse.json(
        { error: 'text_id is required' },
        { status: 400 }
      );
    }

    // Check if bookmark already exists
    const { data: existing } = await supabase
      .from('user_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('text_id', text_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Bookmark already exists' },
        { status: 409 }
      );
    }

    // Create bookmark
    const { data, error } = await supabase
      .from('user_bookmarks')
      .insert({
        user_id: user.id,
        text_id,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bookmark:', error);
      return NextResponse.json(
        { error: 'Failed to create bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmark: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/bookmarks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookmarks - Remove a bookmark
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

    // Delete bookmark
    const { error } = await supabase
      .from('user_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('text_id', text_id);

    if (error) {
      console.error('Error deleting bookmark:', error);
      return NextResponse.json(
        { error: 'Failed to delete bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/bookmarks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

