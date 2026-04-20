const DEV_COOKIE_NAME = "prismarium-auth-token";

function getProjectRefFromUrl(supabaseUrl?: string) {
  return supabaseUrl?.match(/^https?:\/\/([^.]+)\./)?.[1] ?? null;
}

export function getSupabaseAuthCookieName() {
  return process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME || DEV_COOKIE_NAME;
}

export function getSupabaseCookieOptions() {
  return {
    name: getSupabaseAuthCookieName(),
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function getLegacySupabaseCookiePrefixes(supabaseUrl?: string) {
  const prefixes = new Set<string>([
    getSupabaseAuthCookieName(),
    "sb-access-token",
    "sb-refresh-token",
  ]);

  const projectRef = getProjectRefFromUrl(supabaseUrl);
  if (projectRef) {
    prefixes.add(`sb-${projectRef}-auth-token`);
  }

  return [...prefixes];
}
