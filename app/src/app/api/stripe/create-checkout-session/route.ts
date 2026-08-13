import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import {
  MembershipCheckoutError,
  createMembershipCheckout,
  parseMembershipCheckoutRequest,
  type CheckoutRequestRecord,
} from "@/lib/membership/membership-checkout.server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

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
 * POST /api/stripe/create-checkout-session
 *
 * Accepts only an offer code and a UUIDv4 request ID. The browser never sends
 * Price, amount, tier, mode, customer, or subscription authority.
 */
export async function POST(request: NextRequest) {
  let checkoutRequest;
  try {
    checkoutRequest = parseMembershipCheckoutRequest(await request.json());
  } catch (error) {
    if (error instanceof MembershipCheckoutError) {
      return jsonResponse({ error: "Invalid checkout request", code: error.code }, 400);
    }
    return jsonResponse(
      { error: "Invalid checkout request", code: "INVALID_CHECKOUT_REQUEST" },
      400,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  try {
    const serviceSupabase = createServiceClient();
    const profile = await serviceSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile.error || typeof profile.data?.role !== "string") {
      return jsonResponse(
        { error: "Checkout is temporarily unavailable", code: "CHECKOUT_UNAVAILABLE" },
        503,
      );
    }

    const result = await createMembershipCheckout(
      {
        userId: user.id,
        userEmail: user.email ?? null,
        userRole: profile.data.role,
        request: checkoutRequest,
      },
      {
        appUrl: getAppUrl(),
        async loadMembership(userId) {
          const { data, error } = await serviceSupabase
            .from("billing_memberships")
            .select(
              "plan_code, stripe_status, billing_hold, stripe_customer_id, stripe_subscription_id",
            )
            .eq("user_id", userId)
            .maybeSingle();
          if (error) throw new Error("MEMBERSHIP_LOOKUP_FAILED");
          return data;
        },
        async reserveRequest(input) {
          const inserted = await serviceSupabase
            .from("billing_checkout_requests")
            .insert({
              user_id: input.userId,
              request_id: input.requestId,
              offer_code: input.offerCode,
              request_fingerprint: input.requestFingerprint,
            })
            .select(
              "request_fingerprint, state, stripe_checkout_session_id, checkout_url",
            )
            .single();

          if (!inserted.error && inserted.data) {
            return {
              inserted: true,
              record: inserted.data as CheckoutRequestRecord,
            };
          }
          if (inserted.error?.code !== "23505") {
            throw new Error("CHECKOUT_RESERVATION_FAILED");
          }

          const existing = await serviceSupabase
            .from("billing_checkout_requests")
            .select(
              "request_fingerprint, state, stripe_checkout_session_id, checkout_url",
            )
            .eq("user_id", input.userId)
            .eq("request_id", input.requestId)
            .maybeSingle();
          if (existing.error || !existing.data) {
            throw new Error("CHECKOUT_RESERVATION_LOOKUP_FAILED");
          }
          return {
            inserted: false,
            record: existing.data as CheckoutRequestRecord,
          };
        },
        async completeRequest(input) {
          const completed = await serviceSupabase
            .from("billing_checkout_requests")
            .update({
              state: "session_created",
              stripe_checkout_session_id: input.sessionId,
              checkout_url: input.checkoutUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", input.userId)
            .eq("request_id", input.requestId)
            .eq("request_fingerprint", input.requestFingerprint)
            .eq("state", "pending")
            .select("request_id")
            .maybeSingle();
          if (completed.error) {
            throw new Error("CHECKOUT_COMPLETION_FAILED");
          }
          if (completed.data) return;

          // A concurrent replay can finish the same Stripe-idempotent Session
          // first. Accept only the exact completed result; every mismatch fails.
          const concurrent = await serviceSupabase
            .from("billing_checkout_requests")
            .select(
              "state, request_fingerprint, stripe_checkout_session_id, checkout_url",
            )
            .eq("user_id", input.userId)
            .eq("request_id", input.requestId)
            .maybeSingle();
          if (
            concurrent.error ||
            concurrent.data?.state !== "session_created" ||
            concurrent.data.request_fingerprint !== input.requestFingerprint ||
            concurrent.data.stripe_checkout_session_id !== input.sessionId ||
            concurrent.data.checkout_url !== input.checkoutUrl
          ) {
            throw new Error("CHECKOUT_COMPLETION_FAILED");
          }
        },
        async createSession(input) {
          const stripe = getStripeClient();
          const customer = input.customerId
            ? { customer: input.customerId }
            : { customer_email: input.customerEmail ?? undefined };
          const session = await stripe.checkout.sessions.create(
            {
              ...customer,
              mode: "subscription",
              payment_method_types: ["card"],
              line_items: [{ price: input.priceId, quantity: 1 }],
              success_url: input.successUrl,
              cancel_url: input.cancelUrl,
              client_reference_id: input.userId,
              metadata: {
                user_id: input.userId,
                offer_code: input.offerCode,
                request_id: input.requestId,
              },
              subscription_data: {
                metadata: {
                  user_id: input.userId,
                  offer_code: input.offerCode,
                  request_id: input.requestId,
                },
              },
            },
            { idempotencyKey: input.idempotencyKey },
          );
          return { id: session.id, url: session.url };
        },
      },
    );

    return jsonResponse(result, 200);
  } catch (error) {
    if (error instanceof MembershipCheckoutError) {
      const message =
        error.code === "ACTIVE_MEMBERSHIP_EXISTS"
          ? "An existing membership must be managed before starting another checkout."
          : error.code === "CHECKOUT_REQUEST_CONFLICT"
            ? "That checkout request ID was already used for a different request."
            : "Checkout is temporarily unavailable.";
      return jsonResponse({ error: message, code: error.code }, error.status);
    }
    console.error("Checkout session creation failed.");
    return jsonResponse(
      { error: "Checkout is temporarily unavailable", code: "CHECKOUT_UNAVAILABLE" },
      503,
    );
  }
}
