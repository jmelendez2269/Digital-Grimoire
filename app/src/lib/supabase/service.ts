import { createClient } from '@supabase/supabase-js';

/**
 * Service role client for server-side operations
 * Bypasses RLS policies - use only in secure API routes
 * 
 * This client uses the service role key which has full database access
 * and bypasses all Row Level Security policies.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

