import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/convergence/rate-limit';

/**
 * GET /api/convergence/rate-limit
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

    // Check if user is premium
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_status, role')
      .eq('id', user.id)
      .single();

    const isPremium = userData?.role === 'admin' || 
                      userData?.subscription_status === 'premium' || 
                      userData?.subscription_status === 'active';

    return NextResponse.json({
      ...rateLimit,
      resetDate: rateLimit.resetDate.toISOString(), // Convert Date to ISO string for JSON
      isPremium,
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

