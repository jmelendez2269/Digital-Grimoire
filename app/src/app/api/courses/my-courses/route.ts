import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch enrolled courses
        const { data: enrollments, error } = await supabase
            .from('course_enrollments')
            .select('course_id, progress, current_week, courses(*)')
            .eq('user_id', user.id)
            .not('course_id', 'is', null);

        if (error) {
            console.error('Error fetching my courses:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch enrolled courses' },
                { status: 500 }
            );
        }

        // Transform data to match frontend expectation
        const courses = enrollments
            .map(enrollment => {
                if (!enrollment.courses) return null;

                // Combine course data with enrollment data if needed
                return {
                    ...enrollment.courses,
                    enrollment: {
                        progress: enrollment.progress,
                        current_week: enrollment.current_week
                    }
                };
            })
            .filter(course => course !== null);

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
