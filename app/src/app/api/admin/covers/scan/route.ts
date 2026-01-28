import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300; // Allow up to 5 minutes for scanning

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication and admin status
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get all texts with cover images
        // We scan all because links can rot anywhere
        // Limit to 50 items per batch to avoid timeouts if called frequently
        // For a "Scan All" we might need a better strategy (e.g. background job), but for now a batch scan is good.
        // Actually, let's try to scan a reasonable number, say 100, ordered by 'cover_last_checked' asc nulls first
        // This creates a rolling scan effect if called repeatedly.

        // For the User's request of "Scan Now", they probably want a full scan or at least a large batch.

        const BATCH_SIZE = 50;

        const { data: texts, error: fetchError } = await supabase
            .from('texts')
            .select('id, title, cover_image_url, cover_status, cover_last_checked')
            .not('cover_image_url', 'is', null)
            .order('cover_last_checked', { ascending: true, nullsFirst: true })
            .limit(BATCH_SIZE);

        if (fetchError) {
            return NextResponse.json({ error: 'Failed to fetch texts', details: fetchError }, { status: 500 });
        }

        if (!texts || texts.length === 0) {
            return NextResponse.json({ message: 'No texts to scan', scanned: 0, broken: 0 });
        }

        let scannedCount = 0;
        let brokenCount = 0;
        const results: Array<{ id: string; title: string; url: string; status: string }> = [];

        // Process in parallel with concurrency limit
        const verifyUrl = async (text: any) => {
            if (!text.cover_image_url) return;

            let status = 'valid';
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

                const response = await fetch(text.cover_image_url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'DigitalGrimoire/1.0 (LinkChecker)'
                    }
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    // 404, 403, 500 etc.
                    status = 'broken';
                } else {
                    // Check content type if possible
                    const contentType = response.headers.get('content-type');
                    if (contentType && !contentType.startsWith('image/')) {
                        // Not an image? Suspicious.
                        status = 'broken';
                    }
                }
            } catch (error) {
                status = 'broken'; // Network error or timeout
            }

            // Update database
            const { error: updateError } = await supabase
                .from('texts')
                .update({
                    cover_status: status,
                    cover_last_checked: new Date().toISOString()
                })
                .eq('id', text.id);

            if (status === 'broken') brokenCount++;
            scannedCount++;

            results.push({
                id: text.id,
                title: text.title,
                url: text.cover_image_url,
                status
            });
        };

        // Execute with limited concurrency (e.g. 10 at a time)
        // Simple Promise.all implementation for now since BATCH_SIZE is small key
        await Promise.all(texts.map(text => verifyUrl(text)));

        return NextResponse.json({
            success: true,
            scanned: scannedCount,
            broken: brokenCount,
            results: results.filter(r => r.status === 'broken') // Return broken ones for immediate feedback
        });

    } catch (error) {
        console.error('Scan failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
