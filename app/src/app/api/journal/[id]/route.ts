import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/journal/[id] - Fetch single journal page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch page (RLS ensures user can only access their own pages)
    const { data: page, error } = await supabase
      .from('journal_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching journal page:', error);
      return NextResponse.json(
        { error: 'Failed to fetch journal page' },
        { status: 500 }
      );
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error in GET /api/journal/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/journal/[id] - Update journal page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, icon, is_archived, tags, is_pinned } = body;

    // Build update data
    const updateData: any = {};
    
    if (title !== undefined) {
      if (title.trim() === '') {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }
    
    if (content !== undefined) {
      updateData.content = content;
    }
    
    if (icon !== undefined) {
      updateData.icon = icon;
    }
    
    if (is_archived !== undefined) {
      updateData.is_archived = is_archived;
    }

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    if (is_pinned !== undefined) {
      updateData.is_pinned = is_pinned;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update page (RLS ensures user can only update their own pages)
    const { data: page, error } = await supabase
      .from('journal_pages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
        );
      }
      console.error('Error updating journal page:', error);
      return NextResponse.json(
        { error: 'Failed to update journal page' },
        { status: 500 }
      );
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error in PUT /api/journal/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/journal/[id] - Delete journal page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get query parameter to determine if we should hard delete or archive
    const { searchParams } = new URL(request.url);
    const archive = searchParams.get('archive') === 'true';

    if (archive) {
      // Soft delete (archive)
      const { error } = await supabase
        .from('journal_pages')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) {
        console.error('Error archiving journal page:', error);
        return NextResponse.json(
          { error: 'Failed to archive journal page' },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'Page archived successfully' });
    } else {
      // Hard delete
      const { error } = await supabase
        .from('journal_pages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting journal page:', error);
        return NextResponse.json(
          { error: 'Failed to delete journal page' },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'Page deleted successfully' });
    }
  } catch (error) {
    console.error('Error in DELETE /api/journal/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

