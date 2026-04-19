import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { parseCourseMarkdown } from '@/lib/parsers/course-markdown-parser';
import { matchCourseTextsFromContent } from '@/lib/courses/match-course-texts';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { markdownContent, publishImmediately = false } = body;

    if (!markdownContent || typeof markdownContent !== 'string') {
      return NextResponse.json(
        { error: 'markdownContent is required and must be a string' },
        { status: 400 }
      );
    }

    const parseResult = parseCourseMarkdown(markdownContent);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error, warnings: parseResult.warnings },
        { status: 400 }
      );
    }

    const { course, warnings } = parseResult;

    const serviceSupabase = createServiceClient();

    const { data: existing } = await serviceSupabase
      .from('courses')
      .select('id, slug')
      .eq('slug', course.slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: 'A course with this slug already exists',
          code: 'SLUG_CONFLICT',
          existingSlug: existing.slug,
          existingId: existing.id,
          warnings,
        },
        { status: 409 }
      );
    }

    const { data: inserted, error: insertError } = await serviceSupabase
      .from('courses')
      .insert({
        title: course.title,
        slug: course.slug,
        description: course.description || null,
        premise: course.premise || null,
        learning_outcomes: course.learning_outcomes,
        course_type: course.course_type,
        level: course.level,
        duration_weeks: course.duration_weeks,
        content: course.content,
        is_published: publishImmediately,
      })
      .select('id, slug, title')
      .single();

    if (insertError) {
      console.error('[Import Course] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save course to database', details: insertError.message },
        { status: 500 }
      );
    }

    const matchedCourseTexts = await matchCourseTextsFromContent(serviceSupabase, course.content);

    if (matchedCourseTexts.length > 0) {
      const { error: courseTextsError } = await serviceSupabase.from('course_texts').insert(
        matchedCourseTexts.map((text) => ({
          course_id: inserted.id,
          text_id: text.text_id,
          is_required: text.is_required,
        }))
      );

      if (courseTextsError) {
        console.error('[Import Course] Failed to link course texts:', courseTextsError);
      }
    }

    return NextResponse.json({
      success: true,
      courseId: inserted.id,
      slug: inserted.slug,
      title: inserted.title,
      weekCount: course.content.weeks.length,
      readingCount: course.content.weeks.reduce((acc, week) => acc + week.readings.length, 0),
      matchedTextCount: matchedCourseTexts.length,
      isPublished: publishImmediately,
      warnings,
    });
  } catch (error) {
    console.error('Unexpected error in import-course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
