import "server-only";

import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getVerifiedUserIdentity,
  VERIFIED_USER_HEADERS,
  type VerifiedUserIdentity,
} from "@/lib/supabase/identity";

function decodeHeaderValue(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export async function getRequestVerifiedUserIdentity(
  supabase: SupabaseClient
): Promise<VerifiedUserIdentity | null> {
  const requestHeaders = await headers();
  const id = requestHeaders.get(VERIFIED_USER_HEADERS.id);

  if (!id) {
    return getVerifiedUserIdentity(supabase);
  }

  const displayName = decodeHeaderValue(
    requestHeaders.get(VERIFIED_USER_HEADERS.displayName)
  );
  const journalName = decodeHeaderValue(
    requestHeaders.get(VERIFIED_USER_HEADERS.journalName)
  );

  return {
    id,
    email: decodeHeaderValue(requestHeaders.get(VERIFIED_USER_HEADERS.email)),
    user_metadata: {
      ...(displayName ? { display_name: displayName } : {}),
      ...(journalName ? { journal_name: journalName } : {}),
    },
  };
}
