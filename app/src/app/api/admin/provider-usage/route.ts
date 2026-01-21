import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { compareUsage, getUsageSummary } from '@/lib/providers/openai-usage';

/**
 * GET /api/admin/provider-usage
 * Compare tracked usage vs provider API usage
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - userId: optional user ID filter
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const userIdParam = searchParams.get('userId');

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago

    const userId = userIdParam || undefined;

    const comparison = await compareUsage(startDate, endDate, userId);
    const summary = await getUsageSummary(startDate, endDate, userId);

    return NextResponse.json({
      success: true,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      comparison,
      summary,
      note: 'OpenAI does not provide a public usage API. To compare with provider data, manually export from https://platform.openai.com/usage',
    });
  } catch (error) {
    console.error('Error fetching provider usage:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch provider usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
