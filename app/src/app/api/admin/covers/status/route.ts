import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkNanoBananaStatus } from '@/lib/nano-banana-cover';
import { checkReplicateStatus } from '@/lib/replicate-cover';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check Nano Banana Status
    const nanoBananaStatus = await checkNanoBananaStatus();

    // Check Replicate Status
    const replicateStatus = await checkReplicateStatus();

    // Fetch Generation Stats (Jobs)
    // Attempt to fetch from 'cover_generation_jobs' if it exists, otherwise return defaults
    let stats = {
      totalJobs: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      successRate: 0,
      totalCreditsUsed: 0,
      estimatedCost: 0
    };
    let recentJobs: any[] = [];
    let coverSources: any[] = [];

    try {
      // Try to fetch stats - if table doesn't exist this will fail gracefully
      const { data: jobs, error } = await supabase
        .from('cover_generation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && jobs) {
        const total = jobs.length; // Approximate, or use count
        const completed = jobs.filter(j => j.status === 'completed').length;
        const failed = jobs.filter(j => j.status === 'failed').length;
        const pending = jobs.filter(j => j.status === 'pending').length;
        const credits = jobs.reduce((acc, j) => acc + (j.credits_used || 0), 0);

        stats = {
          totalJobs: total,
          completed,
          failed,
          pending,
          successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          totalCreditsUsed: credits,
          estimatedCost: credits * 0.05 // Assuming $0.05 per credit roughly
        };
        recentJobs = jobs.slice(0, 5); // Latest 5

        // Source stats
        // Placeholder logic if needed, or query DB
      }
    } catch (e) {
      // Table likely doesn't exist or other error, ignore
      console.warn('Could not fetch cover_generation_jobs:', e);
    }

    // Try to get cover sources from texts table if possible
    try {
      // This is a heavy query, maybe skip or optimize?
      // Just a placeholder for now to match UI expectations
    } catch (e) { }


    return NextResponse.json({
      success: true,
      nanoBanana: nanoBananaStatus,
      replicate: replicateStatus,
      stats,
      coverSources,
      recentJobs
    });

  } catch (error) {
    console.error('Status check failed:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
