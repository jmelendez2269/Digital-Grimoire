import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API] Course Fetch Start');
    const supabase = await createClient();
    console.log('[API] Supabase Client Created');

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.error('[API] Auth Error:', authError);
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }

    if (!session) {
      console.log('[API] No Session');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const courseId = id;
    console.log('[API] Check Course ID:', courseId);

    // Try to fetch by ID first, then by slug
    let query = supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    let { data: course, error: queryError } = await query;

    // If not found by ID, try by slug
    if (queryError || !course) {
      console.log('[API] ID lookup failed, trying slug:', queryError?.message);
      query = supabase
        .from('courses')
        .select('*')
        .eq('slug', courseId)
        .single();

      const { data: courseBySlug, error: slugError } = await query;

      if (slugError || !courseBySlug) {
        console.log('[API] Slug lookup failed:', slugError?.message);
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

    console.log('[API] Course found, starting enrichment');

    // ENRICHMENT: Fetch fresh text details for readings
    if (course.content && course.content.weeks && Array.isArray(course.content.weeks)) {
      try {
        const textIds = new Set<string>();
        course.content.weeks.forEach((week: any) => {
          if (week.readings && Array.isArray(week.readings)) {
            week.readings.forEach((reading: any) => {
              if (reading.text_id) {
                textIds.add(reading.text_id);
              }
            });
          }
        });

        if (textIds.size > 0) {
          console.log(`[API] Enriching ${textIds.size} texts`);
          const { data: texts, error: textsError } = await supabase
            .from('texts')
            .select('id, title, author')
            .in('id', Array.from(textIds));

          if (!textsError && texts) {
            const textMap = new Map(texts.map(t => [t.id, t]));

            // Update course content with fresh data
            course.content.weeks = course.content.weeks.map((week: any) => ({
              ...week,
              readings: (week.readings || []).map((reading: any) => {
                if (reading.text_id && textMap.has(reading.text_id)) {
                  const textInfo = textMap.get(reading.text_id);
                  return {
                    ...reading,
                    title: textInfo?.title || reading.title,
                    author: textInfo?.author || reading.author, // Add author if needed by UI
                    // Keep other fields like notes
                  };
                }
                return reading;
              })
            }));
          } else if (textsError) {
            console.error('Error fetching texts for enrichment:', textsError);
          }
        }
      } catch (enrichError) {
        console.error('Error enriching course content:', enrichError);
        // Continue without enrichment if it fails
      }
    }

    console.log('[API] Course fetch success');
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const json = await request.json();

    // Fields allowed to update
    const allowedFields = [
      'title', 'slug', 'description', 'premise',
      'course_type', 'level', 'is_published',
      'content', 'cover_image', 'thumbnail_image'
    ];

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    allowedFields.forEach(field => {
      if (json[field] !== undefined) {
        updates[field] = json[field];
      }
    });

    const { data: course, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);
      return NextResponse.json(
        { error: 'Failed to update course', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      course
    });

  } catch (error) {
    console.error('Unexpected error in updating course:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
