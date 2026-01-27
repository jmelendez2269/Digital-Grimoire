import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const provider = formData.get('provider') as string || 'openai';

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        const text = await file.text();
        const lines = text.split('\n');
        if (lines.length < 2) {
            return NextResponse.json(
                { error: 'File appears to be empty or invalid CSV' },
                { status: 400 }
            );
        }

        // Parse headers
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

        // Map headers to indices
        const indices: Record<string, number> = {};
        headers.forEach((h, i) => {
            if (h.includes('date') || h.includes('timestamp')) indices.date = i;
            if (h.includes('model')) indices.model = i;
            if (h.includes('input') || h.includes('context') || h.includes('prompt')) indices.input = i;
            if (h.includes('output') || h.includes('generated') || h.includes('completion')) indices.output = i;
            if (h.includes('requests')) indices.requests = i;
            if (h.includes('cost') || h.includes('amount')) indices.cost = i;
        });

        if (indices.date === undefined) {
            return NextResponse.json(
                { error: 'Could not find a "Date" or "Timestamp" column' },
                { status: 400 }
            );
        }

        const records = [];
        const errors = [];

        // Parse rows
        // Aggregation map: date|model -> { input, output, requests, cost }
        const dailyStats = new Map<string, {
            date: string;
            model: string;
            input: number;
            output: number;
            requests: number;
            cost: number;
        }>();

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle quotes in CSV (basic handling)
            // A more robust CSV parser would be better, but this suffices for standard exports
            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/"/g, ''));

            try {
                const dateStr = parts[indices.date];
                if (!dateStr) continue;

                // Normalize date to YYYY-MM-DD
                const date = new Date(dateStr).toISOString().split('T')[0];

                // Optional model (default to 'all' or explicit model)
                const model = indices.model !== undefined && parts[indices.model] ? parts[indices.model] : 'all';

                const key = `${date}|${model}`;

                if (!dailyStats.has(key)) {
                    dailyStats.set(key, { date, model, input: 0, output: 0, requests: 0, cost: 0 });
                }

                const stat = dailyStats.get(key)!;

                if (indices.input !== undefined) stat.input += parseFloat(parts[indices.input]) || 0;
                if (indices.output !== undefined) stat.output += parseFloat(parts[indices.output]) || 0;
                if (indices.requests !== undefined) stat.requests += parseFloat(parts[indices.requests]) || 1; // Default to 1 request per row if requests column missing but row exists?
                // OpenAI daily export vs activity export. 
                // If it's activity export, each row is a request usually. If daily, it has 'requests' col.
                // If requests column is missing, and we're parsing activity logs, count as 1. 
                // If daily aggregation CSV, requests col should be there. 
                // Let's assume if 'requests' column exists use it, else count as 1.
                if (indices.requests === undefined) stat.requests += 1;

                if (indices.cost !== undefined) stat.cost += parseFloat(parts[indices.cost]) || 0;

            } catch (e) {
                errors.push(`Line ${i + 1}: Failed to parse (${e})`);
            }
        }

        // Upsert into Supabase
        const upsertData = Array.from(dailyStats.values()).map(stat => ({
            date: stat.date,
            provider: provider,
            model: stat.model,
            input_tokens: stat.input,
            output_tokens: stat.output,
            requests: stat.requests,
            cost: stat.cost
        }));

        if (upsertData.length > 0) {
            const { error } = await supabase
                .from('provider_daily_usage')
                .upsert(upsertData, {
                    onConflict: 'date,provider,model',
                    ignoreDuplicates: false, // Update existing
                });

            if (error) {
                throw error;
            }
        }

        return NextResponse.json({
            success: true,
            processed: upsertData.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: 'Failed to import usage data', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
