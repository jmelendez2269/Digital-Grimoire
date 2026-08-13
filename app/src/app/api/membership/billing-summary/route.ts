import { NextResponse } from "next/server";

import { billingSummaryFromProjection } from "@/lib/membership/membership-billing.server";
import { createServiceClient } from "@/lib/supabase/service";
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

/** Customer-safe billing state. Raw Stripe identifiers never leave the server. */
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
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from("billing_memberships")
      .select(
        "user_id, plan_code, stripe_status, pricing_cohort, offer_code, billing_interval, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, access_until, billing_hold",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error("BILLING_SUMMARY_LOOKUP_FAILED");

    return jsonResponse({ billing: billingSummaryFromProjection(data) }, 200);
  } catch {
    console.error("Billing summary lookup failed.");
    return jsonResponse(
      { error: "Billing summary is temporarily unavailable", code: "BILLING_SUMMARY_UNAVAILABLE" },
      503,
    );
  }
}
