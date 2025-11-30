import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  // Using default API version - Stripe will use the latest compatible version
  return new Stripe(secretKey);
}

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe checkout session for premium subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { 
          error: 'Stripe is not configured',
          message: 'STRIPE_SECRET_KEY environment variable is missing. Please configure Stripe in your environment variables.'
        },
        { status: 503 }
      );
    }

    const stripe = getStripeClient();
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to create a checkout session' },
        { status: 401 }
      );
    }

    // Validate user email (required for Stripe customer creation)
    if (!user.email) {
      return NextResponse.json(
        { error: 'Email required', message: 'Your account must have an email address to subscribe' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { priceId, mode = 'subscription' } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required', message: 'Price ID is required to create a checkout session' },
        { status: 400 }
      );
    }

    // Validate price ID format - Stripe price IDs must start with 'price_'
    if (!priceId.startsWith('price_')) {
      const secretKey = process.env.STRIPE_SECRET_KEY || '';
      const isTestKey = secretKey.startsWith('sk_test_');
      
      let errorMessage = 'Invalid price ID format. Stripe price IDs must start with "price_".\n\n';
      
      if (priceId.startsWith('prod_')) {
        errorMessage += 'You provided a product ID (prod_...) instead of a price ID.\n';
        errorMessage += 'Product IDs cannot be used directly for checkout sessions.\n';
        errorMessage += 'You need to get the price ID from your Stripe Dashboard:\n';
        errorMessage += '1. Go to Products in your Stripe Dashboard\n';
        errorMessage += '2. Click on the product\n';
        errorMessage += '3. Copy the Price ID (starts with "price_") from the pricing section\n\n';
      } else {
        errorMessage += `The provided ID "${priceId.substring(0, 20)}..." is not a valid Stripe price ID format.\n\n`;
      }
      
      errorMessage += `You're using a ${isTestKey ? 'test' : 'live'} Stripe key.\n`;
      errorMessage += 'Please ensure you use the correct price ID from your Stripe Dashboard.';
      
      return NextResponse.json(
        { 
          error: 'Invalid price ID format',
          message: errorMessage
        },
        { status: 400 }
      );
    }

    // Validate Stripe key and price ID match (test vs live)
    // Note: Stripe price IDs have the same format for both test and live,
    // but test price IDs only work with test keys and live price IDs only work with live keys
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    const isTestKey = secretKey.startsWith('sk_test_');
    const isLiveKey = secretKey.startsWith('sk_live_');

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Stripe Configuration Check:', {
        secretKeyType: isTestKey ? 'test' : isLiveKey ? 'live' : 'unknown',
        priceId: priceId.substring(0, 20) + '...', // Log partial price ID for security
        priceIdFormat: 'valid (starts with price_)',
      });
    }

    // Get or create Stripe customer
    let customerId: string | undefined;

    // Check if user already has a Stripe customer ID
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userData?.stripe_customer_id) {
      // Verify the customer exists in Stripe before using it
      // This handles cases where the customer was created in a different account/sandbox
      try {
        await stripe.customers.retrieve(userData.stripe_customer_id);
        customerId = userData.stripe_customer_id;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Using existing Stripe customer: ${customerId}`);
        }
      } catch (customerError: any) {
        // Customer doesn't exist in this account - clear it and create a new one
        if (customerError?.code === 'resource_missing' || customerError?.type === 'StripeInvalidRequestError') {
          console.log(`⚠️  Customer ${userData.stripe_customer_id} doesn't exist in this Stripe account. Creating new customer.`);
          
          // Clear the invalid customer ID
          await supabase
            .from('users')
            .update({ stripe_customer_id: null })
            .eq('id', user.id);
          
          // Fall through to create a new customer
          customerId = undefined;
        } else {
          // Some other error - rethrow it
          console.error('Error verifying Stripe customer:', customerError);
          throw customerError;
        }
      }
    }

    // Create new Stripe customer if we don't have a valid one
    if (!customerId) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Creating new Stripe customer for user:', user.email);
        }
        
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;

        // Save customer ID to database
        const { error: updateError } = await supabase
          .from('users')
          .update({ stripe_customer_id: customer.id })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Error saving Stripe customer ID:', updateError);
          // Continue anyway - customer was created in Stripe
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Created and saved new Stripe customer: ${customerId}`);
          }
        }
      } catch (customerError) {
        console.error('Error creating Stripe customer:', customerError);
        throw new Error(
          customerError instanceof Error 
            ? `Failed to create customer: ${customerError.message}`
            : 'Failed to create Stripe customer'
        );
      }
    }

    // Create checkout session
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating checkout session with:', {
        customerId,
        priceId: priceId.substring(0, 20) + '...',
        mode,
        userId: user.id,
        userEmail: user.email,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: mode as 'subscription' | 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile?tab=subscription&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile?tab=subscription&canceled=true`,
      metadata: {
        user_id: user.id,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Checkout session created successfully:', {
        sessionId: session.id,
        hasUrl: !!session.url,
      });
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to create checkout session';
    let statusCode = 500;
    
    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
      const stripeError = error as any; // Stripe error object
      statusCode = 400;
      
      // Log full Stripe error details in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Stripe Error Details:', {
          type: stripeError.type,
          code: stripeError.code,
          message: stripeError.message,
          param: stripeError.param,
          decline_code: stripeError.decline_code,
          payment_intent: stripeError.payment_intent,
          payment_method: stripeError.payment_method,
          payment_method_type: stripeError.payment_method_type,
          setup_intent: stripeError.setup_intent,
          source: stripeError.source,
          raw: stripeError,
        });
      }
      
      errorMessage = stripeError.message || 'Stripe API error';
      
      // Handle specific Stripe error types
      if (stripeError.type === 'StripeInvalidRequestError' || stripeError.type === 'invalid_request_error') {
        if (errorMessage.includes('No such price') || errorMessage.includes('Invalid price') || errorMessage.includes('No such price_id')) {
          const secretKey = process.env.STRIPE_SECRET_KEY || '';
          const isTestKey = secretKey.startsWith('sk_test_');
          
          // Extract price ID from error message
          const priceMatch = errorMessage.match(/price_[a-zA-Z0-9]+/);
          const attemptedPriceId = priceMatch ? priceMatch[0] : 'unknown';
          
          // Determine which tier this price ID corresponds to
          const studentPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT;
          const scholarPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR;
          const adeptPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT;
          
          let tierHint = '';
          if (attemptedPriceId === studentPriceId) tierHint = ' (Student tier)';
          else if (attemptedPriceId === scholarPriceId) tierHint = ' (Scholar tier)';
          else if (attemptedPriceId === adeptPriceId) tierHint = ' (Adept tier)';
          
          errorMessage = `Invalid price ID${tierHint}: "${attemptedPriceId.substring(0, 20)}..."

This price ID doesn't exist in your Stripe ${isTestKey ? 'test' : 'live'} account.

Common causes:
- The price ID doesn't exist in your Stripe account
- You're using a ${isTestKey ? 'test' : 'live'} Stripe key with a ${isTestKey ? 'live' : 'test'} price ID
- The price was deleted or archived in Stripe
- You may have used a product ID instead of a price ID

To fix this:
1. Go to your Stripe Dashboard: ${isTestKey ? 'https://dashboard.stripe.com/test/products' : 'https://dashboard.stripe.com/products'}
2. Check if your subscription products exist:
   - "The Student" ($5/month)
   - "The Scholar" ($9.99/month)
   - "The Adept" ($15/month)
3. If products don't exist, create them:
   - Click "Add product"
   - Set name, price, and billing period (monthly recurring)
   - Save the product
4. Get the Price ID (NOT Product ID):
   - Click on the product
   - Scroll to "Pricing" section
   - Copy the Price ID (starts with "price_")
   - ❌ DO NOT use the Product ID (starts with "prod_")
5. Update your .env.local file:
   NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT=price_...
   NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR=price_...
   NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT=price_...
6. Restart your development server`;
        }
      } else if (stripeError.type === 'StripeAuthenticationError' || stripeError.type === 'authentication_error') {
        statusCode = 503;
        errorMessage = 'Stripe authentication failed. Please check your API keys.';
      } else if (stripeError.type === 'StripeAPIError' || stripeError.type === 'api_error') {
        statusCode = 503;
        errorMessage = 'Stripe API error. Please try again later.';
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error messages
      if (errorMessage.includes('No such price') || errorMessage.includes('Invalid price') || errorMessage.includes('No such price_id')) {
        statusCode = 400;
        const secretKey = process.env.STRIPE_SECRET_KEY || '';
        const isTestKey = secretKey.startsWith('sk_test_');
        errorMessage = `Invalid price ID. This usually means:
- The price ID doesn't exist in your Stripe account
- You're using a ${isTestKey ? 'test' : 'live'} Stripe key with a ${isTestKey ? 'live' : 'test'} price ID
- The price ID format is incorrect (must start with "price_")
- You may have used a product ID instead of a price ID

To fix this:
1. Go to your Stripe Dashboard (${isTestKey ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com'})
2. Navigate to Products
3. Find your product and copy the Price ID (starts with "price_")
4. Update your environment variable with the correct price ID
5. Ensure your Stripe key type (test/live) matches your price ID type`;
      } else if (errorMessage.includes('STRIPE_SECRET_KEY')) {
        statusCode = 503;
        errorMessage = 'Stripe is not configured. Please contact support.';
      }
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
      { status: statusCode }
    );
  }
}

