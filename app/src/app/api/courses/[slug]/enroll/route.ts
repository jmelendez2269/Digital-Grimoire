import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            // Not logged in — return unenrolled state, not an error
            return NextResponse.json({ success: true, enrolled: false, enrollment: null });
        }

        const { data: course } = await supabase
            .from('courses')
            .select('id')
            .eq('slug', slug)
            .single();

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', course.id)
            .maybeSingle();

        return NextResponse.json({
            success: true,
            enrolled: !!enrollment,
            enrollment: enrollment || null,
        });

    } catch (error) {
        console.error('Unexpected error in enroll GET:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: course } = await supabase
            .from('courses')
            .select('id, title')
            .eq('slug', slug)
            .single();

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // Check if already enrolled first (upsert with ignoreDuplicates won't return existing row)
        const { data: existing } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', course.id)
            .maybeSingle();

        if (existing) {
            // Already enrolled — return existing enrollment without resetting progress
            return NextResponse.json({ success: true, enrollment: existing });
        }

        // Create new enrollment
        const { data: enrollment, error } = await supabase
            .from('course_enrollments')
            .insert({
                user_id: user.id,
                course_id: course.id,
                current_week: 1,
                progress: {},
            })
            .select()
            .single();

        if (error) {
            console.error('[Enroll API] Insert error:', error);
            return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
        }

        return NextResponse.json({ success: true, enrollment }, { status: 201 });

    } catch (error) {
        console.error('Unexpected error in enroll POST:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
