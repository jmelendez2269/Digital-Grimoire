import { createClient } from '@supabase/supabase-js';

/**
 * Service role client for server-side operations
 * Bypasses RLS policies - use only in secure API routes
 * 
 * This client uses the service role key which has full database access
 * and bypasses all Row Level Security policies.
 */
export function createServiceClient() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'service.ts:10',message:'createServiceClient entry',data:{hasUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      keyPrefix: supabaseServiceKey?.substring(0, 10)
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'service.ts:16',message:'Missing credentials error',data:{hasUrl:!!supabaseUrl,hasKey:!!supabaseServiceKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'service.ts:46',message:'Before createClient call',data:{urlPrefix:supabaseUrl?.substring(0,30),keyPrefix:supabaseServiceKey?.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'service.ts:58',message:'After createClient success',data:{hasClient:!!client},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return client;
}

