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

// GET /api/admin/videos?search= - Admin list of all synced videos
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
      .from('videos')
      .select('id, youtube_video_id, title, description, thumbnail_url, tags, is_published, published_at, synced_at')
      .order('published_at', { ascending: false });

    if (search?.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ videos: data ?? [] });
  } catch (error) {
    console.error('Error in GET /api/admin/videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
