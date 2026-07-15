import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/community/videos?search=&tags=a,b - Published videos, searchable and tag-filterable
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    let query = supabase
      .from('videos')
      .select('id, youtube_video_id, title, description, thumbnail_url, tags, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (search?.trim()) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    if (tags?.trim()) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        query = query.overlaps('tags', tagList);
      }
    }

    const { data: videos, error } = await query;
    if (error) throw error;

    const { data: allVideosForTags } = await supabase
      .from('videos')
      .select('tags')
      .eq('is_published', true);

    const allTags = Array.from(
      new Set((allVideosForTags ?? []).flatMap((row) => (Array.isArray(row.tags) ? row.tags : [])))
    ).sort();

    return NextResponse.json({ videos: videos ?? [], allTags });
  } catch (error) {
    console.error('Error in GET /api/community/videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
