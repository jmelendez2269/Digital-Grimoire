import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

async function getViewer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return { user, isAdmin: profile?.role === 'admin' };
}

// PATCH /api/admin/videos/[id] - Edit tags/publish state/description for a synced video
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { isAdmin } = await getViewer(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (Array.isArray(body.tags)) {
      update.tags = body.tags.filter((tag: unknown) => typeof tag === 'string' && tag.trim().length > 0);
    }
    if (typeof body.is_published === 'boolean') {
      update.is_published = body.is_published;
    }
    if (typeof body.description === 'string') {
      update.description = body.description;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('videos')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ video: data });
  } catch (error) {
    console.error('Error in PATCH /api/admin/videos/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
