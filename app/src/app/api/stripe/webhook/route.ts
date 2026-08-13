import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import {
  normalizeMembershipWebhookEvent,
  stripeLivemodeFromSecretKey,
  stripeWebhookPayloadSha256,
} from "@/lib/membership/membership-webhook.server";
import { createServiceClient } from "@/lib/supabase/service";

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
 * POST /api/stripe/webhook
 *
 * The exact raw body is signature-verified before any database client exists.
 * One service-role RPC atomically records the event and applies, ignores, or
 * quarantines its ordered membership projection.
 */
export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return jsonResponse(
      { error: "Webhook is temporarily unavailable", code: "WEBHOOK_UNAVAILABLE" },
      503,
    );
  }

  const expectedLivemode = stripeLivemodeFromSecretKey(secretKey);
  if (expectedLivemode === null) {
    return jsonResponse(
      { error: "Webhook is temporarily unavailable", code: "WEBHOOK_UNAVAILABLE" },
      503,
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse(
      { error: "Invalid signature", code: "INVALID_WEBHOOK_SIGNATURE" },
      400,
    );
  }

  let event: Stripe.Event;
  try {
    event = new Stripe(secretKey, { maxNetworkRetries: 1 }).webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch {
    console.error("Webhook signature verification failed.");
    return jsonResponse(
      { error: "Invalid signature", code: "INVALID_WEBHOOK_SIGNATURE" },
      400,
    );
  }

  if (event.livemode !== expectedLivemode) {
    return jsonResponse(
      { error: "Webhook mode mismatch", code: "WEBHOOK_MODE_MISMATCH" },
      400,
    );
  }

  const normalized = normalizeMembershipWebhookEvent(
    event,
    stripeWebhookPayloadSha256(rawBody),
  );

  try {
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase.rpc(
      "process_billing_webhook_event",
      {
        p_event_id: normalized.eventId,
        p_event_type: normalized.eventType,
        p_livemode: normalized.livemode,
        p_api_version: normalized.apiVersion,
        p_event_created: normalized.eventCreated,
        p_payload_sha256: normalized.payloadSha256,
        p_kind: normalized.kind,
        p_error_code: normalized.errorCode,
        p_user_id: normalized.userId,
        p_plan_code: normalized.planCode,
        p_pricing_cohort: normalized.pricingCohort,
        p_offer_code: normalized.offerCode,
        p_stripe_status: normalized.stripeStatus,
        p_stripe_customer_id: normalized.stripeCustomerId,
        p_stripe_subscription_id: normalized.stripeSubscriptionId,
        p_current_period_start: normalized.currentPeriodStart,
        p_current_period_end: normalized.currentPeriodEnd,
        p_cancel_at_period_end: normalized.cancelAtPeriodEnd,
      },
    );
    if (error || typeof data !== "string") {
      throw new Error("WEBHOOK_DATABASE_PROCESSING_FAILED");
    }

    return jsonResponse({ received: true, disposition: data }, 200);
  } catch {
    console.error("Webhook database processing failed.");
    return jsonResponse(
      { error: "Webhook processing failed", code: "WEBHOOK_PROCESSING_FAILED" },
      500,
    );
  }
}
