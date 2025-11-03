import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ isAdmin: false, error: "Not authenticated" }, { status: 401 });
    }

    // Check admin status - server-side bypasses RLS
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[API] Error fetching profile:', profileError);
      return NextResponse.json({ isAdmin: false, error: profileError.message }, { status: 500 });
    }

    const isAdmin = profile?.role === 'admin';
    
    return NextResponse.json({ 
      isAdmin,
      role: profile?.role || null,
      userId: user.id
    });
  } catch (error) {
    console.error('[API] Admin status check failed:', error);
    return NextResponse.json({ isAdmin: false, error: "Internal server error" }, { status: 500 });
  }
}
