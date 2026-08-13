import { NextResponse } from "next/server";

import { getCreditWalletForUser } from "@/lib/membership/membership-wallet.server";
import { createClient } from "@/lib/supabase/server";

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Customer-safe wallet state. The authenticated identity is the only scope. */
export async function GET() {
  const authSupabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  try {
    const wallet = await getCreditWalletForUser(user.id);
    return jsonResponse({ wallet }, 200);
  } catch {
    console.error("Credit wallet lookup failed.");
    return jsonResponse(
      {
        error: "Credit wallet is temporarily unavailable",
        code: "CREDIT_WALLET_UNAVAILABLE",
      },
      503,
    );
  }
}
