const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/register",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/search",
  "/courses",
  "/graph",
  "/knowledge-graph",
  "/workings",
  "/blog",
  "/api/courses",
  "/api/proxy-image",
  "/api/concepts",
  "/api/course-graph",
  "/api/graph",
  "/api/stripe/webhook",
  "/api/blog",
] as const;

/**
 * These routes are public only at the exact path. Keeping them separate from
 * prefix routes lets visitors browse catalog metadata without opening a
 * protected book or accidentally exposing future API sub-routes.
 */
const PUBLIC_EXACT_ROUTES = [
  "/",
  "/library",
  "/explore",
  "/explore/workings",
  "/pricing",
  "/seven-lenses",
  "/api/library/catalog",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (
    PUBLIC_EXACT_ROUTES.some(
      (route) => pathname === route || pathname === `${route}/`
    )
  ) {
    return true;
  }

  return PUBLIC_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Public pages do not need a server-side session refresh before they render.
 * The home route is the one exception when an auth cookie exists because it
 * renders the signed-in member home on the server.
 */
export function shouldBypassPublicSessionRefresh(
  pathname: string,
  hasAuthCookie: boolean
): boolean {
  if (!isPublicPath(pathname)) return false;

  const normalizedPath =
    pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  return normalizedPath !== "/" || !hasAuthCookie;
}
