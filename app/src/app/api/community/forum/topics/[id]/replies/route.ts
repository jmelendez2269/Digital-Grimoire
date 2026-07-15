import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveAuthors } from '@/lib/community/resolveAuthors';

export const dynamic = 'force-dynamic';

const REPLY_RATE_LIMIT_WINDOW_MS = 60_000;
const REPLY_RATE_LIMIT_MAX = 10;

// GET /api/community/forum/topics/[id]/replies - List replies for a topic
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: topicId } = await params;
    const { data, error } = await supabase
      .from('forum_replies')
      .select('id, topic_id, user_id, body, created_at, updated_at')
      .eq('topic_id', topicId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const authors = await resolveAuthors((data ?? []).map((r) => r.user_id));
    const replies = (data ?? []).map((r) => ({ ...r, author: authors.get(r.user_id) }));

    return NextResponse.json({ replies });
  } catch (error) {
    console.error('Error in GET /api/community/forum/topics/[id]/replies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/community/forum/topics/[id]/replies - Reply to a topic
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: topicId } = await params;
    const body = await request.json();
    const content = typeof body.body === 'string' ? body.body.trim() : '';
    if (content.length < 1 || content.length > 10000) {
      return NextResponse.json({ error: 'Reply must be between 1 and 10000 characters' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();

    const { data: topic } = await serviceSupabase
      .from('forum_topics')
      .select('id, is_locked, is_deleted')
      .eq('id', topicId)
      .maybeSingle();
    if (!topic || topic.is_deleted) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    if (topic.is_locked) {
      return NextResponse.json({ error: 'This topic is locked' }, { status: 403 });
    }

    const since = new Date(Date.now() - REPLY_RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await serviceSupabase
      .from('forum_replies')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);
    if ((count ?? 0) >= REPLY_RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'You are replying too quickly. Please wait a moment.' },
        { status: 429 }
      );
    }

    const { data: reply, error: insertError } = await serviceSupabase
      .from('forum_replies')
      .insert({ topic_id: topicId, user_id: user.id, body: content })
      .select('id, topic_id, user_id, body, created_at, updated_at')
      .single();
    if (insertError) throw insertError;

    const author = {
      name:
        user.user_metadata?.display_name?.trim() ||
        user.user_metadata?.username?.trim() ||
        `Member ${user.id.slice(0, 8)}`,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    };

    return NextResponse.json({ reply: { ...reply, author } }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/community/forum/topics/[id]/replies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
