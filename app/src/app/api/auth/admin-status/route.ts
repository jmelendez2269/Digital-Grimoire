import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:5',message:'API route entry',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // First, check if environment variables are set
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:12',message:'Env vars check',data:{hasUrl,hasAnonKey,hasServiceKey,urlPrefix:process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,30)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!hasUrl || !hasAnonKey || !hasServiceKey) {
      console.error('[API] Missing environment variables:', {
        hasUrl,
        hasAnonKey,
        hasServiceKey
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:18',message:'Missing env vars error',data:{hasUrl,hasAnonKey,hasServiceKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ 
        isAdmin: false, 
        error: "Missing Supabase environment variables",
        details: { hasUrl, hasAnonKey, hasServiceKey },
        userId: undefined,
        role: undefined
      }, { status: 500 });
    }

    let supabase;
    try {
      console.log('[API] Creating Supabase client...');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:30',message:'Before createSupabaseServerClient',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      supabase = await createSupabaseServerClient();
      console.log('[API] Supabase client created successfully');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:32',message:'After createSupabaseServerClient success',data:{hasClient:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (clientError) {
      const errorMsg = clientError instanceof Error ? clientError.message : String(clientError);
      const errorStack = clientError instanceof Error ? clientError.stack : undefined;
      console.error('[API] Failed to create Supabase client:', {
        error: clientError,
        message: errorMsg,
        stack: errorStack
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:42',message:'createSupabaseServerClient failed',data:{error:errorMsg,isAuthError:errorMsg.includes('cookie')||errorMsg.includes('Failed to create Supabase client')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      // If it's a cookie/environment issue, return 401 (not authenticated)
      // Otherwise return 500 (server error)
      const isAuthError = errorMsg.includes('cookie') || errorMsg.includes('Failed to create Supabase client');
      return NextResponse.json({ 
        isAdmin: false, 
        error: isAuthError ? "Not authenticated" : "Failed to create Supabase client",
        errorDetails: errorMsg,
        userId: undefined,
        role: undefined
      }, { status: isAuthError ? 401 : 500 });
    }
    
    console.log('[API] Getting user session...');
    
    // Try to get session first to debug
    let session, sessionError, user, userError;
    try {
      const sessionResult = await supabase.auth.getSession();
      session = sessionResult.data?.session;
      sessionError = sessionResult.error;
      console.log('[API] Session check:', { 
        hasSession: !!session, 
        sessionError: sessionError?.message,
        userId: session?.user?.id 
      });
    } catch (err) {
      console.error('[API] Error getting session:', err);
      // If we can't get a session, user is not authenticated
      return NextResponse.json({ 
        isAdmin: false, 
        error: "Not authenticated",
        errorDetails: err instanceof Error ? err.message : String(err),
        userId: undefined,
        role: undefined
      }, { status: 401 });
    }
    
    // Get the authenticated user
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:79',message:'Before getUser call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const userResult = await supabase.auth.getUser();
      user = userResult.data?.user;
      userError = userResult.error;
      console.log('[API] User check:', { 
        hasUser: !!user, 
        userError: userError?.message,
        userId: user?.id,
        userEmail: user?.email 
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:87',message:'After getUser call',data:{hasUser:!!user,hasError:!!userError,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      console.error('[API] Error getting user:', err);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:91',message:'getUser exception',data:{error:err instanceof Error ? err.message : String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      // If we can't get user, user is not authenticated
      return NextResponse.json({ 
        isAdmin: false, 
        error: "Not authenticated",
        errorDetails: err instanceof Error ? err.message : String(err),
        userId: undefined,
        role: undefined
      }, { status: 401 });
    }
    
    if (userError || !user) {
      console.error('[API] Auth error:', {
        error: userError,
        message: userError?.message,
        status: userError?.status,
        code: userError?.code
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:107',message:'User auth error',data:{hasError:!!userError,errorMessage:userError?.message,errorCode:userError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ 
        isAdmin: false, 
        error: "Not authenticated",
        errorDetails: userError,
        userId: null,
        role: null
      }, { status: 401 });
    }

    // Use service client to bypass RLS for admin check
    // This ensures we can always check the role even if RLS policies are restrictive
    let serviceClient;
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:120',message:'Before createServiceClient',data:{userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      serviceClient = createServiceClient();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:122',message:'After createServiceClient success',data:{hasClient:!!serviceClient},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (serviceClientError) {
      console.error('[API] Failed to create service client:', {
        error: serviceClientError,
        message: serviceClientError instanceof Error ? serviceClientError.message : 'Unknown error'
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:126',message:'createServiceClient failed',data:{error:serviceClientError instanceof Error ? serviceClientError.message : 'Unknown error'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ 
        isAdmin: false, 
        error: "Failed to create service client",
        details: serviceClientError instanceof Error ? serviceClientError.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Check admin status - service client bypasses RLS
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:134',message:'Before database query',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const { data: profile, error: profileError } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:140',message:'After database query',data:{hasProfile:!!profile,hasError:!!profileError,errorCode:profileError?.code,errorMessage:profileError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (profileError) {
      console.error('[API] Error fetching profile:', {
        error: profileError,
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        userId: user.id,
        // Add more diagnostic info
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:152',message:'Database query error',data:{errorCode:profileError.code,errorMessage:profileError.message,details:profileError.details},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ 
        isAdmin: false, 
        error: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code
      }, { status: 500 });
    }

    // If no profile exists, user is not admin
    if (!profile) {
      console.warn('[API] No profile found for user:', user.id);
      return NextResponse.json({ 
        isAdmin: false,
        role: null,
        userId: user.id,
        message: 'User profile not found'
      });
    }

    // Check admin status - handle case sensitivity and whitespace
    const role = (profile.role || '').toString().trim().toLowerCase();
    const isAdmin = role === 'admin';
    
    // Log detailed info for debugging
    console.log('[API] Admin status check:', {
      userId: user.id,
      userEmail: user.email,
      profileRole: profile.role,
      normalizedRole: role,
      isAdmin: isAdmin
    });
    
    return NextResponse.json({ 
      isAdmin,
      role: profile.role || null,
      userId: user.id,
      debug: {
        profileRole: profile.role,
        normalizedRole: role,
        comparison: role === 'admin'
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'Unknown';
    
    console.error('[API] Admin status check failed (catch-all):', {
      error,
      name: errorName,
      message: errorMessage,
      stack: errorStack,
      // Add environment variable check for debugging
      envCheck: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20),
      }
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-status/route.ts:200',message:'Catch-all error handler',data:{errorName,errorMessage,hasUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasAnonKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Determine if this is an authentication error or server error
    const isAuthError = errorMessage.toLowerCase().includes('cookie') || 
                       errorMessage.toLowerCase().includes('session') ||
                       errorMessage.toLowerCase().includes('unauthorized') ||
                       errorMessage.toLowerCase().includes('not authenticated');
    
    // Always include error details in response for debugging
    const errorResponse: any = { 
      isAdmin: false, 
      error: errorMessage,
      errorName,
      userId: undefined,
      role: undefined
    };
    
    // Include stack trace and env check in development only
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = errorStack;
      errorResponse.envCheck = {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      };
    }
    
    return NextResponse.json(errorResponse, { status: isAuthError ? 401 : 500 });
  }
}
