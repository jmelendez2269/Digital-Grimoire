import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getSubscriptionTier } from '@/lib/parallax/rate-limit';

/**
 * GET /api/parallax/rate-limit
 * Returns the current rate limit status for the authenticated user.
 * Used by the Parallax Engine page to determine if the user can submit queries.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get subscription tier and rate limit info
        const tier = await getSubscriptionTier(user.id);
        const isPremium = tier !== 'free';
        const rateLimit = await checkRateLimit(user.id);

        return new Response(
            JSON.stringify({
                remaining: rateLimit.remaining,
                limit: rateLimit.limit,
                resetDate: rateLimit.resetDate.toISOString(),
                isPremium,
                tier,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error fetching rate limit:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
