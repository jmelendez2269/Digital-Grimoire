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

        // Build query — include content so catalog can read arc, core_question, key_tensions etc.
        let query = supabase
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
            .order('sort_order', { ascending: true })
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
        const {
            title,
            slug,
            description,
            premise,
            learning_outcomes,
            course_type,
            level,
            duration_weeks,
            content,
            is_published,
        } = body;

        if (!title || !slug) {
            return NextResponse.json(
                { success: false, error: 'title and slug are required' },
                { status: 400 }
            );
        }

        const { data: course, error } = await supabase
            .from('courses')
            .insert({
                title,
                slug,
                description: description || null,
                premise: premise || null,
                learning_outcomes: learning_outcomes || [],
                course_type: course_type || 'foundational',
                level: level || 'foundational',
                duration_weeks: duration_weeks || 8,
                content: content || {},
                is_published: is_published ?? false,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating course:', error);
            if (error.code === '23505') {
                return NextResponse.json(
                    { success: false, error: 'A course with this slug already exists', code: 'SLUG_CONFLICT' },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { success: false, error: 'Failed to create course' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, course }, { status: 201 });

    } catch (error) {
        console.error('Unexpected error in courses POST:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
