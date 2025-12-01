/**
 * Utility script to verify Stripe price IDs exist in your account
 * 
 * Usage:
 *   cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore\Digital-Grimoire\app"
 *   npx tsx scripts/verify-stripe-prices.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function verifyStripePrices() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
    console.log('Make sure you have a .env.local file with your Stripe keys.');
    process.exit(1);
  }

  const isTestKey = secretKey.startsWith('sk_test_');
  const isLiveKey = secretKey.startsWith('sk_live_');
  
  console.log(`\n🔑 Using ${isTestKey ? 'TEST' : isLiveKey ? 'LIVE' : 'UNKNOWN'} Stripe key\n`);

  const stripe = new Stripe(secretKey);

  // Get account information to verify which account/sandbox we're accessing
  try {
    const account = await stripe.accounts.retrieve();
    console.log('🏢 Stripe Account Information:');
    console.log('─'.repeat(60));
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Display Name: ${account.settings?.dashboard?.display_name || 'N/A'}`);
    console.log(`   Country: ${account.country || 'N/A'}`);
    if (account.email) {
      console.log(`   Email: ${account.email}`);
    }
    console.log('─'.repeat(60));
    console.log('');
  } catch (accountError) {
    // Account retrieval might fail for restricted keys, that's okay
    console.log('⚠️  Could not retrieve account information (this is normal for restricted keys)\n');
  }

  // Get configured price IDs from environment
  const configuredPrices = {
    student: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT,
    scholar: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR,
    adept: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT,
  };

  console.log('📋 Configured Price IDs in .env.local:');
  console.log('─'.repeat(60));
  for (const [tier, priceId] of Object.entries(configuredPrices)) {
    if (priceId) {
      console.log(`  ${tier.padEnd(10)}: ${priceId}`);
    } else {
      console.log(`  ${tier.padEnd(10)}: ❌ NOT SET`);
    }
  }
  console.log('─'.repeat(60));

  // List all products and prices from Stripe
  console.log('\n🔍 Fetching all products and prices from Stripe...\n');

  try {
    // Get both active and all products/prices to see what's available
    const products = await stripe.products.list({ limit: 100, active: true });
    const allProducts = await stripe.products.list({ limit: 100 });
    const prices = await stripe.prices.list({ limit: 100, active: true });
    const allPrices = await stripe.prices.list({ limit: 100 });

    console.log(`✅ Found ${products.data.length} active product(s) and ${prices.data.length} active price(s)`);
    console.log(`   (Total: ${allProducts.data.length} products, ${allPrices.data.length} prices including archived)\n`);

    // Group prices by product
    const pricesByProduct = new Map<string, Stripe.Price[]>();
    for (const price of prices.data) {
      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      if (!pricesByProduct.has(productId)) {
        pricesByProduct.set(productId, []);
      }
      pricesByProduct.get(productId)!.push(price);
    }

    // Display products and their prices
    console.log('📦 Products and Prices in your Stripe account:');
    console.log('═'.repeat(80));
    
    for (const product of products.data) {
      const productPrices = pricesByProduct.get(product.id) || [];
      
      console.log(`\n📦 Product: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Description: ${product.description || 'N/A'}`);
      
      if (productPrices.length === 0) {
        console.log(`   ⚠️  No active prices found for this product`);
      } else {
        console.log(`   💰 Prices:`);
        for (const price of productPrices) {
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
          const currency = price.currency.toUpperCase();
          const interval = price.recurring?.interval || 'one-time';
          const isConfigured = Object.values(configuredPrices).includes(price.id);
          const status = isConfigured ? '✅ IN USE' : '   ';
          
          console.log(`      ${status} ${price.id}`);
          console.log(`         ${currency} $${amount} per ${interval}`);
        }
      }
      console.log('─'.repeat(80));
    }

    // Check which configured prices exist
    console.log('\n🔎 Verification Results:');
    console.log('═'.repeat(80));
    
    let allValid = true;
    for (const [tier, priceId] of Object.entries(configuredPrices)) {
      if (!priceId) {
        console.log(`❌ ${tier.padEnd(10)}: NOT CONFIGURED in .env.local`);
        allValid = false;
      } else {
        const priceExists = prices.data.some(p => p.id === priceId);
        if (priceExists) {
          const price = prices.data.find(p => p.id === priceId)!;
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
          const currency = price.currency.toUpperCase();
          const interval = price.recurring?.interval || 'one-time';
          console.log(`✅ ${tier.padEnd(10)}: ${priceId}`);
          console.log(`   ${currency} $${amount} per ${interval} - EXISTS ✅`);
        } else {
          console.log(`❌ ${tier.padEnd(10)}: ${priceId}`);
          console.log(`   DOES NOT EXIST in your Stripe account ❌`);
          allValid = false;
        }
      }
    }

    console.log('═'.repeat(80));

    if (allValid) {
      console.log('\n✅ All configured price IDs exist in your Stripe account!');
    } else {
      console.log('\n❌ Some price IDs are missing or invalid.');
      console.log('\n📝 To fix this:');
      console.log('   1. Go to https://dashboard.stripe.com/test/products (or /products for live)');
      console.log('   2. Create the missing products if they don\'t exist');
      console.log('   3. For each product, copy the Price ID (starts with "price_")');
      console.log('   4. Update your .env.local file with the correct Price IDs');
      console.log('   5. Restart your development server');
    }

    // Also check archived prices and all prices
    console.log('\n🔍 Checking for archived prices...');
    const archivedPrices = await stripe.prices.list({ limit: 100, active: false });
    const archivedMatches = archivedPrices.data.filter(p => 
      Object.values(configuredPrices).includes(p.id)
    );
    
    if (archivedMatches.length > 0) {
      console.log(`\n⚠️  Found ${archivedMatches.length} configured price ID(s) that are ARCHIVED:`);
      for (const price of archivedMatches) {
        console.log(`   ❌ ${price.id} - This price is archived and cannot be used`);
      }
      console.log('\n   You need to create new prices or reactivate these in Stripe Dashboard.');
    }

    // Check if prices exist in any form (active or archived)
    console.log('\n🔍 Checking all prices (active + archived) for configured IDs...');
    const allPriceIds = allPrices.data.map(p => p.id);
    const foundInAnyForm = Object.entries(configuredPrices).filter(([tier, priceId]) => {
      if (!priceId) return false;
      return allPriceIds.includes(priceId);
    });

    if (foundInAnyForm.length > 0) {
      console.log(`\n⚠️  Found ${foundInAnyForm.length} configured price ID(s) that exist but may be in a different state:`);
      for (const [tier, priceId] of foundInAnyForm) {
        const price = allPrices.data.find(p => p.id === priceId);
        if (price) {
          const status = price.active ? 'ACTIVE' : 'ARCHIVED';
          console.log(`   ${tier.padEnd(10)}: ${priceId} - ${status}`);
        }
      }
    }

    // Show account mismatch warning if no products found
    if (products.data.length === 0 && allProducts.data.length === 0) {
      console.log('\n⚠️  ACCOUNT/SANDBOX MISMATCH DETECTED!');
      console.log('─'.repeat(60));
      console.log('Your API key is accessing account: acct_1SXMoIHvoBA4hFOl');
      console.log('But your products might be in a different sandbox/account.');
      console.log('\nTo fix this:');
      console.log('1. Go to https://dashboard.stripe.com/test/apikeys');
      console.log('2. Check which sandbox your API key belongs to');
      console.log('3. Either:');
      console.log('   - Use the API key from the sandbox where your products are, OR');
      console.log('   - Copy the Price IDs from the sandbox this API key can access');
      console.log('─'.repeat(60));
    }

  } catch (error) {
    console.error('\n❌ Error fetching data from Stripe:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

verifyStripePrices().catch(console.error);

