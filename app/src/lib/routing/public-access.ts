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
  "/explore/workings",
  "/blog",
  "/api/courses",
  "/api/proxy-image",
  "/api/concepts",
  "/api/course-graph",
  "/api/graph",
  "/api/working/community",
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
  "/pricing",
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
