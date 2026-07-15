import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tiptapToText } from '@/lib/tiptap/render';

export const dynamic = 'force-dynamic';

const PREVIEW_LENGTH = 500;

// POST /api/community/contribute - Share a journal entry's synthesis to the community pool
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { journal_page_id, course_id, week_number } = body;

    if (!journal_page_id || !course_id || week_number === undefined || week_number === null) {
      return NextResponse.json(
        { error: 'journal_page_id, course_id, and week_number are required' },
        { status: 400 }
      );
    }

    const { data: page, error: pageError } = await supabase
      .from('journal_pages')
      .select('id, content, user_id')
      .eq('id', journal_page_id)
      .eq('user_id', user.id)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    const contentPreview = tiptapToText(page.content).slice(0, PREVIEW_LENGTH);

    const { error: insertError } = await supabase
      .from('community_contributions')
      .insert({
        user_id: user.id,
        journal_page_id,
        course_id,
        week_number,
        content_preview: contentPreview,
      });

    if (insertError) {
      // Unique violation (already contributed for this course+week) is idempotent success.
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, alreadyContributed: true });
      }
      console.error('Error creating community contribution:', insertError);
      return NextResponse.json({ error: 'Failed to contribute' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/community/contribute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/community/contribute?course_id=X&week_number=Y - Read the community synthesis pool
// Gated: caller must have contributed their own synthesis for this course+week first.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const weekNumberParam = searchParams.get('week_number');

    if (!courseId || weekNumberParam === null) {
      return NextResponse.json(
        { error: 'course_id and week_number are required' },
        { status: 400 }
      );
    }
    const weekNumber = Number(weekNumberParam);

    const { data: ownContribution } = await supabase
      .from('community_contributions')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('week_number', weekNumber)
      .maybeSingle();

    if (!ownContribution) {
      return NextResponse.json(
        { error: 'Contribute your own synthesis first to unlock the community pool' },
        { status: 403 }
      );
    }

    const { data: contributions, error } = await supabase
      .from('community_contributions')
      .select('id, content_preview, created_at')
      .eq('course_id', courseId)
      .eq('week_number', weekNumber)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching community contributions:', error);
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 });
    }

    return NextResponse.json({ contributions: contributions ?? [] });
  } catch (error) {
    console.error('Error in GET /api/community/contribute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
