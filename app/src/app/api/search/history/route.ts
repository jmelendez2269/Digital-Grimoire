import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');
        const source = searchParams.get('source');

        let query = supabase
            .from('search_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (source) {
            query = query.eq('source', source);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ history: data || [] });
    } catch (error) {
        console.error('Error fetching search history:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { query, source, metadata } = body;

        if (!query || !source) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('search_history')
            .insert({
                user_id: user.id,
                query,
                source,
                metadata: metadata || {}
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error saving search history:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (id) {
            // Delete specific entry
            const { error } = await supabase
                .from('search_history')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id); // Security check
            if (error) throw error;
        } else {
            // Clear all history (optional, maybe unsafe to expose without confirmation, but useful for dev/user request)
            // For now, let's only allow deleting by ID to be safe, or require a specific flag.
            // If no ID, return 400.
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting search history:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
