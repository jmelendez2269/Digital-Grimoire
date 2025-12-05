import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
    const errorMessage = errorDescription || error === 'access_denied' 
      ? 'Sign-in was cancelled' 
      : 'Authentication failed'
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }

  // Handle OAuth code exchange
  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('❌ Code exchange error:', exchangeError)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
      )
    }

    if (data.session && data.user) {
      console.log('✅ OAuth authentication successful', {
        userId: data.user.id,
        email: data.user.email
      })
      
      // Check if user has a Google profile picture that should be synced
      const user = data.user
      const currentAvatarUrl = user.user_metadata?.avatar_url
      
      // Google OAuth provides the picture in raw_user_meta_data or raw_app_meta_data
      // Check both locations for the profile picture (exclude current avatar_url from this check)
      const googleAvatarUrl = 
        user.user_metadata?.picture ||
        (user as any).raw_user_meta_data?.avatar_url ||
        (user as any).raw_user_meta_data?.picture ||
        (user as any).raw_app_meta_data?.avatar_url ||
        (user as any).raw_app_meta_data?.picture

      // If Google provided an avatar, sync it (update if different or missing)
      const hasNoAvatar = !currentAvatarUrl || currentAvatarUrl.trim() === ''
      const avatarNeedsUpdate = googleAvatarUrl && (hasNoAvatar || currentAvatarUrl !== googleAvatarUrl)
      
      if (avatarNeedsUpdate) {
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              avatar_url: googleAvatarUrl,
            },
          })

          if (updateError) {
            console.error('⚠️ Failed to sync Google profile picture:', updateError)
            // Don't fail the auth flow if this fails
          } else {
            console.log('✅ Google profile picture synced successfully', {
              hadAvatar: !hasNoAvatar,
              newAvatar: googleAvatarUrl
            })
          }
        } catch (err) {
          console.error('⚠️ Error syncing Google profile picture:', err)
          // Don't fail the auth flow if this fails
        }
      } else if (googleAvatarUrl) {
        console.log('✅ Google profile picture already synced')
      }

      // Preserve admin status when accounts are linked
      // This is critical: OAuth might create a new user or the trigger might create a profile with role='user'
      if (user.email) {
        try {
          const serviceClient = createServiceClient()
          
          // First, ensure profile exists for current user (trigger might not have run yet)
          const { data: currentProfile } = await serviceClient
            .from('users')
            .select('id, role')
            .eq('id', user.id)
            .maybeSingle()

          // If profile doesn't exist, create it (but check for admin first)
          if (!currentProfile) {
            // Check if ANY profile with this email has admin role
            const { data: adminCheck } = await serviceClient
              .from('users')
              .select('role')
              .eq('email', user.email)
              .eq('role', 'admin')
              .maybeSingle()

            const initialRole = adminCheck ? 'admin' : 'user'

            // Create profile with correct role
            const { error: createError } = await serviceClient
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.username || user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
                role: initialRole,
                email_verified: user.email_confirmed_at ? true : false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (createError) {
              console.error('⚠️ Failed to create profile:', createError)
            } else {
              console.log(`✅ Profile created with role: ${initialRole}`)
            }
          } else {
            // Profile exists - check if we need to upgrade to admin
            if (currentProfile.role !== 'admin') {
              // Check if ANY profile with this email has admin role
              const { data: existingAdminProfile } = await serviceClient
                .from('users')
                .select('id, role')
                .eq('email', user.email)
                .eq('role', 'admin')
                .maybeSingle()

              // If an admin profile exists with the same email, update current user to admin
              if (existingAdminProfile) {
                const { error: roleUpdateError } = await serviceClient
                  .from('users')
                  .update({ role: 'admin', updated_at: new Date().toISOString() })
                  .eq('id', user.id)

                if (roleUpdateError) {
                  console.error('⚠️ Failed to preserve admin role after account linking:', roleUpdateError)
                } else {
                  console.log('✅ Admin role preserved after account linking')
                }
              }
            } else {
              console.log('✅ User already has admin role')
            }
          }

          // Also update ALL profiles with this email to admin (handles duplicate profiles)
          const { error: bulkUpdateError } = await serviceClient
            .from('users')
            .update({ role: 'admin', updated_at: new Date().toISOString() })
            .eq('email', user.email)
            .neq('role', 'admin')

          if (bulkUpdateError) {
            console.error('⚠️ Failed to update all profiles to admin:', bulkUpdateError)
          } else {
            console.log('✅ Ensured all profiles with this email have admin role')
          }
        } catch (err) {
          console.error('⚠️ Error checking/preserving admin status:', err)
          // Don't fail the auth flow if this fails
        }
      }
      
      // Successfully authenticated, redirect to dashboard
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If no code and no error, redirect to login
  return NextResponse.redirect(
    new URL('/login?error=authentication_failed', request.url)
  )
}

