import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveAuthors } from '@/lib/community/resolveAuthors';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const TOPIC_RATE_LIMIT_WINDOW_MS = 60 * 60_000;
const TOPIC_RATE_LIMIT_MAX = 5;

// GET /api/community/forum/topics?category=<slug>&search=&offset= - List topics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const search = searchParams.get('search');
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);

    let query = supabase
      .from('forum_topics')
      .select(
        'id, category_id, user_id, title, is_pinned, is_locked, is_deleted, reply_count, last_reply_at, created_at, category:forum_categories(slug, name)',
        { count: 'exact' }
      )
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('last_reply_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (categorySlug) {
      const { data: category } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();
      if (!category) {
        return NextResponse.json({ topics: [], total: 0 });
      }
      query = query.eq('category_id', category.id);
    }

    if (search?.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const authors = await resolveAuthors((data ?? []).map((t) => t.user_id));
    const topics = (data ?? []).map((t) => ({ ...t, author: authors.get(t.user_id) }));

    return NextResponse.json({ topics, total: count ?? 0 });
  } catch (error) {
    console.error('Error in GET /api/community/forum/topics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/community/forum/topics - Create a new topic
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.body === 'string' ? body.body.trim() : '';
    const categorySlug = typeof body.categorySlug === 'string' ? body.categorySlug : '';

    if (title.length < 3 || title.length > 200) {
      return NextResponse.json({ error: 'Title must be between 3 and 200 characters' }, { status: 400 });
    }
    if (content.length < 1 || content.length > 20000) {
      return NextResponse.json({ error: 'Body must be between 1 and 20000 characters' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();

    const { data: category } = await serviceSupabase
      .from('forum_categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();
    if (!category) {
      return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
    }

    const since = new Date(Date.now() - TOPIC_RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await serviceSupabase
      .from('forum_topics')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);
    if ((count ?? 0) >= TOPIC_RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'You are creating topics too quickly. Please wait a while.' },
        { status: 429 }
      );
    }

    const { data: topic, error: insertError } = await serviceSupabase
      .from('forum_topics')
      .insert({ category_id: category.id, user_id: user.id, title, body: content })
      .select('id, category_id, user_id, title, is_pinned, is_locked, reply_count, last_reply_at, created_at')
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/community/forum/topics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
