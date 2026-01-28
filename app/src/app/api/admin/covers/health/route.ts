import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get stats
        // 1. Total texts with covers
        const { count: totalCovers } = await supabase
            .from('texts')
            .select('*', { count: 'exact', head: true })
            .not('cover_image_url', 'is', null);

        // 2. Broken covers
        const { count: brokenCovers, data: brokenParams } = await supabase
            .from('texts')
            .select('id, title, cover_image_url, cover_status, cover_last_checked', { count: 'exact' })
            .eq('cover_status', 'broken')
            .limit(100);

        // 3. Unchecked covers
        const { count: uncheckedCovers } = await supabase
            .from('texts')
            .select('*', { count: 'exact', head: true })
            .not('cover_image_url', 'is', null)
            .eq('cover_status', 'unchecked');

        return NextResponse.json({
            total: totalCovers || 0,
            broken: brokenCovers || 0,
            unchecked: uncheckedCovers || 0,
            brokenList: brokenParams || []
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
