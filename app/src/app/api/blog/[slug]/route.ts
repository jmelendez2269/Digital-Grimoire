import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// GET /api/blog/[slug] - Public single published post
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, cover_image_url, tags, author_name, published_at')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('Error in GET /api/blog/[slug]:', error);
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 });
  }
}
