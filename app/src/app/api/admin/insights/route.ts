import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user : null;
}

// GET /api/admin/insights — list all insights (admin)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!await requireAdmin(supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('daily_insights')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ insights: data });
}

// POST /api/admin/insights — create one insight, or seed from library with ?action=seed
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const action = request.nextUrl.searchParams.get('action');

    // Allow internal seed calls via secret header (no user session needed)
    const internalSecret = process.env.INTERNAL_SEED_SECRET;
    const isInternalSeed = action === 'seed'
      && internalSecret
      && request.headers.get('x-internal-seed') === internalSecret;

    if (!isInternalSeed && !await requireAdmin(supabase)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'seed') {
      return seedFromLibrary(supabase);
    }

    const body = await request.json();
    const { title, hook, source_type, source_id, concept_search_terms, blog_slug, library_text_id, display_order } = body;

    if (!title || !hook) {
      return NextResponse.json({ error: 'title and hook are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('daily_insights')
      .insert({ title, hook, source_type, source_id, concept_search_terms, blog_slug, library_text_id, display_order: display_order ?? 0 })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ insight: data }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/admin/insights threw:', err);
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 });
  }
}

// PATCH /api/admin/insights — update fields (including toggling is_active)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!await requireAdmin(supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('daily_insights')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ insight: data });
}

// DELETE /api/admin/insights — delete by id (passed as ?id=...)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  if (!await requireAdmin(supabase)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase.from('daily_insights').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// Seed helper — pulls compelling passages from text_chunks joined to texts
// ---------------------------------------------------------------------------
async function seedFromLibrary(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Pull chunks that are long enough to be substantive but not too long for a hook.
  // We order randomly via a workaround (order by id which is UUID — imperfect but
  // avoids an RPC just for this), grabbing a larger pool then trimming client-side.
  const { data: chunks, error } = await supabase
    .from('text_chunks')
    .select('id, text_id, content, chunk_index')
    .not('content', 'is', null)
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ error: 'No text chunks found in the library' }, { status: 404 });
  }

  // Filter: keep chunks whose content is 80–800 chars (quote-worthy length)
  // Fall back to a wider range if the library uses longer chunks
  let candidates = chunks.filter((c) => {
    const len = c.content?.trim().length ?? 0;
    return len >= 80 && len <= 800;
  });

  if (candidates.length === 0) {
    // Wider fallback: any chunk with at least 60 chars
    candidates = chunks.filter((c) => (c.content?.trim().length ?? 0) >= 60);
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: 'No suitable passages found in the library' }, { status: 404 });
  }

  // Fetch titles for the source texts
  const textIds = [...new Set(candidates.map((c) => c.text_id).filter(Boolean))];
  const { data: texts } = await supabase
    .from('texts')
    .select('id, title, author')
    .in('id', textIds);

  const textMap = new Map((texts ?? []).map((t) => [t.id, t]));

  // Shuffle and take up to 20 unique text sources
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const seenTextIds = new Set<string>();
  const selected: typeof candidates = [];

  for (const chunk of shuffled) {
    if (seenTextIds.has(chunk.text_id)) continue;
    seenTextIds.add(chunk.text_id);
    selected.push(chunk);
    if (selected.length >= 20) break;
  }

  const rows = selected.map((chunk) => {
    const text = textMap.get(chunk.text_id);
    const authorPart = text?.author ? ` — ${text.author}` : '';
    const hook = chunk.content.trim();
    const title = text?.title
      ? `From: ${text.title}${authorPart}`
      : 'Library Passage';

    return {
      title,
      hook,
      source_type: 'text' as const,
      source_id: chunk.text_id ?? null,
      library_text_id: chunk.text_id ?? null,
      concept_search_terms: [],
      is_active: true,
      display_order: 0,
    };
  });

  const { data: inserted, error: insertError } = await supabase
    .from('daily_insights')
    .insert(rows)
    .select('id, title');

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ seeded: inserted?.length ?? 0, insights: inserted });
}
