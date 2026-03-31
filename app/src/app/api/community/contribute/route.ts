import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/community/contribute - Submit a synthesis response to the community pool
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { journal_page_id, course_id, week_number } = body;

    if (!journal_page_id || !course_id || week_number === undefined) {
      return NextResponse.json(
        { error: 'journal_page_id, course_id, and week_number are required' },
        { status: 400 }
      );
    }

    // Fetch the journal page to get content
    const { data: page, error: pageError } = await supabase
      .from('journal_pages')
      .select('id, content, user_id')
      .eq('id', journal_page_id)
      .eq('user_id', user.id)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Journal page not found or access denied' },
        { status: 404 }
      );
    }

    // Extract a plain text preview from Tiptap JSON content
    const contentPreview = extractTextPreview(page.content, 200);

    // Create the community contribution
    const { data: contribution, error: insertError } = await supabase
      .from('community_contributions')
      .insert({
        user_id: user.id,
        journal_page_id,
        course_id,
        week_number,
        content: page.content,
        content_preview: contentPreview,
        is_anonymous: true,
        status: 'published',
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (already contributed)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already contributed a synthesis for this week' },
          { status: 409 }
        );
      }
      console.error('Error creating contribution:', insertError);
      return NextResponse.json(
        { error: 'Failed to create contribution' },
        { status: 500 }
      );
    }

    return NextResponse.json({ contribution }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/community/contribute:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/community/contribute - Get community contributions for a course week
// Requires the user to have completed their own synthesis first (anti-anchoring)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const weekNumber = searchParams.get('week_number');

    if (!courseId || !weekNumber) {
      return NextResponse.json(
        { error: 'course_id and week_number are required' },
        { status: 400 }
      );
    }

    const weekNum = parseInt(weekNumber, 10);

    // Anti-anchoring check: user must have submitted their own synthesis first
    const { data: userSynthesis } = await supabase
      .from('journal_pages')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('week_number', weekNum)
      .eq('entry_type', 'synthesis')
      .limit(1);

    if (!userSynthesis || userSynthesis.length === 0) {
      return NextResponse.json(
        { error: 'Complete your synthesis first to view community responses', gated: true },
        { status: 403 }
      );
    }

    // Fetch community contributions (excluding user's own)
    const { data: contributions, error } = await supabase
      .from('community_contributions')
      .select('id, content_preview, created_at, is_anonymous')
      .eq('course_id', courseId)
      .eq('week_number', weekNum)
      .eq('status', 'published')
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching contributions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contributions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      contributions: contributions || [],
      total: contributions?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/community/contribute:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract plain text preview from Tiptap JSON content
 */
function extractTextPreview(content: any, maxLength: number): string {
  if (!content) return '';

  const texts: string[] = [];

  function walk(node: any) {
    if (node.type === 'text' && node.text) {
      texts.push(node.text);
    }
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(content);
  const fullText = texts.join(' ').trim();
  if (fullText.length <= maxLength) return fullText;
  return fullText.substring(0, maxLength).trim() + '…';
}
