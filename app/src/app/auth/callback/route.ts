import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import { getSupabaseCookieOptions } from '@/lib/supabase/auth-config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type CookieToSet = Parameters<NextResponse['cookies']['set']>

function createCallbackClient(request: NextRequest) {
  const requestCookies = new Map(
    request.cookies.getAll().map((cookie) => [cookie.name, cookie.value])
  )
  const responseCookies: CookieToSet[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return Array.from(requestCookies.entries()).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            requestCookies.set(name, value)
            responseCookies.push([name, value, options])
          })
        },
      },
    }
  )

  return { supabase, responseCookies }
}

function redirectWithCookies(
  request: NextRequest,
  path: string,
  responseCookies: CookieToSet[]
) {
  const response = NextResponse.redirect(new URL(path, request.url))
  responseCookies.forEach((cookie) => response.cookies.set(...cookie))
  return response
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    const providerExchangeFailed =
      errorDescription?.includes('external code: 4/0A') ?? false
    const errorMessage =
      error === 'access_denied'
        ? 'Sign-in was cancelled'
        : providerExchangeFailed
          ? 'Google sign-in reached Supabase, but Google rejected the code exchange. In Supabase Auth > Providers > Google, make sure the Client ID and Secret are from the same Google OAuth client whose Authorized redirect URI is your Supabase /auth/v1/callback URL.'
          : errorDescription || 'Authentication failed'

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }

  // Handle OAuth code exchange
  if (code) {
    const { supabase, responseCookies } = createCallbackClient(request)
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      const errorMessage = exchangeError.message.includes('external code: 4/0A')
        ? 'Google sign-in reached Supabase, but Google rejected the code exchange. In Supabase Auth > Providers > Google, make sure the Client ID and Secret are from the same Google OAuth client whose Authorized redirect URI is your Supabase /auth/v1/callback URL.'
        : exchangeError.message

      return redirectWithCookies(
        request,
        `/login?error=${encodeURIComponent(errorMessage)}`,
        responseCookies
      )
    }

    if (data.session && data.user) {
      console.log('OAuth authentication successful', {
        userId: data.user.id,
        email: data.user.email,
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

      const hasNoAvatar = !currentAvatarUrl || currentAvatarUrl.trim() === ''
      const avatarNeedsUpdate =
        googleAvatarUrl && (hasNoAvatar || currentAvatarUrl !== googleAvatarUrl)

      if (avatarNeedsUpdate) {
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              avatar_url: googleAvatarUrl,
            },
          })

          if (updateError) {
            console.error('Failed to sync Google profile picture:', updateError)
          } else {
            console.log('Google profile picture synced successfully', {
              hadAvatar: !hasNoAvatar,
              newAvatar: googleAvatarUrl,
            })
          }
        } catch (err) {
          console.error('Error syncing Google profile picture:', err)
        }
      } else if (googleAvatarUrl) {
        console.log('Google profile picture already synced')
      }

      // Preserve admin status when accounts are linked.
      if (user.email) {
        try {
          const serviceClient = createServiceClient()

          const { data: currentProfile } = await serviceClient
            .from('users')
            .select('id, role')
            .eq('id', user.id)
            .maybeSingle()

          const { data: existingAdminProfile } = await serviceClient
            .from('users')
            .select('id, role')
            .eq('email', user.email)
            .eq('role', 'admin')
            .maybeSingle()

          if (!currentProfile) {
            const initialRole = existingAdminProfile ? 'admin' : 'user'

            const { error: createError } = await serviceClient
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                name:
                  user.user_metadata?.username ||
                  user.user_metadata?.display_name ||
                  user.email?.split('@')[0] ||
                  'User',
                role: initialRole,
                email_verified: user.email_confirmed_at ? true : false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })

            if (createError) {
              console.error('Failed to create profile:', createError)
            } else {
              console.log(`Profile created with role: ${initialRole}`)
            }
          } else if (currentProfile.role !== 'admin' && existingAdminProfile) {
            const { error: roleUpdateError } = await serviceClient
              .from('users')
              .update({ role: 'admin', updated_at: new Date().toISOString() })
              .eq('id', user.id)

            if (roleUpdateError) {
              console.error(
                'Failed to preserve admin role after account linking:',
                roleUpdateError
              )
            } else {
              console.log('Admin role preserved after account linking')
            }
          } else if (currentProfile?.role === 'admin') {
            console.log('User already has admin role')
          }

          if (existingAdminProfile) {
            const { error: bulkUpdateError } = await serviceClient
              .from('users')
              .update({ role: 'admin', updated_at: new Date().toISOString() })
              .eq('email', user.email)
              .neq('role', 'admin')

            if (bulkUpdateError) {
              console.error('Failed to update all profiles to admin:', bulkUpdateError)
            } else {
              console.log('Ensured all profiles with this email have admin role')
            }
          }
        } catch (err) {
          console.error('Error checking/preserving admin status:', err)
        }
      }

      return redirectWithCookies(request, next, responseCookies)
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=authentication_failed', request.url)
  )
}
