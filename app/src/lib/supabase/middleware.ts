import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // MAINTENANCE MODE CHECK - Check at the beginning
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Always allow access to maintenance page - return early to prevent redirect loops
  if (request.nextUrl.pathname === '/maintenance') {
    return NextResponse.next();
  }
  
  // Allow access to maintenance page itself and static assets
  if (maintenanceMode) {
    // Create a minimal Supabase client to check if user is admin
    let maintenanceSupabaseResponse = NextResponse.next({
      request,
    });

    const maintenanceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            maintenanceSupabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              maintenanceSupabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await maintenanceSupabase.auth.getUser();

    // If user exists, check if they're admin
    if (user) {
      const { data: profile } = await maintenanceSupabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      // Allow admins to bypass maintenance mode
      if (profile?.role === 'admin') {
        // Continue with normal flow below
      } else {
        // Redirect non-admin users to maintenance page
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        return NextResponse.redirect(url);
      }
    } else {
      // No user, redirect to maintenance page
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.redirect(url);
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/register", "/auth", "/forgot-password", "/reset-password", "/maintenance"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/")
  );

  // Protect routes that require authentication
  if (!user && !isPublicRoute) {
    // No user, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // TEMPORARILY DISABLED: Email verification check
  // This can cause issues during development if email verification is not set up
  // Uncomment when email verification is properly configured
  /*
  if (user && !isPublicRoute && !user.email_confirmed_at) {
    // User is authenticated but email not verified
    const url = request.nextUrl.clone();
    url.pathname = "/auth/verify-email";
    url.searchParams.set("email", user.email || "");
    return NextResponse.redirect(url);
  }
  */

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

