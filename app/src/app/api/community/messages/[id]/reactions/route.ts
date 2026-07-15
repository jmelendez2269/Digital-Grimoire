import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/community/messages/[id]/reactions - Toggle an emoji reaction on a message
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;
    const body = await request.json();
    const emoji = typeof body.emoji === 'string' ? body.emoji.trim() : '';
    if (!emoji || emoji.length > 8) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('community_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      const { error: deleteError } = await supabase
        .from('community_message_reactions')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;
      return NextResponse.json({ reacted: false });
    }

    const { error: insertError } = await supabase
      .from('community_message_reactions')
      .insert({ message_id: messageId, user_id: user.id, emoji });
    if (insertError) throw insertError;

    return NextResponse.json({ reacted: true });
  } catch (error) {
    console.error('Error in POST /api/community/messages/[id]/reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
