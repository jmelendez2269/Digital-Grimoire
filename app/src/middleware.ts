import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (request.method === "GET" && pathname === "/api/membership/catalog") {
    return NextResponse.next();
  }

  if (
    process.env.NODE_ENV === "development" &&
    (pathname === "/dev/course-parser-preview" ||
      pathname === "/dev/membership-catalog")
  ) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt and sitemap.xml (crawler metadata)
     * - /monitoring (Sentry tunnel route)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
