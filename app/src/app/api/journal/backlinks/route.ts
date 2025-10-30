import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query pages owned by user that reference [[slug]]
    const pattern = `[[${slug}]]`;
    const { data, error } = await supabase
      .from('journal_pages')
      .select('id, title, slug, content')
      .eq('user_id', user.id)
      .ilike('content', `%${pattern}%`)
      .limit(20);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = (data || []).map((row) => {
      const text = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
      const idx = text.indexOf(pattern);
      const excerpt = idx >= 0 ? text.slice(Math.max(0, idx - 40), idx + pattern.length + 40) : '';
      return { id: row.id, title: row.title, slug: row.slug, excerpt };
    });

    return NextResponse.json({ backlinks: results });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch backlinks' }, { status: 500 });
  }
}


