import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  BillingOperationError,
  billingOperationsEnabled,
  reconcileMembershipSubscription,
} from "@/lib/membership/membership-billing.server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_NOT_CONFIGURED");
  return new Stripe(secretKey, { maxNetworkRetries: 1 });
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Customer-scoped reconciliation. The authenticated user can reconcile only
 * the exact Subscription already bound to their service-owned projection.
 */
export async function POST() {
  if (!billingOperationsEnabled()) {
    return jsonResponse(
      { error: "Billing reconciliation is temporarily unavailable", code: "BILLING_OPERATIONS_UNAVAILABLE" },
      503,
    );
  }

  const authSupabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  try {
    const stripe = getStripeClient();
    const serviceSupabase = createServiceClient();
    const result = await reconcileMembershipSubscription(user.id, {
      async loadMembership(userId) {
        const { data, error } = await serviceSupabase
          .from("billing_memberships")
          .select(
            "user_id, plan_code, stripe_status, pricing_cohort, offer_code, billing_interval, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, access_until, billing_hold",
          )
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw new Error("BILLING_MEMBERSHIP_LOOKUP_FAILED");
        return data;
      },
      retrieveSubscription(subscriptionId) {
        return stripe.subscriptions.retrieve(subscriptionId);
      },
      async applySnapshot(input) {
        const { data, error } = await serviceSupabase.rpc(
          "reconcile_billing_membership_snapshot_v1",
          {
            p_request_id: input.requestId,
            p_user_id: input.userId,
            p_retrieved_at: input.retrievedAt,
            p_snapshot_sha256: input.snapshotSha256,
            p_kind: input.snapshot.kind,
            p_error_code: input.snapshot.errorCode,
            p_plan_code: input.snapshot.planCode,
            p_pricing_cohort: input.snapshot.pricingCohort,
            p_offer_code: input.snapshot.offerCode,
            p_stripe_status: input.snapshot.stripeStatus,
            p_stripe_customer_id: input.snapshot.stripeCustomerId,
            p_stripe_subscription_id: input.snapshot.stripeSubscriptionId,
            p_current_period_start: input.snapshot.currentPeriodStart,
            p_current_period_end: input.snapshot.currentPeriodEnd,
            p_cancel_at_period_end: input.snapshot.cancelAtPeriodEnd,
          },
        );
        if (error || typeof data !== "string") {
          throw new Error("BILLING_RECONCILIATION_DATABASE_FAILED");
        }
        return data;
      },
    });
    return jsonResponse({ reconciled: true, disposition: result.disposition }, 200);
  } catch (error) {
    if (error instanceof BillingOperationError) {
      return jsonResponse(
        { error: "Billing reconciliation is temporarily unavailable", code: error.code },
        error.status,
      );
    }
    console.error("Billing reconciliation failed.");
    return jsonResponse(
      { error: "Billing reconciliation is temporarily unavailable", code: "BILLING_RECONCILIATION_UNAVAILABLE" },
      503,
    );
  }
}
