import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// GET /api/community/forum/categories - List forum categories with topic counts
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: categories, error } = await supabase
      .from('forum_categories')
      .select('id, slug, name, description, sort_order')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const serviceSupabase = createServiceClient();
    const counts = await Promise.all(
      (categories ?? []).map((c) =>
        serviceSupabase
          .from('forum_topics')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', c.id)
          .eq('is_deleted', false)
          .then(({ count }) => ({ id: c.id, count: count ?? 0 }))
      )
    );
    const countsById = new Map(counts.map((c) => [c.id, c.count]));

    return NextResponse.json({
      categories: (categories ?? []).map((c) => ({ ...c, topic_count: countsById.get(c.id) ?? 0 })),
    });
  } catch (error) {
    console.error('Error in GET /api/community/forum/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
