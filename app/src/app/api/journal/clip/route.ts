import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, text, sourceId, sourceTitle, sourceLocation } = body || {};
    if (!pageId || !text) {
      return NextResponse.json({ error: 'Missing pageId or text' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Load page content
    const { data: page, error: fetchErr } = await supabase
      .from('journal_pages')
      .select('id, user_id, content')
      .eq('id', pageId)
      .single();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 });
    if (page.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const current = (() => {
      try { return typeof page.content === 'string' ? JSON.parse(page.content) : page.content; } catch { return null; }
    })();
    const doc = current && current.type === 'doc' ? current : { type: 'doc', content: [] as any[] };

    // Build a blockquote node with citation
    const clipNode = {
      type: 'blockquote',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text }] },
        { type: 'paragraph', content: [{ type: 'text', text: `— ${sourceTitle || 'Source'}${sourceLocation ? ` (${sourceLocation})` : ''}` }], attrs: { class: 'text-zinc-400' } },
      ],
      attrs: { 'data-source-id': sourceId || null },
    };

    const newDoc = { ...doc, content: [...(doc.content || []), clipNode] };

    const { error: updateErr } = await supabase
      .from('journal_pages')
      .update({ content: newDoc })
      .eq('id', pageId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to clip passage' }, { status: 500 });
  }
}


