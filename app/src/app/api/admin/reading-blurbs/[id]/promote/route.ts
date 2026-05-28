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
    return NextResponse.json({ error: 'Missing reading_id' }, { status: 400 });
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

  const { data: current, error: fetchError } = await service
    .from('reading_blurbs')
    .select('blurb_draft, status')
    .eq('reading_id', id)
    .single();

  if (fetchError || !current) {
    console.error('[admin reading-blurbs promote] fetch error:', fetchError);
    return NextResponse.json({ error: 'Blurb not found' }, { status: 404 });
  }

  if (current.status !== 'draft_pending') {
    return NextResponse.json({ error: 'No pending draft to promote' }, { status: 409 });
  }
  if (!current.blurb_draft) {
    return NextResponse.json({ error: 'Draft is empty; cannot promote' }, { status: 400 });
  }

  const { error: updateError } = await service
    .from('reading_blurbs')
    .update({
      blurb_live: current.blurb_draft,
      blurb_draft: null,
      status: 'live',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('reading_id', id);

  if (updateError) {
    console.error('[admin reading-blurbs promote] update error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
