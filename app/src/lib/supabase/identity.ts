import type { SupabaseClient } from "@supabase/supabase-js";

export interface VerifiedUserIdentity {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
}

export const VERIFIED_USER_HEADERS = {
  id: "x-prismarium-verified-user-id",
  email: "x-prismarium-verified-user-email",
  displayName: "x-prismarium-verified-display-name",
  journalName: "x-prismarium-verified-journal-name",
} as const;

export async function getVerifiedUserIdentity(
  supabase: SupabaseClient
): Promise<VerifiedUserIdentity | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims || typeof claims.sub !== "string") {
    return null;
  }

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    user_metadata:
      typeof claims.user_metadata === "object" && claims.user_metadata !== null
        ? (claims.user_metadata as Record<string, unknown>)
        : {},
  };
}
