import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

async function getAdminUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { supabase, user: null, forbidden: true };

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    return { supabase, user, forbidden: profile?.role !== 'admin' };
}

export async function GET(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !course) {
        return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, course });
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const { supabase, forbidden } = await getAdminUser();

    if (forbidden) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (premise !== undefined) updates.premise = premise;
    if (learning_outcomes !== undefined) updates.learning_outcomes = learning_outcomes;
    if (course_type !== undefined) updates.course_type = course_type;
    if (level !== undefined) updates.level = level;
    if (duration_weeks !== undefined) updates.duration_weeks = duration_weeks;
    if (content !== undefined) updates.content = content;
    if (is_published !== undefined) updates.is_published = is_published;

    const { data: course, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'Slug already in use', code: 'SLUG_CONFLICT' }, { status: 409 });
        }
        console.error('Error updating course:', error);
        return NextResponse.json({ success: false, error: 'Failed to update course' }, { status: 500 });
    }

    return NextResponse.json({ success: true, course });
}

export async function DELETE(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const { supabase, forbidden } = await getAdminUser();

    if (forbidden) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase.from('courses').delete().eq('id', id);

    if (error) {
        console.error('Error deleting course:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete course' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
