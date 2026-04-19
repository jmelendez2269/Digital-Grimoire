import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCourseMarkdown } from '@/lib/parsers/course-markdown-parser';
import { matchCourseTextsFromContent } from '@/lib/courses/match-course-texts';

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
    const { markdownContent } = body;

    if (!markdownContent || typeof markdownContent !== 'string') {
      return NextResponse.json(
        { error: 'markdownContent is required and must be a string' },
        { status: 400 }
      );
    }

    const result = parseCourseMarkdown(markdownContent);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, warnings: result.warnings },
        { status: 400 }
      );
    }

    const matchedCourseTexts = await matchCourseTextsFromContent(supabase, result.course.content);

    return NextResponse.json({
      success: true,
      course: result.course,
      course_texts: matchedCourseTexts,
      warnings: result.warnings ?? [],
    });
  } catch (error) {
    console.error('Error parsing course markdown:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
