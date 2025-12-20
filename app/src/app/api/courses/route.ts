import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const courseType = searchParams.get('type'); // foundational, theme, rotation
    const level = searchParams.get('level'); // foundational, intermediate, advanced
    const published = searchParams.get('published'); // true, false, or all

    // Build query
    let query = supabase
      .from('courses')
      .select('*', { count: 'exact' } as any) as any;

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,premise.ilike.%${search}%`);
    }

    // Apply course type filter
    if (courseType && courseType !== 'all') {
      query = query.eq('course_type', courseType);
    }

    // Apply level filter
    if (level && level !== 'all') {
      query = query.eq('level', level);
    }

    // Apply published filter
    if (published === 'true') {
      query = query.eq('is_published', true);
    } else if (published === 'false') {
      query = query.eq('is_published', false);
    }
    // If published is 'all' or not specified, show all

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data: courses, error: queryError, count } = await query;

    if (queryError) {
      console.error('Error fetching courses:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch courses', details: queryError.message },
        { status: 500 }
      );
    }

    // Remove content field from listing (it's large and not needed for cards)
    // Content should only be fetched on the detail page
    const coursesWithoutContent = (courses || []).map(({ content, ...course }) => course);

    return NextResponse.json({
      success: true,
      courses: coursesWithoutContent,
      total: count || 0,
    });
  } catch (error) {
    console.error('Unexpected error in courses API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
