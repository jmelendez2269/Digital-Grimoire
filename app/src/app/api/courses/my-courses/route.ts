import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
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

        const { user } = session;

        // 1. Fetch user's reading progress
        const { data: progressData, error: progressError } = await supabase
            .from('user_reading_progress')
            .select('text_id')
            .eq('user_id', user.id)
            .eq('completed', true);

        if (progressError) {
            throw progressError;
        }

        const completedTextIds = new Set(progressData?.map(p => p.text_id) || []);

        if (completedTextIds.size === 0) {
            return NextResponse.json({ courses: [] });
        }

        // 2. Fetch all published courses with content
        const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('*')
            .eq('is_published', true);

        if (coursesError) {
            throw coursesError;
        }

        // 3. Filter courses that have at least one completed reading
        const startedCourses = courses.filter(course => {
            if (!course.content || !course.content.weeks || !Array.isArray(course.content.weeks)) {
                return false;
            }

            // Check if any reading in this course is in the completed set
            return course.content.weeks.some((week: any) =>
                week.readings && Array.isArray(week.readings) &&
                week.readings.some((reading: any) => reading.text_id && completedTextIds.has(reading.text_id))
            );
        });

        // 4. Remove content before returning to client to save bandwidth
        const sanitizedCourses = startedCourses.map(({ content, ...course }) => course);

        return NextResponse.json({
            success: true,
            courses: sanitizedCourses
        });

    } catch (error) {
        console.error('Error fetching my courses:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
