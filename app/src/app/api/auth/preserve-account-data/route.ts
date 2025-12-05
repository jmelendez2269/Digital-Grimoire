import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * API route to preserve admin status and sync profile picture
 * Called after password reset or account linking to ensure data is preserved
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[API] Auth error:', userError);
      return NextResponse.json({ 
        success: false, 
        error: "Not authenticated" 
      }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    let adminPreserved = false;
    let avatarSynced = false;

    // 1. Preserve admin status
    if (user.email) {
      try {
        // Check current user's role
        const { data: currentProfile } = await serviceClient
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        // If current user is not admin, check if there's an existing admin profile with same email
        if (currentProfile?.role !== 'admin') {
          const { data: existingAdminProfile } = await serviceClient
            .from('users')
            .select('id, role')
            .eq('email', user.email)
            .eq('role', 'admin')
            .maybeSingle();

          // If an admin profile exists with the same email, update current user to admin
          if (existingAdminProfile) {
            const { error: roleUpdateError } = await serviceClient
              .from('users')
              .update({ role: 'admin', updated_at: new Date().toISOString() })
              .eq('id', user.id);

            if (roleUpdateError) {
              console.error('⚠️ Failed to preserve admin role:', roleUpdateError);
            } else {
              console.log('✅ Admin role preserved');
              adminPreserved = true;
            }
          }
        } else {
          adminPreserved = true; // Already admin
        }
      } catch (err) {
        console.error('⚠️ Error preserving admin status:', err);
      }
    }

    // 2. Sync profile picture from Google if available
    try {
      const currentAvatarUrl = user.user_metadata?.avatar_url;
      
      // Check for Google profile picture in metadata
      const googleAvatarUrl = 
        user.user_metadata?.picture ||
        (user as any).raw_user_meta_data?.avatar_url ||
        (user as any).raw_user_meta_data?.picture ||
        (user as any).raw_app_meta_data?.avatar_url ||
        (user as any).raw_app_meta_data?.picture;

      // If Google provided an avatar, sync it (update if different or missing)
      const hasNoAvatar = !currentAvatarUrl || currentAvatarUrl.trim() === '';
      const avatarNeedsUpdate = googleAvatarUrl && (hasNoAvatar || currentAvatarUrl !== googleAvatarUrl);
      
      if (avatarNeedsUpdate) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            avatar_url: googleAvatarUrl,
          },
        });

        if (updateError) {
          console.error('⚠️ Failed to sync Google profile picture:', updateError);
        } else {
          console.log('✅ Google profile picture synced', {
            hadAvatar: !hasNoAvatar,
            newAvatar: googleAvatarUrl
          });
          avatarSynced = true;
        }
      } else if (googleAvatarUrl || currentAvatarUrl) {
        avatarSynced = true; // Already has avatar (either Google or existing)
      }
    } catch (err) {
      console.error('⚠️ Error syncing profile picture:', err);
    }

    return NextResponse.json({ 
      success: true,
      adminPreserved,
      avatarSynced,
      message: 'Account data preservation completed'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Account data preservation failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage
    }, { status: 500 });
  }
}

