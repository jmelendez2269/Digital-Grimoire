import 'server-only';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export interface Viewer {
  user: User | null;
  isAdmin: boolean;
}

/**
 * Shared cookie-client auth + role lookup, used by forum/community API
 * routes that need to distinguish "the caller" from "an admin" from
 * "neither" -- mirrors the getViewer() pattern duplicated across the
 * admin/videos and admin/blog routes.
 */
export async function getViewer(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Viewer> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return { user, isAdmin: profile?.role === 'admin' };
}
