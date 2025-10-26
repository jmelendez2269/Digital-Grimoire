import { createClient } from '@supabase/supabase-js';

/**
 * Service role client for server-side operations
 * Bypasses RLS policies - use only in secure API routes
 * 
 * This client uses the service role key which has full database access
 * and bypasses all Row Level Security policies.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      keyPrefix: supabaseServiceKey?.substring(0, 10)
    });
    throw new Error('Supabase URL or Service Role Key not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'apikey': supabaseServiceKey
      }
    }
  });
}

