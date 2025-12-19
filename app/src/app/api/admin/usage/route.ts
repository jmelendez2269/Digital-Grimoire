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

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get daily usage summary
    const { data: dailySummary, error: summaryError } = await supabase
      .from('daily_usage_summary')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (summaryError) throw summaryError;

    // Get total API usage by service
    const { data: usageByService, error: usageError } = await supabase
      .from('api_usage')
      .select('service, units_used, unit_type, estimated_cost')
      .gte('created_at', startDate.toISOString());

    if (usageError) throw usageError;

    console.log(`[ADMIN USAGE] Found ${usageByService?.length || 0} usage records for the last ${daysAgo} days`);

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

    // Get user activity summary
    const { data: userActivity, error: activityError } = await supabase
      .from('user_activity_summary')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (activityError) throw activityError;

    // Get top users by activity
    const { data: topUsers, error: topUsersError } = await supabase
      .rpc('get_top_users_by_activity', { days: daysAgo })
      .limit(10);

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

    const { data: dailyCostData } = await supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', dayAgoDate.toISOString());

    const { data: weeklyCostData } = await supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', weekAgoDate.toISOString());

    const { data: monthlyCostData } = await supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', monthStartDate.toISOString());

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

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total documents count
    const { count: totalDocuments } = await supabase
      .from('texts')
      .select('*', { count: 'exact', head: true });

    // Get recent uploads (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { count: recentUploads } = await supabase
      .from('texts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get recent errors
    const { data: recentErrors, error: errorsError } = await supabase
      .from('api_usage')
      .select('*')
      .eq('success', false)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      timeRange: daysAgo,
      startDate: startDate.toISOString(),
      overview: {
        totalUsers: totalUsers || 0,
        totalDocuments: totalDocuments || 0,
        recentUploads: recentUploads || 0,
        currentCosts,
      },
      dailySummary: dailySummary || [],
      serviceStats: Object.values(serviceStats),
      userActivity: userActivity || [],
      topUsers: topUsers || [],
      storageUsage: storageUsage || null,
      costAlerts: costAlerts || [],
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

