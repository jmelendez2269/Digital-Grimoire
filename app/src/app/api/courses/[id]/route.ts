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

    // Try by UUID first, fall back to slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const query = supabase
        .from('courses')
        .select(`
            *,
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
        `);
    const { data: course, error } = await (isUUID ? query.eq('id', id) : query.eq('slug', id)).single();

    if (error || !course) {
        return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, course });
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const { id: paramId } = await params;
    const { supabase, forbidden } = await getAdminUser();

    if (forbidden) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Resolve UUID if slug was provided
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
    let resolvedId = paramId;

    if (!isUUID) {
        const { data: found } = await supabase.from('courses').select('id').eq('slug', paramId).single();
        if (!found) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        resolvedId = found.id;
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
        sort_order,
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
    if (sort_order !== undefined) updates.sort_order = sort_order;

    // Handle course_texts sync if provided
    const { course_texts } = body;
    if (course_texts !== undefined) {
        // Simple sync: delete all and re-insert
        // In a production app, you might want to do a more surgical diff
        const { error: deleteError } = await supabase
            .from('course_texts')
            .delete()
            .eq('course_id', resolvedId);

        if (deleteError) {
            console.error('Error clearing old course texts:', deleteError);
            return NextResponse.json({ success: false, error: 'Failed to sync course texts' }, { status: 500 });
        }

        if (Array.isArray(course_texts) && course_texts.length > 0) {
            const toInsert = course_texts.map((ct: any) => ({
                course_id: resolvedId,
                text_id: ct.text_id,
                is_required: ct.is_required ?? true
            }));

            const { error: insertError } = await supabase
                .from('course_texts')
                .insert(toInsert);

            if (insertError) {
                console.error('Error inserting new course texts:', insertError);
                return NextResponse.json({ success: false, error: 'Failed to link new course texts' }, { status: 500 });
            }
        }
    }

    const { data: course, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', resolvedId)
        .select(`
            *,
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
    const { id: paramId } = await params;
    const { supabase, forbidden } = await getAdminUser();

    if (forbidden) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Resolve UUID if slug was provided
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
    let resolvedId = paramId;

    if (!isUUID) {
        const { data: found } = await supabase.from('courses').select('id').eq('slug', paramId).single();
        if (!found) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        resolvedId = found.id;
    }

    const { error } = await supabase.from('courses').delete().eq('id', resolvedId);

    if (error) {
        console.error('Error deleting course:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete course' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
