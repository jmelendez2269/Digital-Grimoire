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
        details: { hasUrl, hasAnonKey, hasServiceKey }
      }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[API] Auth error:', {
        error: userError,
        message: userError?.message,
        status: userError?.status,
        code: userError?.code
      });
      return NextResponse.json({ isAdmin: false, error: "Not authenticated" }, { status: 401 });
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

    const isAdmin = profile.role === 'admin';
    
    return NextResponse.json({ 
      isAdmin,
      role: profile.role || null,
      userId: user.id
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[API] Admin status check failed:', {
      error,
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
    
    return NextResponse.json({ 
      isAdmin: false, 
      error: errorMessage,
      // Include helpful debugging info in development
      ...(process.env.NODE_ENV === 'development' && {
        hint: "Check server console for detailed error logs. Verify SUPABASE_SERVICE_ROLE_KEY is set in .env.local",
        stack: errorStack,
        envCheck: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
      })
    }, { status: 500 });
  }
}
