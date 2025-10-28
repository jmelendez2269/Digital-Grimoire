// API endpoint for monitoring Nano Banana and cover generation system
// GET /api/admin/covers/status

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkNanoBananaStatus } from '@/lib/nano-banana-cover';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check Nano Banana API status
    const nanoBananaStatus = await checkNanoBananaStatus();

    // Get recent cover generation jobs
    const { data: recentJobs, error: jobsError } = await supabase
      .from('cover_generation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (jobsError) {
      console.error('Error fetching cover jobs:', jobsError);
    }

    // Calculate statistics from jobs
    const stats = calculateJobStats(recentJobs || []);

    // Get cover source distribution from texts table
    const { data: textsWithCovers, error: sourcesError } = await supabase
      .from('texts')
      .select('cover_source')
      .not('cover_source', 'is', null);

    if (sourcesError) {
      console.error('Error fetching cover sources:', sourcesError);
    }

    // Group cover sources manually
    const coverSourcesMap = new Map<string, number>();
    (textsWithCovers || []).forEach(text => {
      if (text.cover_source) {
        coverSourcesMap.set(text.cover_source, (coverSourcesMap.get(text.cover_source) || 0) + 1);
      }
    });

    const coverSources = Array.from(coverSourcesMap.entries()).map(([cover_source, count]) => ({
      cover_source,
      count,
    }));

    // Calculate total credits used
    const totalCredits = (recentJobs || [])
      .filter(job => job.status === 'completed' && job.source === 'nano-banana')
      .reduce((sum, job) => sum + (job.credits_used || 0), 0);

    return NextResponse.json({
      success: true,
      nanoBanana: {
        configured: nanoBananaStatus.available,
        available: nanoBananaStatus.available,
        credits: nanoBananaStatus.credits,
        error: nanoBananaStatus.error,
      },
      stats: {
        totalJobs: stats.total,
        completed: stats.completed,
        failed: stats.failed,
        pending: stats.pending,
        successRate: stats.successRate,
        totalCreditsUsed: totalCredits,
        estimatedCost: totalCredits * 0.10, // $0.10 per credit
      },
      coverSources: coverSources || [],
      recentJobs: recentJobs || [],
    });
  } catch (error) {
    console.error('Error fetching cover system status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      },
      { status: 500 }
    );
  }
}

interface CoverJob {
  id: string;
  text_id: string;
  status: string;
  source: string | null;
  result_url: string | null;
  error: string | null;
  credits_used: number;
  created_at: string;
  updated_at: string;
}

function calculateJobStats(jobs: CoverJob[]) {
  const total = jobs.length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  const pending = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    failed,
    pending,
    successRate: Math.round(successRate * 10) / 10,
  };
}

