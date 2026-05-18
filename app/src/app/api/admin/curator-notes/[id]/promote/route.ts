import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing text id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = createServiceClient();

  // Read the current draft fields so we can promote them.
  const { data: current, error: fetchError } = await service
    .from('texts')
    .select('curator_note_draft,long_summary_draft,related_texts,curator_note_status')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    console.error('[admin curator-notes promote] fetch error:', fetchError);
    return NextResponse.json({ error: 'Text not found' }, { status: 404 });
  }

  if (current.curator_note_status !== 'draft_pending') {
    return NextResponse.json({ error: 'No pending draft to promote' }, { status: 409 });
  }
  if (!current.curator_note_draft) {
    return NextResponse.json({ error: 'Draft is empty; cannot promote' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    curator_note: current.curator_note_draft,
    curator_note_draft: null,
    curator_note_status: 'live',
    curator_note_reviewed_at: new Date().toISOString(),
    curator_note_reviewed_by: user.id,
  };
  if (current.long_summary_draft) {
    update.long_summary = current.long_summary_draft;
    update.long_summary_draft = null;
  }
  // related_texts is kept (it's the structured cross-reference data, useful live).

  const { error: updateError } = await service.from('texts').update(update).eq('id', id);
  if (updateError) {
    console.error('[admin curator-notes promote] update error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
