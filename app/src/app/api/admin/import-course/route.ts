import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCourseMarkdown } from '@/lib/parsers/course-markdown-parser';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin check
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

        // Parse the markdown
        const parseResult = parseCourseMarkdown(markdownContent);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: parseResult.error, warnings: parseResult.warnings },
                { status: 400 }
            );
        }

        const { course, warnings } = parseResult;

        // Check for slug collision
        const { data: existing } = await supabase
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

        // Insert the course
        const { data: inserted, error: insertError } = await supabase
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

        return NextResponse.json({
            success: true,
            courseId: inserted.id,
            slug: inserted.slug,
            title: inserted.title,
            weekCount: course.content.weeks.length,
            readingCount: course.content.weeks.reduce((acc, w) => acc + w.readings.length, 0),
            isPublished: publishImmediately,
            warnings,
        });

    } catch (error) {
        console.error('Unexpected error in import-course:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
