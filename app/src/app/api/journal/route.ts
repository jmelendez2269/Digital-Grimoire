import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/journal - List user's journal pages
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    const includeArchived = searchParams.get('include_archived') === 'true';

    // Build query
    let query = supabase
      .from('journal_pages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });

    // Filter by parent_id if provided
    if (parentId) {
      query = query.eq('parent_id', parentId);
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
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, content, parent_id, icon } = body;

    // Validate required fields
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Prepare page data
    const pageData: any = {
      user_id: session.user.id,
      title: title.trim(),
      content: content || { type: 'doc', content: [] },
      icon: icon || '📝',
    };

    // Add parent_id if provided
    if (parent_id) {
      pageData.parent_id = parent_id;
    }

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

