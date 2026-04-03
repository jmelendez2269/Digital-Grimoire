import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // For V1, fetch the latest active insights and pick one randomly.
    // In a future evolution, this might check a user_views table.
    const { data: insights, error } = await supabase
      .from('daily_insights')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10); // Grab up to 10 recent active insights

    if (error) {
      console.error('Error fetching insights:', error);
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      );
    }

    if (!insights || insights.length === 0) {
      // Auto-seed from library when table is empty — fire and forget
      fetch(`${request.nextUrl.origin}/api/admin/insights?action=seed`, {
        method: 'POST',
        headers: { 'x-internal-seed': process.env.INTERNAL_SEED_SECRET ?? '' },
      }).catch(() => {/* non-critical */});
      return NextResponse.json({ insight: null });
    }

    // Pick a random insight from the set
    const randomIdx = Math.floor(Math.random() * insights.length);
    const selectedInsight = insights[randomIdx];

    return NextResponse.json({ insight: selectedInsight });
  } catch (error) {
    console.error('Error in GET /api/insights/today:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
