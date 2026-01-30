import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const queryTerm = searchParams.get('query')?.trim() || '';

        if (!queryTerm || queryTerm.length < 2) {
            return NextResponse.json({ suggestions: [] });
        }

        // Build query
        // We want a fast prefix search on title or author
        // Limit to 5 results for "instant" feeling
        const { data, error } = await supabase
            .from('texts')
            .select('id, title, author')
            .or(`title.ilike.%${queryTerm}%,author.ilike.%${queryTerm}%`)
            .limit(5);

        if (error) {
            console.error('Database error fetching suggestions:', error);
            // Return empty list gracefully to not break UI
            return NextResponse.json({ suggestions: [] });
        }

        return NextResponse.json({
            suggestions: data || []
        });

    } catch (error) {
        console.error('Unexpected error in suggestions API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
