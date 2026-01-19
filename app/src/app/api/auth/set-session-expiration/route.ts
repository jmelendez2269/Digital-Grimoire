import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * API route to set session expiration based on Remember Me preference
 * Sets cookies with appropriate expiration (14 days for Remember Me, default otherwise)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Not authenticated" 
        },
        { status: 401 }
      );
    }

    const { rememberMe } = await request.json();
    
    // Calculate expiration date
    // 14 days = 14 * 24 * 60 * 60 * 1000 milliseconds
    const expirationDays = rememberMe ? 14 : 1; // Default to 1 day if not Remember Me
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (expirationDays * 24 * 60 * 60 * 1000));

    // Get current session to verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No active session" 
        },
        { status: 400 }
      );
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: `Session expiration set to ${expirationDays} day(s)`,
      expirationDays,
    });

    // Set Remember Me preference cookie (for middleware to read)
    // The middleware will use this to set proper expiration for Supabase cookies
    response.cookies.set('remember_me', rememberMe ? 'true' : 'false', {
      expires: expirationDate,
      path: '/',
      httpOnly: false, // Needs to be readable by client-side code
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Note: We don't manually update Supabase cookies here because:
    // 1. Supabase SSR manages its own cookies
    // 2. The middleware will respect the remember_me cookie and set proper expiration
    // 3. On the next request, the middleware will apply the expiration to Supabase cookies

    console.log(`[API] Session expiration set to ${expirationDays} days for user: ${user.id}`);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error setting session expiration:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

