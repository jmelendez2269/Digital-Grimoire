import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCourseMarkdown } from '@/lib/parsers/course-markdown-parser';

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

    const allReadingTitles = new Set<string>();
    result.course.content.weeks.forEach((week) => {
      week.readings?.forEach((reading) => {
        if (reading.title) allReadingTitles.add(reading.title);
      });
    });

    const titles = Array.from(allReadingTitles);
    let matchedCourseTexts: Array<{
      id: string;
      text_id: string;
      is_required: boolean;
      texts: {
        id: string;
        title: string;
        author: string | null;
        cover_image_url: string | null;
      };
    }> = [];

    if (titles.length > 0) {
      const allPossibleMatches: Array<{
        id: string;
        title: string;
        author: string | null;
        cover_image_url: string | null;
      }> = [];

      for (const title of titles) {
        const { data: matches } = await supabase
          .from('texts')
          .select('id, title, author, cover_image_url')
          .or(`title.ilike.%${title}%,author.ilike.%${title}%`)
          .limit(3);

        if (matches) allPossibleMatches.push(...matches);
      }

      const uniqueMatches = Array.from(new Map(allPossibleMatches.map((match) => [match.id, match])).values());

      matchedCourseTexts = uniqueMatches.map((text) => ({
        id: `matched-${text.id}`,
        text_id: text.id,
        is_required: true,
        texts: {
          id: text.id,
          title: text.title,
          author: text.author,
          cover_image_url: text.cover_image_url,
        },
      }));
    }

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
