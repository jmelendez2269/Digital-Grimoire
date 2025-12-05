import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    // First, check if environment variables are set
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasUrl || !hasAnonKey || !hasServiceKey) {
      console.error('[API] Missing environment variables:', {
        hasUrl,
        hasAnonKey,
        hasServiceKey
      });
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
      supabase = await createSupabaseServerClient();
      console.log('[API] Supabase client created successfully');
    } catch (clientError) {
      const errorMsg = clientError instanceof Error ? clientError.message : String(clientError);
      const errorStack = clientError instanceof Error ? clientError.stack : undefined;
      console.error('[API] Failed to create Supabase client:', {
        error: clientError,
        message: errorMsg,
        stack: errorStack
      });
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
      const userResult = await supabase.auth.getUser();
      user = userResult.data?.user;
      userError = userResult.error;
      console.log('[API] User check:', { 
        hasUser: !!user, 
        userError: userError?.message,
        userId: user?.id,
        userEmail: user?.email 
      });
    } catch (err) {
      console.error('[API] Error getting user:', err);
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
      serviceClient = createServiceClient();
    } catch (serviceClientError) {
      console.error('[API] Failed to create service client:', {
        error: serviceClientError,
        message: serviceClientError instanceof Error ? serviceClientError.message : 'Unknown error'
      });
      return NextResponse.json({ 
        isAdmin: false, 
        error: "Failed to create service client",
        details: serviceClientError instanceof Error ? serviceClientError.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Check admin status - service client bypasses RLS
    const { data: profile, error: profileError } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

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
