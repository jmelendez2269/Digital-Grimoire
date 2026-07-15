import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getViewer } from '@/lib/community/getViewer';

export const dynamic = 'force-dynamic';

// PATCH /api/community/forum/topics/[id]/replies/[replyId] - Owner edits or soft-deletes their reply
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const supabase = await createClient();
    const { user, isAdmin } = await getViewer(supabase);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { replyId } = await params;
    const serviceSupabase = createServiceClient();

    const { data: existing } = await serviceSupabase
      .from('forum_replies')
      .select('user_id')
      .eq('id', replyId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }
    if (existing.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (typeof body.body === 'string') {
      const content = body.body.trim();
      if (content.length < 1 || content.length > 10000) {
        return NextResponse.json({ error: 'Reply must be between 1 and 10000 characters' }, { status: 400 });
      }
      update.body = content;
    }
    if (typeof body.is_deleted === 'boolean') {
      update.is_deleted = body.is_deleted;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: reply, error } = await serviceSupabase
      .from('forum_replies')
      .update(update)
      .eq('id', replyId)
      .select('id, topic_id, user_id, body, is_deleted, created_at, updated_at')
      .single();
    if (error) throw error;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error in PATCH /api/community/forum/topics/[id]/replies/[replyId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
