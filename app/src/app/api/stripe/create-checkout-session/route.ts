import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import {
  guardCheckoutOffer,
  guardCommercialAction,
} from "@/lib/commercial-availability";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getAbsoluteUrl } from "@/lib/utils";

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured");
  }

  return new Stripe(secretKey);
}

/**
 * POST /api/stripe/create-checkout-session
 *
 * L0-04 containment keeps this route closed by default. Reopening it requires
 * the exact `checkout` action token and an exact server-only Price allowlist.
 */
export async function POST(request: NextRequest) {
  const unavailable = guardCommercialAction("checkout");
  if (unavailable) return unavailable;

  try {
    const body = await request.json().catch(() => ({}));
    const priceId = body?.priceId;

    const unsupportedOffer = guardCheckoutOffer(priceId);
    if (unsupportedOffer) return unsupportedOffer;

    if (body?.mode !== undefined && body.mode !== "subscription") {
      return NextResponse.json(
        { error: "This action is temporarily unavailable.", code: "ACTION_TEMPORARILY_UNAVAILABLE" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "This action is temporarily unavailable.", code: "ACTION_TEMPORARILY_UNAVAILABLE" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Offer validation intentionally precedes Supabase and Stripe client use.
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();
    const stripe = getStripeClient();
    let customerId: string | undefined;

    const { data: userData } = await serviceSupabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (userData?.stripe_customer_id) {
      try {
        await stripe.customers.retrieve(userData.stripe_customer_id);
        customerId = userData.stripe_customer_id;
      } catch (error) {
        const stripeError = error as { code?: string; type?: string };
        const customerIsMissing = stripeError.code === "resource_missing";

        if (!customerIsMissing) throw error;

        await serviceSupabase
          .from("users")
          .update({ stripe_customer_id: null })
          .eq("id", user.id);
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      const { error: updateError } = await serviceSupabase
        .from("users")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to save Stripe customer reference", updateError);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: getAbsoluteUrl("/profile?tab=subscription&success=true"),
      cancel_url: getAbsoluteUrl("/profile?tab=subscription&canceled=true"),
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session", error);
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
