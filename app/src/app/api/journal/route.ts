import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/journal - List user's journal pages
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    const includeArchived = searchParams.get('include_archived') === 'true';
    const courseId = searchParams.get('course_id');
    const entryType = searchParams.get('entry_type');
    const pinnedOnly = searchParams.get('pinned') === 'true';

    // Build query
    let query = supabase
      .from('journal_pages')
      .select('id, title, icon, is_archived, created_at, updated_at, parent_id, user_id, course_id, week_number, entry_type, artifact_name, tags, is_pinned')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // Filter by parent_id if provided
    if (parentId) {
      query = query.eq('parent_id', parentId);
    }

    // Filter by course_id (workbook mode)
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    // Filter by entry_type
    if (entryType) {
      // Support comma-separated entry types: ?entry_type=synthesis,capstone
      const types = entryType.split(',').map(t => t.trim());
      if (types.length === 1) {
        query = query.eq('entry_type', types[0]);
      } else {
        query = query.in('entry_type', types);
      }
    }

    // Filter pinned only
    if (pinnedOnly) {
      query = query.eq('is_pinned', true);
    }

    // Filter archived pages
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data: pages, error } = await query;

    if (error) {
      console.error('Error fetching journal pages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch journal pages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error in GET /api/journal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/journal - Create new journal page
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { title, content, parent_id, icon, course_id, week_number, entry_type, artifact_name, tags, is_pinned } = body;

    // Validate required fields
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate entry_type if provided
    const validEntryTypes = ['free', 'lens_exercise', 'synthesis', 'note', 'capstone'];
    if (entry_type && !validEntryTypes.includes(entry_type)) {
      return NextResponse.json(
        { error: `Invalid entry_type. Must be one of: ${validEntryTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare page data
    const pageData: any = {
      user_id: user.id,
      title: title.trim(),
      content: content || { type: 'doc', content: [] },
      icon: icon || '📝',
    };

    // Add parent_id if provided
    if (parent_id) {
      pageData.parent_id = parent_id;
    }

    // Add workbook/course fields if provided
    if (course_id) pageData.course_id = course_id;
    if (week_number !== undefined && week_number !== null) pageData.week_number = week_number;
    if (entry_type) pageData.entry_type = entry_type;
    if (artifact_name) pageData.artifact_name = artifact_name;
    if (tags) pageData.tags = tags;
    if (is_pinned !== undefined) pageData.is_pinned = is_pinned;

    // Create page
    const { data: page, error } = await supabase
      .from('journal_pages')
      .insert(pageData)
      .select()
      .single();

    if (error) {
      console.error('Error creating journal page:', error);
      return NextResponse.json(
        { error: 'Failed to create journal page' },
        { status: 500 }
      );
    }

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/journal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

