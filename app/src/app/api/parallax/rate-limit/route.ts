import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getSubscriptionTier } from '@/lib/parallax/rate-limit';

/**
 * GET /api/parallax/rate-limit
 * Get user's rate limit status
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id);

    // Get subscription tier
    const tier = await getSubscriptionTier(user.id);
    const isPaid = tier !== 'free';

    return NextResponse.json({
      ...rateLimit,
      resetDate: rateLimit.resetDate.toISOString(), // Convert Date to ISO string for JSON
      isPremium: isPaid, // Legacy support
      tier, // New: include tier information
    });
  } catch (error) {
    console.error('Error fetching rate limit:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

