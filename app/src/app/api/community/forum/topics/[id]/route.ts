import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getViewer } from '@/lib/community/getViewer';
import { resolveAuthors } from '@/lib/community/resolveAuthors';

export const dynamic = 'force-dynamic';

// GET /api/community/forum/topics/[id] - Topic detail
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { data: topic, error } = await supabase
      .from('forum_topics')
      .select('id, category_id, user_id, title, body, is_pinned, is_locked, is_deleted, reply_count, last_reply_at, created_at, updated_at, category:forum_categories(slug, name)')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const authors = await resolveAuthors([topic.user_id]);
    return NextResponse.json({ topic: { ...topic, author: authors.get(topic.user_id) } });
  } catch (error) {
    console.error('Error in GET /api/community/forum/topics/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/community/forum/topics/[id] - Owner edits title/body, or soft-deletes their own topic
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { user, isAdmin } = await getViewer(supabase);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const serviceSupabase = createServiceClient();

    const { data: existing } = await serviceSupabase
      .from('forum_topics')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    if (existing.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (title.length < 3 || title.length > 200) {
        return NextResponse.json({ error: 'Title must be between 3 and 200 characters' }, { status: 400 });
      }
      update.title = title;
    }
    if (typeof body.body === 'string') {
      const content = body.body.trim();
      if (content.length < 1 || content.length > 20000) {
        return NextResponse.json({ error: 'Body must be between 1 and 20000 characters' }, { status: 400 });
      }
      update.body = content;
    }
    if (typeof body.is_deleted === 'boolean') {
      update.is_deleted = body.is_deleted;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: topic, error } = await serviceSupabase
      .from('forum_topics')
      .update(update)
      .eq('id', id)
      .select('id, category_id, user_id, title, body, is_pinned, is_locked, is_deleted, reply_count, last_reply_at, created_at, updated_at')
      .single();
    if (error) throw error;

    return NextResponse.json({ topic });
  } catch (error) {
    console.error('Error in PATCH /api/community/forum/topics/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
