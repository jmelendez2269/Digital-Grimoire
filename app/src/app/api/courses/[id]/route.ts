import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const courseId = id;

    // Try to fetch by ID first, then by slug
    let query = supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    let { data: course, error: queryError } = await query;

    // If not found by ID, try by slug
    if (queryError || !course) {
      query = supabase
        .from('courses')
        .select('*')
        .eq('slug', courseId)
        .single();

      const { data: courseBySlug, error: slugError } = await query;
      
      if (slugError || !courseBySlug) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Course not found',
            details: queryError?.message || slugError?.message 
          },
          { status: 404 }
        );
      }
      
      course = courseBySlug;
    }

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error('Unexpected error in course API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
