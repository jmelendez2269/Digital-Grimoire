import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  BillingOperationError,
  billingOperationsEnabled,
  createMembershipPortalSession,
} from "@/lib/membership/membership-billing.server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getAbsoluteUrl } from "@/lib/utils";

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
 * POST /api/stripe/create-portal-session
 * Create a Stripe customer portal session for subscription management
 */
export async function POST() {
  if (!billingOperationsEnabled()) {
    return jsonResponse(
      { error: "Billing management is temporarily unavailable", code: "BILLING_OPERATIONS_UNAVAILABLE" },
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
    const result = await createMembershipPortalSession(user.id, {
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
      async retrievePortalConfiguration(configurationId) {
        const configuration = await stripe.billingPortal.configurations.retrieve(
          configurationId,
        );
        return {
          id: configuration.id,
          active: configuration.active,
          features: configuration.features,
        };
      },
      async createPortalSession(input) {
        return stripe.billingPortal.sessions.create({
          customer: input.customerId,
          configuration: input.configurationId,
          return_url: input.returnUrl,
        });
      },
      returnUrl: getAbsoluteUrl("/profile?tab=subscription"),
    });
    return jsonResponse(result, 200);
  } catch (error) {
    if (error instanceof BillingOperationError) {
      return jsonResponse(
        { error: "Billing management is temporarily unavailable", code: error.code },
        error.status,
      );
    }
    console.error("Billing portal session creation failed.");
    return jsonResponse(
      { error: "Billing management is temporarily unavailable", code: "BILLING_OPERATIONS_UNAVAILABLE" },
      503,
    );
  }
}

