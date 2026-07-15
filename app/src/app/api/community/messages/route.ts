import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthors } from '@/lib/community/resolveAuthors';

export const dynamic = 'force-dynamic';

const MAX_BODY_LENGTH = 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 5;

interface ReactionRow {
  message_id: string;
  user_id: string;
  emoji: string;
}

function groupReactions(rows: ReactionRow[], currentUserId?: string) {
  const byMessage = new Map<string, Map<string, { emoji: string; count: number; reactedByMe: boolean }>>();
  for (const row of rows) {
    if (!byMessage.has(row.message_id)) byMessage.set(row.message_id, new Map());
    const emojis = byMessage.get(row.message_id)!;
    const existing = emojis.get(row.emoji) ?? { emoji: row.emoji, count: 0, reactedByMe: false };
    existing.count += 1;
    if (row.user_id === currentUserId) existing.reactedByMe = true;
    emojis.set(row.emoji, existing);
  }
  const result = new Map<string, { emoji: string; count: number; reactedByMe: boolean }[]>();
  for (const [messageId, emojis] of byMessage) {
    result.set(messageId, Array.from(emojis.values()));
  }
  return result;
}

// GET /api/community/messages - Recent messages in the global community chat room
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('community_messages')
      .select('id, user_id, body, created_at')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching community messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    const messages = (data ?? []).reverse();
    const messageIds = messages.map((m) => m.id);

    const [authors, reactionsResult] = await Promise.all([
      resolveAuthors(messages.map((m) => m.user_id)),
      messageIds.length > 0
        ? supabase
            .from('community_message_reactions')
            .select('message_id, user_id, emoji')
            .in('message_id', messageIds)
        : Promise.resolve({ data: [] as ReactionRow[], error: null }),
    ]);

    const reactionsByMessage = groupReactions(reactionsResult.data ?? [], user.id);

    const enriched = messages.map((m) => ({
      ...m,
      author: authors.get(m.user_id),
      reactions: reactionsByMessage.get(m.id) ?? [],
    }));

    return NextResponse.json({ messages: enriched });
  } catch (error) {
    console.error('Error in GET /api/community/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/community/messages - Send a message to the global community chat room
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const text = typeof body.body === 'string' ? body.body.trim() : '';

    if (!text) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }
    if (text.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_BODY_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error: countError } = await supabase
      .from('community_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);

    if (!countError && (count ?? 0) >= RATE_LIMIT_MAX_MESSAGES) {
      return NextResponse.json(
        { error: 'You are sending messages too quickly. Please wait a moment.' },
        { status: 429 }
      );
    }

    const { data: message, error: insertError } = await supabase
      .from('community_messages')
      .insert({ user_id: user.id, body: text })
      .select('id, user_id, body, created_at')
      .single();

    if (insertError) {
      console.error('Error sending community message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    const author = {
      name:
        user.user_metadata?.display_name?.trim() ||
        user.user_metadata?.username?.trim() ||
        `Member ${user.id.slice(0, 8)}`,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    };

    return NextResponse.json({ message: { ...message, author, reactions: [] } }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/community/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
