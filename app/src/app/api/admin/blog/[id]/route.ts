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

// GET /api/admin/blog/[id] - Fetch a single post (including draft) for editing
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { isAdmin } = await getViewer(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('Error in GET /api/admin/blog/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/blog/[id] - Update a post (edit fields, toggle publish)
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

    if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim();
    if (typeof body.slug === 'string' && body.slug.trim()) update.slug = slugify(body.slug);
    if (typeof body.excerpt === 'string') update.excerpt = body.excerpt;
    if (typeof body.content === 'string' && body.content.trim()) update.content = body.content;
    if (typeof body.cover_image_url === 'string') update.cover_image_url = body.cover_image_url;
    if (typeof body.author_name === 'string' && body.author_name.trim()) update.author_name = body.author_name.trim();
    if (Array.isArray(body.tags)) {
      update.tags = body.tags.filter((t: unknown) => typeof t === 'string' && t.trim().length > 0);
    }

    if (typeof body.is_published === 'boolean') {
      update.is_published = body.is_published;
      if (body.is_published) {
        const serviceSupabase = createServiceClient();
        const { data: existing } = await serviceSupabase
          .from('blog_posts')
          .select('published_at')
          .eq('id', id)
          .maybeSingle();
        if (!existing?.published_at) {
          update.published_at = new Date().toISOString();
        }
      }
    }

    update.updated_at = new Date().toISOString();

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('blog_posts')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('Error in PATCH /api/admin/blog/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/blog/[id] - Delete a post
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { isAdmin } = await getViewer(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const serviceSupabase = createServiceClient();
    const { error } = await serviceSupabase.from('blog_posts').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/blog/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
