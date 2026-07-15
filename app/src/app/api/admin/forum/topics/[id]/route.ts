import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getViewer } from '@/lib/community/getViewer';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/forum/topics/[id] - Admin-only pin/lock moderation
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

    if (typeof body.is_pinned === 'boolean') update.is_pinned = body.is_pinned;
    if (typeof body.is_locked === 'boolean') update.is_locked = body.is_locked;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const { data: topic, error } = await serviceSupabase
      .from('forum_topics')
      .update(update)
      .eq('id', id)
      .select('id, is_pinned, is_locked')
      .single();
    if (error) throw error;

    return NextResponse.json({ topic });
  } catch (error) {
    console.error('Error in PATCH /api/admin/forum/topics/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
