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

  // Extract project refs from URL and key to detect mismatches
  const urlRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  // Try to decode JWT to get project ref (basic check)
  try {
    const keyParts = supabaseServiceKey.split('.');
    if (keyParts.length === 3) {
      const payload = JSON.parse(Buffer.from(keyParts[1], 'base64').toString());
      const keyRef = payload.ref;
      
      if (urlRef && keyRef && urlRef !== keyRef) {
        console.error('⚠️ SUPABASE PROJECT MISMATCH DETECTED:', {
          urlProjectRef: urlRef,
          keyProjectRef: keyRef,
          message: 'The service role key is from a different Supabase project than the URL. This will cause "Invalid API key" errors.',
          fix: 'Get the service_role key from the Supabase project matching your URL: ' + supabaseUrl
        });
      }
    }
  } catch (e) {
    // If we can't decode, that's okay - just continue
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
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
  return client;
}

