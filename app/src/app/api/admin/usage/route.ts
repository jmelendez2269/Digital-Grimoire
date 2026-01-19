import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated and is admin
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('range') || '30'; // days
    const daysAgo = parseInt(timeRange);
    const personal = searchParams.get('personal') === 'true';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build base query for api_usage
    let usageQuery = supabase
      .from('api_usage')
      .select('service, units_used, unit_type, estimated_cost')
      .gte('created_at', startDate.toISOString());

    // If personal mode, filter by current user
    if (personal) {
      usageQuery = usageQuery.eq('user_id', user.id);
      console.log(`[ADMIN USAGE] Personal mode: filtering for user ${user.id}`);
    }

    // Get total API usage by service
    const { data: usageByService, error: usageError } = await usageQuery;

    if (usageError) throw usageError;

    // Get daily usage summary (only if not personal mode, as daily summary is aggregated)
    let dailySummary = [];
    if (!personal) {
      const { data: summaryData, error: summaryError } = await supabase
        .from('daily_usage_summary')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (summaryError) throw summaryError;
      dailySummary = summaryData || [];
    }

    if (usageError) {
      console.error('[ADMIN USAGE] Error fetching usage data:', usageError);
      throw usageError;
    }

    console.log(`[ADMIN USAGE] Found ${usageByService?.length || 0} usage records for the last ${daysAgo} days`);
    
    // Debug: Show breakdown by service
    if (usageByService && usageByService.length > 0) {
      const serviceBreakdown = (usageByService || []).reduce((acc: any, curr: any) => {
        const service = curr.service || 'unknown';
        acc[service] = (acc[service] || 0) + 1;
        return acc;
      }, {});
      console.log('[ADMIN USAGE] Service breakdown:', serviceBreakdown);
      
      // Specifically check for convergence_query
      const convergenceRecords = (usageByService || []).filter((r: any) => r.service === 'convergence_query');
      console.log(`[ADMIN USAGE] Convergence query records: ${convergenceRecords.length}`);
      if (convergenceRecords.length > 0) {
        console.log('[ADMIN USAGE] Sample convergence record:', {
          service: convergenceRecords[0].service,
          units_used: convergenceRecords[0].units_used,
          unit_type: convergenceRecords[0].unit_type,
          estimated_cost: convergenceRecords[0].estimated_cost,
        });
      }
    } else {
      console.warn('[ADMIN USAGE] ⚠️ No usage records found. This may indicate:');
      console.warn('  1. No API calls have been made in the selected time range');
      console.warn('  2. Usage tracking is not working');
      console.warn('  3. Database constraint may not allow convergence_query service');
    }

    // Aggregate by service
    const serviceStats = (usageByService || []).reduce((acc: any, curr: any) => {
      const service = curr.service;
      if (!acc[service]) {
        acc[service] = {
          service,
          totalUnits: 0,
          totalCost: 0,
          requests: 0,
        };
      }
      acc[service].totalUnits += parseFloat(curr.units_used || 0);
      acc[service].totalCost += parseFloat(curr.estimated_cost || 0);
      acc[service].requests += 1;
      return acc;
    }, {});
    
    console.log('[ADMIN USAGE] Aggregated service stats:', Object.keys(serviceStats));

    // Get user activity summary
    let userActivityQuery = supabase
      .from('user_activity_summary')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (personal) {
      userActivityQuery = userActivityQuery.eq('user_id', user.id);
    }

    const { data: userActivity, error: activityError } = await userActivityQuery;

    if (activityError) throw activityError;

    // Get top users by activity (only if not personal mode)
    let topUsers = [];
    if (!personal) {
      const { data: topUsersData, error: topUsersError } = await supabase
        .rpc('get_top_users_by_activity', { days: daysAgo })
        .limit(10);
      topUsers = topUsersData || [];
    }

    // Get storage usage (latest snapshot)
    const { data: storageUsage, error: storageError } = await supabase
      .from('storage_usage')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    // Get cost alerts
    const { data: costAlerts, error: alertsError } = await supabase
      .from('cost_alerts')
      .select('*');

    // Calculate current period costs
    const now = new Date();
    const dayAgoDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build cost queries with optional user filter
    let dailyCostQuery = supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', dayAgoDate.toISOString());

    let weeklyCostQuery = supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', weekAgoDate.toISOString());

    let monthlyCostQuery = supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', monthStartDate.toISOString());

    if (personal) {
      dailyCostQuery = dailyCostQuery.eq('user_id', user.id);
      weeklyCostQuery = weeklyCostQuery.eq('user_id', user.id);
      monthlyCostQuery = monthlyCostQuery.eq('user_id', user.id);
    }

    const { data: dailyCostData } = await dailyCostQuery;
    const { data: weeklyCostData } = await weeklyCostQuery;
    const { data: monthlyCostData } = await monthlyCostQuery;

    const currentCosts = {
      daily: (dailyCostData || []).reduce((sum, row) => sum + parseFloat(row.estimated_cost || '0'), 0),
      weekly: (weeklyCostData || []).reduce((sum, row) => sum + parseFloat(row.estimated_cost || '0'), 0),
      monthly: (monthlyCostData || []).reduce((sum, row) => sum + parseFloat(row.estimated_cost || '0'), 0),
    };

    console.log('[ADMIN USAGE] Calculated costs:', {
      daily: currentCosts.daily,
      weekly: currentCosts.weekly,
      monthly: currentCosts.monthly,
      dailyRecords: dailyCostData?.length || 0,
      weeklyRecords: weeklyCostData?.length || 0,
      monthlyRecords: monthlyCostData?.length || 0,
    });
    console.log('[ADMIN USAGE] Service stats:', Object.values(serviceStats));

    // Get total users count (only if not personal mode)
    let totalUsers = 0;
    let totalDocuments = 0;
    let recentUploads = 0;

    if (!personal) {
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      totalUsers = usersCount || 0;

      const { count: documentsCount } = await supabase
        .from('texts')
        .select('*', { count: 'exact', head: true });
      totalDocuments = documentsCount || 0;

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { count: uploadsCount } = await supabase
        .from('texts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());
      recentUploads = uploadsCount || 0;
    } else {
      // In personal mode, get user's own document counts
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { count: uploadsCount } = await supabase
        .from('texts')
        .select('*', { count: 'exact', head: true })
        .eq('uploaded_by', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());
      recentUploads = uploadsCount || 0;
    }

    // Get recent errors
    let errorsQuery = supabase
      .from('api_usage')
      .select('*')
      .eq('success', false)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (personal) {
      errorsQuery = errorsQuery.eq('user_id', user.id);
    }

    const { data: recentErrors, error: errorsError } = await errorsQuery;

    // Aggregate Courses clicks from user activity
    const totalCoursesClicks = (userActivity || []).reduce((sum, activity) => {
      return sum + (activity.courses_clicks || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      personal,
      timeRange: daysAgo,
      startDate: startDate.toISOString(),
      overview: {
        totalUsers,
        totalDocuments,
        recentUploads,
        coursesClicks: totalCoursesClicks,
        currentCosts,
      },
      dailySummary,
      serviceStats: Object.values(serviceStats),
      userActivity: userActivity || [],
      topUsers,
      storageUsage: personal ? null : (storageUsage || null), // Don't show storage in personal mode
      costAlerts: personal ? [] : (costAlerts || []), // Don't show cost alerts in personal mode
      recentErrors: recentErrors || [],
    });
  } catch (error) {
    console.error('Failed to fetch usage metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST endpoint to update cost alert thresholds
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and is admin
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

    const body = await request.json();
    const { alertType, thresholdAmount } = body;

    if (!alertType || thresholdAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: alertType, thresholdAmount' },
        { status: 400 }
      );
    }

    // Update the cost alert threshold
    const { data, error } = await supabase
      .from('cost_alerts')
      .update({ threshold_amount: thresholdAmount })
      .eq('alert_type', alertType)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      alert: data,
    });
  } catch (error) {
    console.error('Failed to update cost alert:', error);
    return NextResponse.json(
      { error: 'Failed to update cost alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

