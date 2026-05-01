import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sanitizeCourseForPreview } from '@/lib/courses/access';
import { matchCourseTextsFromContent } from '@/lib/courses/match-course-texts';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const serviceSupabase = createServiceClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: enrollments, error } = await supabase
            .from('course_enrollments')
            .select('course_id, progress, current_week')
            .eq('user_id', user.id)
            .not('course_id', 'is', null);

        if (error) {
            console.error('Error fetching my courses:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch enrolled courses' },
                { status: 500 }
            );
        }

        const courseIds = (enrollments || [])
            .map((enrollment) => enrollment.course_id)
            .filter((courseId): courseId is string => typeof courseId === 'string');

        if (courseIds.length === 0) {
            return NextResponse.json({ success: true, courses: [] });
        }

        const { data: coursesData, error: coursesError } = await serviceSupabase
            .from('courses')
            .select(`
                id, title, slug, description, premise, learning_outcomes, course_type, level, duration_weeks, is_published, content, sort_order, created_at, updated_at,
                course_texts(
                    id,
                    text_id,
                    is_required,
                    texts(
                        id,
                        title,
                        author,
                        cover_image_url
                    )
                )
            `)
            .in('id', courseIds)
            .eq('is_published', true);

        if (coursesError) {
            console.error('Error fetching enrolled course data:', coursesError);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch enrolled courses' },
                { status: 500 }
            );
        }

        const enrichedCourses = await Promise.all(
            (coursesData || []).map(async (course: Record<string, unknown>) => {
                const existingCourseTexts = Array.isArray(course.course_texts) ? course.course_texts : [];
                if (existingCourseTexts.length > 0) return course;

                return {
                    ...course,
                    course_texts: await matchCourseTextsFromContent(
                        serviceSupabase,
                        (course.content as Record<string, unknown> | null) ?? null
                    ),
                };
            })
        );

        const courseMap = new Map(enrichedCourses.map((course) => [course.id, course]));

        const courses = (enrollments || [])
            .map((enrollment) => {
                const course = courseMap.get(enrollment.course_id);
                if (!course) return null;

                return {
                    ...sanitizeCourseForPreview(course),
                    enrollment: {
                        progress: enrollment.progress,
                        current_week: enrollment.current_week
                    }
                };
            })
            .filter((course) => course !== null);

        return NextResponse.json({
            success: true,
            courses
        });

    } catch (error) {
        console.error('Unexpected error in my-courses API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
