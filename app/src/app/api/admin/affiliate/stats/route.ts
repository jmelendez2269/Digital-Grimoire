import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // 1. Check if user is admin
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // 2. Fetch stats
        // Total clicks
        const { count: totalClicks } = await supabase
            .from('affiliate_clicks')
            .select('*', { count: 'exact', head: true });

        // Clicks in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: recentClicks } = await supabase
            .from('affiliate_clicks')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        // Top items
        const { data: topItems } = await supabase
            .rpc('get_top_affiliate_items', { limit_count: 5 });

        // Clicks by source
        const { data: sourceStats } = await supabase
            .rpc('get_affiliate_source_stats');

        return NextResponse.json({
            totalClicks: totalClicks || 0,
            recentClicks: recentClicks || 0,
            topItems: topItems || [],
            sourceStats: sourceStats || []
        });

    } catch (error) {
        console.error('Error fetching affiliate stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
