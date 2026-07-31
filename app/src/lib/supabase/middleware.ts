import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getLegacySupabaseCookiePrefixes,
  getSupabaseCookieOptions,
} from "./auth-config";
import { isFreeLibraryText } from "@/lib/library/access";
import { isPublicPath } from "@/lib/routing/public-access";

function getErrorCauseMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "message" in error.cause &&
    typeof error.cause.message === "string"
  ) {
    return error.cause.message;
  }

  return "";
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
  supabaseUrl?: string
) {
  const expiredDate = new Date(0);
  const cookiePrefixes = getLegacySupabaseCookiePrefixes(supabaseUrl);
  const cookieOptions = getSupabaseCookieOptions();

  request.cookies
    .getAll()
    .filter(({ name }) =>
      cookiePrefixes.some(
        (prefix) => name === prefix || name.startsWith(`${prefix}.`)
      )
    )
    .forEach(({ name }) => {
      response.cookies.set(name, "", {
        ...cookieOptions,
        expires: expiredDate,
      });
    });
}

export async function updateSession(request: NextRequest) {
  // MAINTENANCE MODE CHECK - Check at the beginning
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  // Always allow access to maintenance page - return early to prevent redirect loops
  if (request.nextUrl.pathname === "/maintenance") {
    return NextResponse.next();
  }

  // Allow Sentry monitoring tunnel route - return early to prevent authentication
  // Check both exact match and startsWith to handle query parameters
  if (
    request.nextUrl.pathname === "/monitoring" ||
    request.nextUrl.pathname.startsWith("/monitoring")
  ) {
    return NextResponse.next();
  }

  // Allow the video-sync cron to authenticate via CRON_SECRET — Vercel Cron
  // requests carry no browser session/cookies, so the normal login-cookie
  // check below would otherwise always 401 it. The route itself still
  // re-validates this same header (defense in depth).
  if (request.nextUrl.pathname === "/api/admin/videos/sync") {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return NextResponse.next();
    }
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
        cookieOptions: getSupabaseCookieOptions(),
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
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      // Allow admins to bypass maintenance mode
      if (profile?.role === "admin") {
        // Continue with normal flow below
      } else {
        // Redirect non-admin users to maintenance page
        const url = request.nextUrl.clone();
        url.pathname = "/maintenance";
        return NextResponse.redirect(url);
      }
    } else {
      // No user, redirect to maintenance page
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
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
      cookieOptions: getSupabaseCookieOptions(),
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

  // Get user with error handling for invalid refresh tokens
  let user = null;
  try {
    const {
      data: { user: fetchedUser },
      error: authError,
    } = await supabase.auth.getUser();

    // If there's an auth error (like invalid refresh token), clear the session
    if (authError) {
      const isRefreshTokenError =
        authError.message?.includes("refresh_token") ||
        authError.message?.includes("Refresh Token");
      const isFetchError =
        authError.message?.includes("fetch failed") ||
        getErrorCauseMessage(authError).includes("fetch failed");

      if (isRefreshTokenError) {
        console.warn(
          "[Middleware] Invalid refresh token detected, clearing session:",
          authError.message
        );
        clearSupabaseAuthCookies(
          request,
          supabaseResponse,
          process.env.NEXT_PUBLIC_SUPABASE_URL
        );
        // Continue without user - will redirect to login if needed
      } else if (isFetchError) {
        // Suppress noisy fetch errors in middleware, assume offline/unreachable
        // intended: do nothing, just log a short warning
        // Only log once per valid period ideally, but simplified here
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[Middleware] Supabase unreachable (fetch failed). Connection issues?"
          );
        }
      } else {
        console.warn(
          "[Middleware] Auth error (non-refresh-token):",
          authError.message
        );
      }
    } else {
      user = fetchedUser;
    }
  } catch (error) {
    // Catch any unexpected errors during auth check
    console.warn(
      "[Middleware] Error during auth check:",
      error instanceof Error ? error.message : String(error)
    );
    // Continue without user - will redirect to login if needed
  }

  // Course-graph access is enforced inside its route: local development may
  // read a local Supabase import, while deployed candidate reads require an
  // authenticated curator. It must reach that route before this generic gate.
  const isPublicRoute = isPublicPath(request.nextUrl.pathname);

  // Check if this is an API route
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  // Individual library texts that belong to a free course (the taster/pre-course)
  // don't require sign-in, unlike the rest of the gated library.
  const libraryTextMatch = /^\/library\/([^/]+)\/?$/.exec(
    request.nextUrl.pathname
  );
  const isLibraryTextCandidate =
    libraryTextMatch !== null &&
    !["media", "my-library"].includes(libraryTextMatch[1]);

  const apiTextMatch = /^\/api\/texts\/([^/]+)\/?$/.exec(
    request.nextUrl.pathname
  );
  const isApiTextCandidate =
    apiTextMatch !== null && apiTextMatch[1] !== "by-source-urls";

  let isFreeLibraryTextRoute = false;
  if (!user && (isLibraryTextCandidate || isApiTextCandidate)) {
    const textId = (libraryTextMatch ?? apiTextMatch)![1];
    try {
      isFreeLibraryTextRoute = await isFreeLibraryText(supabase, textId);
    } catch (error) {
      console.warn(
        "[Middleware] Failed to check free library text status:",
        error
      );
    }
  }

  // Protect routes that require authentication
  if (!user && !isPublicRoute && !isFreeLibraryTextRoute) {
    // For API routes, return JSON error instead of redirecting
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // For non-API routes, redirect to login
    const url = request.nextUrl.clone();
    const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", redirectPath);
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
