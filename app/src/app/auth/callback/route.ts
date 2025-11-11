import { createClient } from '@/lib/supabase/server'
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

    if (data.session) {
      console.log('✅ OAuth authentication successful')
      // Successfully authenticated, redirect to dashboard
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If no code and no error, redirect to login
  return NextResponse.redirect(
    new URL('/login?error=authentication_failed', request.url)
  )
}

