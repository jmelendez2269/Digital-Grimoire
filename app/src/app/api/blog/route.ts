import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// GET /api/blog?tag= - Public list of published posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');

    const supabase = createServiceClient();
    let query = supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, cover_image_url, tags, author_name, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (tag?.trim()) {
      query = query.contains('tags', [tag.trim()]);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ posts: data ?? [] });
  } catch (error) {
    console.error('Error in GET /api/blog:', error);
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}
