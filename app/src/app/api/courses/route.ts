import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const searchParams = request.nextUrl.searchParams;

        // Extract query parameters
        const search = searchParams.get('search');
        const type = searchParams.get('type');
        const level = searchParams.get('level');
        const published = searchParams.get('published');

        // Build query
        let query = supabase
            .from('courses')
            .select('id, title, slug, description, premise, learning_outcomes, course_type, level, duration_weeks, is_published, created_at, updated_at')
            .order('title', { ascending: true });

        // Apply filters
        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        if (type && type !== 'all') {
            query = query.eq('course_type', type);
        }

        if (level && level !== 'all') {
            query = query.eq('level', level);
        }

        if (published === 'true') {
            query = query.eq('is_published', true);
        }

        const { data: courses, error } = await query;

        if (error) {
            console.error('Error fetching courses:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch courses' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            courses: courses || []
        });

    } catch (error) {
        console.error('Unexpected error in courses API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
