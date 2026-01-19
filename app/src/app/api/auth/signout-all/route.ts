import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * API route to sign out user from all sessions
 * Uses Supabase Admin API to revoke all refresh tokens for the user
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
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

    // Use service client to revoke all sessions
    // This requires admin privileges to sign out from all devices
    const serviceClient = createServiceClient();
    
    // Sign out from all sessions using admin API
    // This revokes all refresh tokens for the user
    // Try the admin signOut method first
    let signOutError = null;
    
    try {
      // Attempt to use admin.signOut if available
      const result = await serviceClient.auth.admin.signOut(user.id);
      signOutError = result.error;
    } catch (err) {
      // If signOut method doesn't exist, use REST API directly
      console.log('[API] Admin signOut method not available, using REST API');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase credentials');
      }
      
      // Use REST API to revoke all refresh tokens
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}/sessions`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to revoke sessions: ${response.status} ${errorText}`);
      }
    }

    if (signOutError) {
      console.error('[API] Error signing out from all sessions:', signOutError);
      return NextResponse.json(
        { 
          success: false, 
          error: signOutError.message || "Failed to sign out from all sessions" 
        },
        { status: 500 }
      );
    }

    console.log('[API] Successfully signed out user from all sessions:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Signed out from all sessions'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error in signout-all:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

