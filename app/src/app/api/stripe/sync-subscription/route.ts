import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(secretKey);
}

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
 * POST /api/stripe/sync-subscription
 * Sync subscription status from Stripe to database
 * This is a fallback for when webhooks haven't fired yet (e.g., local development)
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, stripe_subscription_id, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const stripe = getStripeClient();
    let subscription: Stripe.Subscription | null = null;
    let customerId: string | null = userData.stripe_customer_id || null;

    // Strategy 1: Try to get subscription by subscription ID from database
    if (userData.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id);
        if (subscription.customer) {
          customerId = typeof subscription.customer === 'string' 
            ? subscription.customer 
            : subscription.customer.id;
        }
      } catch (err) {
        console.log('Subscription ID not found, trying other methods...');
      }
    }

    // Strategy 2: If no subscription found, try to get from customer ID
    if (!subscription && userData.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: userData.stripe_customer_id,
          status: 'all',
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0];
          customerId = userData.stripe_customer_id;
        }
      } catch (err) {
        console.error('Error fetching subscriptions from customer:', err);
      }
    }

    // Strategy 3: If still no subscription, look up customer by email
    // This handles cases where customer ID wasn't saved to database yet
    if (!subscription && user.email) {
      try {
        // Search for customers by email
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          
          // Now get subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            subscription = subscriptions.data[0];
          }
        }
      } catch (err) {
        console.error('Error looking up customer by email:', err);
      }
    }

    // Strategy 4: Look up recent checkout sessions by email
    // This is a fallback for when customer hasn't been created yet
    // Also check by user_id in metadata (more reliable)
    if (!subscription && user.email) {
      try {
        // First try to find by user_id in metadata (most reliable)
        const sessionsByMetadata = await stripe.checkout.sessions.list({
          limit: 10,
        });

        let userSession = sessionsByMetadata.data.find(
          session => 
            session.status === 'complete' &&
            session.metadata?.user_id === user.id &&
            session.mode === 'subscription' &&
            session.subscription
        );

        // Fallback to email if metadata search didn't work
        if (!userSession) {
          userSession = sessionsByMetadata.data.find(
            session => 
              session.status === 'complete' &&
              session.customer_email === user.email &&
              session.mode === 'subscription' &&
              session.subscription
          );
        }

        if (userSession && userSession.subscription) {
          const subscriptionId = typeof userSession.subscription === 'string'
            ? userSession.subscription
            : userSession.subscription.id;
          
          try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
            
            if (userSession.customer) {
              customerId = typeof userSession.customer === 'string'
                ? userSession.customer
                : userSession.customer.id;
            }
          } catch (subErr) {
            console.log('Subscription from checkout session not yet available, may need to retry:', subErr);
          }
        }
      } catch (err) {
        console.error('Error looking up checkout sessions:', err);
      }
    }

    if (!subscription) {
      return NextResponse.json(
        { 
          message: 'No active subscription found',
          synced: false 
        },
        { status: 200 }
      );
    }

    // Determine tier from price ID
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = priceId ? getTierFromPriceId(priceId) : 'scholar';

    // Helper function to safely convert Unix timestamp to ISO string
    const toISOString = (timestamp: number | undefined | null): string | null => {
      if (!timestamp) return null;
      // Stripe timestamps are in seconds, convert to milliseconds
      const date = new Date(timestamp * 1000);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return null;
      }
      return date.toISOString();
    };

    // Extract period dates for type safety
    // Using 'as any' because Stripe types may not expose these properties correctly
    const currentPeriodStart = (subscription as any).current_period_start as number | undefined;
    const currentPeriodEnd = (subscription as any).current_period_end as number | undefined;

    // Log subscription details for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Subscription details:', {
        id: subscription.id,
        status: subscription.status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
        items: subscription.items.data.length,
        priceId: subscription.items.data[0]?.price?.id,
      });
    }

    // Update database with subscription status
    const updateData: any = {
      subscription_status: subscription.status === 'active' || subscription.status === 'trialing' ? tier : 'free',
      stripe_subscription_id: subscription.id,
    };

    // Only add dates if they're valid
    const startDate = toISOString(currentPeriodStart);
    const endDate = toISOString(currentPeriodEnd);
    
    if (startDate) {
      updateData.subscription_start_date = startDate;
    }
    if (endDate) {
      updateData.subscription_end_date = endDate;
    }

    // Update customer ID if we found it (either from database or lookup)
    if (customerId) {
      updateData.stripe_customer_id = customerId;
    } else if (subscription.customer) {
      // Fallback: get customer ID from subscription
      updateData.stripe_customer_id = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    }

    console.log('💾 Updating database with:', {
      userId: user.id,
      updateData,
    });

    const { data: updatedData, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('subscription_status, stripe_customer_id, stripe_subscription_id')
      .single();

    if (updateError) {
      console.error('❌ Error updating subscription status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription status', details: updateError },
        { status: 500 }
      );
    }

    console.log('✅ Database updated successfully:', updatedData);

    const finalTier = subscription.status === 'active' || subscription.status === 'trialing' ? tier : 'free';

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Subscription synced successfully:', {
        tier: finalTier,
        subscriptionStatus: subscription.status,
        customerId: customerId || 'not found',
        subscriptionId: subscription.id,
        databaseStatus: updatedData?.subscription_status,
      });
    }

    return NextResponse.json({
      message: 'Subscription status synced successfully',
      synced: true,
      tier: finalTier,
      subscriptionStatus: subscription.status,
      customerId: customerId || undefined,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

