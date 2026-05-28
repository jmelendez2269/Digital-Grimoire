import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const urls: unknown = body?.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ matches: {} });
    }

    const normalized = Array.from(
      new Set(
        urls
          .filter((u): u is string => typeof u === 'string' && u.length > 0)
          .map((u) => stripUrlHash(u))
      )
    );

    if (normalized.length === 0) {
      return NextResponse.json({ matches: {} });
    }

    const { data, error } = await supabase
      .from('texts')
      .select('id, title, metadata')
      .in('metadata->>sourceUrl', normalized);

    if (error) {
      console.error('[by-source-urls] Database error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    const matches: Record<string, { id: string; title: string | null }> = {};
    for (const row of data || []) {
      const sourceUrl = (row.metadata as any)?.sourceUrl;
      if (typeof sourceUrl === 'string' && sourceUrl.length > 0) {
        const key = stripUrlHash(sourceUrl);
        if (!matches[key]) {
          matches[key] = { id: row.id, title: row.title };
        }
      }
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('[by-source-urls] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function stripUrlHash(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}
