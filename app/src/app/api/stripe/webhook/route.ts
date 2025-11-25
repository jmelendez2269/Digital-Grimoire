import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Map Stripe price ID to subscription tier
 */
function getTierFromPriceId(priceId: string): 'student' | 'scholar' | 'adept' | 'premium' {
  const studentPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT;
  const scholarPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR;
  const adeptPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT;

  if (studentPriceId && priceId === studentPriceId) return 'student';
  if (scholarPriceId && priceId === scholarPriceId) return 'scholar';
  if (adeptPriceId && priceId === adeptPriceId) return 'adept';
  
  // Legacy: default to scholar for backwards compatibility
  return 'scholar';
}

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events for subscription management
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.customer) {
          const subscriptionId = session.subscription as string;
          const customerId = typeof session.customer === 'string' 
            ? session.customer 
            : session.customer.id;

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          const userId = session.metadata?.user_id;

          if (userId) {
            // Determine tier from price ID
            const priceId = subscription.items.data[0]?.price?.id;
            const tier = priceId ? getTierFromPriceId(priceId) : 'scholar'; // Default to scholar for legacy

            // Update user subscription status
            await supabase
              .from('users')
              .update({
                subscription_status: tier,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                subscription_start_date: new Date(((subscription as any).current_period_start as number) * 1000).toISOString(),
                subscription_end_date: new Date(((subscription as any).current_period_end as number) * 1000).toISOString(),
              })
              .eq('id', userId);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        // Find user by customer ID
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (userData) {
          const status = subscription.status;
          
          if (status === 'active' || status === 'trialing') {
            // Determine tier from price ID
            const priceId = subscription.items.data[0]?.price?.id;
            const tier = priceId ? getTierFromPriceId(priceId) : 'scholar'; // Default to scholar for legacy

            await supabase
              .from('users')
              .update({
                subscription_status: tier,
                stripe_subscription_id: subscription.id,
                subscription_start_date: new Date(((subscription as any).current_period_start as number) * 1000).toISOString(),
                subscription_end_date: new Date(((subscription as any).current_period_end as number) * 1000).toISOString(),
              })
              .eq('id', userData.id);
          } else {
            // Subscription is not active - set to free
            await supabase
              .from('users')
              .update({
                subscription_status: 'free',
                stripe_subscription_id: subscription.id,
                subscription_start_date: new Date(((subscription as any).current_period_start as number) * 1000).toISOString(),
                subscription_end_date: new Date(((subscription as any).current_period_end as number) * 1000).toISOString(),
              })
              .eq('id', userData.id);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        // Find user by customer ID
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (userData) {
          await supabase
            .from('users')
            .update({
              subscription_status: 'free',
              stripe_subscription_id: null,
              subscription_start_date: null,
              subscription_end_date: null,
            })
            .eq('id', userData.id);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof (invoice as any).subscription === 'string' 
          ? (invoice as any).subscription 
          : (invoice as any).subscription?.id;
        
        if (subscriptionId && invoice.customer) {
          // Subscription payment succeeded - ensure status is premium
          const customerId = typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer.id;

          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (userData) {
            // Get subscription to determine tier
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
            const priceId = subscription.items.data[0]?.price?.id;
            const tier = priceId ? getTierFromPriceId(priceId) : 'scholar'; // Default to scholar for legacy

            await supabase
              .from('users')
              .update({ subscription_status: tier })
              .eq('id', userData.id);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof (invoice as any).subscription === 'string' 
          ? (invoice as any).subscription 
          : (invoice as any).subscription?.id;
        
        if (subscriptionId) {
          // Payment failed - you might want to notify the user
          // For now, we'll keep the subscription status as-is
          // Stripe will handle retries automatically
          console.log('Payment failed for subscription:', subscriptionId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

