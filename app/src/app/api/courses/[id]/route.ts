import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sanitizeCourseForPreview } from '@/lib/courses/access';
import { matchCourseTextsFromContent } from '@/lib/courses/match-course-texts';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { supabase, user: null, forbidden: true };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return { supabase, user, forbidden: profile?.role !== 'admin' };
}

async function getViewer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return { user, isAdmin: profile?.role === 'admin' };
}

async function isEnrolled(
  serviceSupabase: ReturnType<typeof createServiceClient>,
  userId: string,
  courseId: string
) {
  const { data } = await serviceSupabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  return !!data;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const viewer = await getViewer(supabase);
  const wantsFullAccess = request.nextUrl.searchParams.get('access') === 'full';

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const query = serviceSupabase
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

  const { data: course, error } = await (isUUID ? query.eq('id', id) : query.eq('slug', id)).maybeSingle();

  if (error || !course) {
    return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  }

  if (!course.is_published && !viewer.isAdmin) {
    return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  }

  const enrichedCourse = Array.isArray(course.course_texts) && course.course_texts.length > 0
    ? course
    : {
        ...course,
        course_texts: await matchCourseTextsFromContent(
          serviceSupabase,
          (course.content as Record<string, unknown> | null) ?? null
        ),
      };

  const enrolled = viewer.user
    ? await isEnrolled(serviceSupabase, viewer.user.id, String(course.id))
    : false;
  const canViewFullCourse = viewer.isAdmin || enrolled;

  if (wantsFullAccess && !canViewFullCourse) {
    return NextResponse.json(
      {
        success: false,
        error: viewer.user ? 'Enrollment required' : 'Unauthorized',
        code: viewer.user ? 'ENROLLMENT_REQUIRED' : 'AUTH_REQUIRED',
      },
      { status: viewer.user ? 403 : 401 }
    );
  }

  const coursePayload = viewer.isAdmin || (wantsFullAccess && canViewFullCourse)
    ? enrichedCourse
    : sanitizeCourseForPreview(enrichedCourse);

  return NextResponse.json(
    {
      success: true,
      course: coursePayload,
      access: {
        full: coursePayload === enrichedCourse,
        enrolled,
        admin: viewer.isAdmin,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    }
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const { id: paramId } = await params;
    const { supabase, forbidden } = await getAdminUser();

    if (forbidden) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const serviceSupabase = createServiceClient();

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
    let resolvedId = paramId;

    if (!isUUID) {
        const { data: found } = await serviceSupabase.from('courses').select('id').eq('slug', paramId).single();
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

  const { course_texts } = body;
  if (course_texts !== undefined) {
        const { error: deleteError } = await serviceSupabase
            .from('course_texts')
            .delete()
            .eq('course_id', resolvedId);

    if (deleteError) {
      console.error('Error clearing old course texts:', deleteError);
      return NextResponse.json({ success: false, error: 'Failed to sync course texts' }, { status: 500 });
    }

    if (Array.isArray(course_texts) && course_texts.length > 0) {
      const toInsert = course_texts.map((ct: { text_id: string; is_required?: boolean }) => ({
        course_id: resolvedId,
        text_id: ct.text_id,
        is_required: ct.is_required ?? true,
      }));

            const { error: insertError } = await serviceSupabase.from('course_texts').insert(toInsert);

      if (insertError) {
        console.error('Error inserting new course texts:', insertError);
        return NextResponse.json({ success: false, error: 'Failed to link new course texts' }, { status: 500 });
      }
    }
  }

    const { data: course, error } = await serviceSupabase
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

export async function DELETE(_request: NextRequest, { params }: Params) {
    const { id: paramId } = await params;
    const { supabase, forbidden } = await getAdminUser();

    if (forbidden) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const serviceSupabase = createServiceClient();

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
    let resolvedId = paramId;

    if (!isUUID) {
        const { data: found } = await serviceSupabase.from('courses').select('id').eq('slug', paramId).single();
        if (!found) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        resolvedId = found.id;
    }

    const { error } = await serviceSupabase.from('courses').delete().eq('id', resolvedId);

  if (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete course' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
