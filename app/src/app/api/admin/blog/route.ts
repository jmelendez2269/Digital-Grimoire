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

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET /api/admin/blog?search= - Admin list of all posts (published + drafts)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { isAdmin } = await getViewer(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const serviceSupabase = createServiceClient();
    let query = serviceSupabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, cover_image_url, tags, author_name, is_published, published_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (search?.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ posts: data ?? [] });
  } catch (error) {
    console.error('Error in GET /api/admin/blog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/blog - Create a new post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { isAdmin } = await getViewer(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content : '';

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const slug = typeof body.slug === 'string' && body.slug.trim() ? slugify(body.slug) : slugify(title);
    if (!slug) {
      return NextResponse.json({ error: 'Could not derive a valid slug' }, { status: 400 });
    }

    const isPublished = body.is_published === true;
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t: unknown) => typeof t === 'string' && t.trim().length > 0)
      : [];

    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('blog_posts')
      .insert({
        slug,
        title,
        excerpt: typeof body.excerpt === 'string' ? body.excerpt : null,
        content,
        cover_image_url: typeof body.cover_image_url === 'string' ? body.cover_image_url : null,
        tags,
        author_name: typeof body.author_name === 'string' && body.author_name.trim() ? body.author_name.trim() : 'Prismarium',
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/blog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
