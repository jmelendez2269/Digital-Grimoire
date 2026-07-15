import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncChannelVideos } from '@/lib/youtube/sync';

export const dynamic = 'force-dynamic';

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return profile?.role === 'admin';
}

// Sync videos from the YouTube channel. Callable by an authenticated admin
// (manual "Sync Now", POST) or by the Vercel cron job, which sends a GET
// request with Authorization: Bearer $CRON_SECRET.
async function handleSync(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await syncChannelVideos();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/admin/videos/sync:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET is what Vercel Cron actually calls.
export async function GET(request: NextRequest) {
  return handleSync(request);
}

// POST is used by the admin "Sync Now" button.
export async function POST(request: NextRequest) {
  return handleSync(request);
}
