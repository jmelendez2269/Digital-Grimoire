import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AMAZON_TRACKING_ID } from '@/lib/utils/affiliate';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get('title') || 'Unknown';
    const author = searchParams.get('author') || '';
    const source = searchParams.get('source') || 'Direct';

    try {
        const supabase = await createClient();

        // Get current user if any (optional tracking)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        // Log the click
        // Note: Using service role client if needed, but standard server client should work if policies allow
        await supabase.from('affiliate_clicks').insert({
            item_title: title,
            item_author: author,
            source_page: source,
            user_id: userId,
            tracking_id: AMAZON_TRACKING_ID
        });

    } catch (error) {
        console.error('Error tracking affiliate click:', error);
        // We still want to redirect even if tracking fails
    }

    // Build Amazon URL
    const query = author ? `${title} ${author}` : title;
    const searchTerm = encodeURIComponent(query);
    const amazonUrl = `https://www.amazon.com/s?k=${searchTerm}&tag=${AMAZON_TRACKING_ID}`;

    console.log('🔗 Redirecting to Amazon with tracking:', amazonUrl);

    return NextResponse.redirect(amazonUrl);
}
