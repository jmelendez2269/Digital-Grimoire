import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[API] Auth error:', userError);
      return NextResponse.json({ isAdmin: false, error: "Not authenticated" }, { status: 401 });
    }

    // Use service client to bypass RLS for admin check
    // This ensures we can always check the role even if RLS policies are restrictive
    const serviceClient = createServiceClient();
    
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
        userId: user.id
      });
      return NextResponse.json({ 
        isAdmin: false, 
        error: profileError.message,
        details: profileError.details 
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
    console.error('[API] Admin status check failed:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      isAdmin: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 });
  }
}
