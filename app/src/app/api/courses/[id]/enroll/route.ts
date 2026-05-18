import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getCourseAccessTier, hasPaidCourseAccess } from '@/lib/courses/access';

export const dynamic = 'force-dynamic';

async function resolveCourseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  idOrSlug: string
) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug, content')
    .eq(isUUID ? 'id' : 'slug', idOrSlug)
    .single();
  return course;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: true, enrolled: false, enrollment: null });
    }

    const serviceSupabase = createServiceClient();
    const course = await resolveCourseId(serviceSupabase, idOrSlug);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const { data: enrollment } = await serviceSupabase
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
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const course = await resolveCourseId(serviceSupabase, idOrSlug);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const { data: profile } = await serviceSupabase
      .from('users')
      .select('role, subscription_status')
      .eq('id', user.id)
      .maybeSingle();

    if (getCourseAccessTier(course) === 'paid' && !hasPaidCourseAccess(profile)) {
      return NextResponse.json(
        {
          error: 'Upgrade required',
          message: 'Pre-course and taster paths are free. Upgrade to start the full class.',
          code: 'UPGRADE_REQUIRED',
        },
        { status: 402 }
      );
    }

    const { data: existing } = await serviceSupabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, enrollment: existing });
    }

    const { data: enrollment, error } = await serviceSupabase
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
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
