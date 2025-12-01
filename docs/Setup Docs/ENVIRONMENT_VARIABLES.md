# Environment Variables Reference

This document lists all environment variables required for the Digital Grimoire application.

## Required Environment Variables

Create a file `Digital-Grimoire/app/.env.local` with the following variables:

### Supabase (Database & Authentication)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Navigate to **Settings** → **API**
- Copy the URL and keys

---

### Cloudflare R2 (File Storage)
```env
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=convergence-library
R2_PUBLIC_URL=https://pub-ACCOUNT_ID.r2.dev/convergence-library
```

**Setup:**
See [CLOUDFLARE_R2_SETUP.md](./CLOUDFLARE_R2_SETUP.md) for detailed instructions.

---

### Azure Computer Vision (OCR)
```env
AZURE_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_azure_vision_key
```

**Setup:**
See [AZURE_COMPUTER_VISION_SETUP.md](./AZURE_COMPUTER_VISION_SETUP.md) for detailed instructions.

---

### Anthropic Claude API (Metadata Extraction)
```env
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

**Where to find:**
- Go to [Anthropic Console](https://console.anthropic.com/)
- Navigate to **API Keys**
- Create a new key or use existing

---

### Replicate (Book Cover Generation)
```env
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

**What it does:**
- AI-powered book cover generation using FLUX.1 [schnell] model
- Automatically generates vintage Dark Academia style covers when scraping fails
- Fallback for documents without existing covers
- Fast, affordable, and reliable image generation

**Where to find:**
- Go to [Replicate](https://replicate.com/)
- Sign up with GitHub account (free)
- Navigate to [API Tokens](https://replicate.com/account/api-tokens)
- Create a new API token and copy it (store it securely)

**Pricing:**
- **No minimum payment required** - perfect for testing!
- **Pay-per-use**: ~$0.002-0.01 per image (varies by model and size)
- **FLUX.1 schnell**: ~$0.003 per image at 768×1152 (very affordable!)
- No subscriptions, no hidden fees - only pay for what you use
- Add credits as needed: $5, $10, $20, or custom amounts

**Note:** This is optional. If not configured, the system will only attempt to scrape covers from public sources (Open Library, Internet Archive, Google Books).

---

### Sentry (Error Tracking) - OPTIONAL

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
```

**Sentry DSN Format:**
The DSN is a URL that Sentry provides when you create a project. It looks like:
```
https://abc123def456@o1234567.ingest.sentry.io/1234567
```

**How to get your DSN:**
1. Create a Sentry account at [sentry.io](https://sentry.io/)
2. Create a new project (select "Next.js" as platform)
3. Go to **Settings** → **Projects** → Your project → **Client Keys (DSN)**
4. Copy the DSN URL and paste it here

**What it does:**
- Error tracking and monitoring for production
- Automatic error reporting with stack traces
- Performance monitoring and session replay
- Real-time alerts for critical errors

**Where to find:**
- Go to [Sentry](https://sentry.io/) and sign up (free tier available)
- Create a new project (select Next.js)
- Copy the DSN from project settings
- Add it to your `.env.local` file

**Pricing:**
- **Free tier**: 5,000 events/month, 1 project
- Perfect for getting started and small applications
- Upgrade as needed for more events/projects

**Note:** This is optional. If not configured, Sentry will be disabled and errors won't be tracked.

---

### Stripe (Payment Processing) - OPTIONAL

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_your_yearly_price_id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**What it does:**
- Payment processing for premium subscriptions
- Stripe Checkout for secure payment collection
- Customer portal for subscription management
- Webhook handlers for subscription events

**Where to find:**
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Go to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
4. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
5. Create a product and price in **Products** → **Add product**
   - Product name: "Premium Subscription"
   - Price: $15/month (or $150/year)
   - ⚠️ **IMPORTANT**: Copy the **Price ID** (starts with `price_`), NOT the Product ID (starts with `prod_`)
   - After creating the product, click on it to view details
   - In the **Pricing** section, copy the **Price ID** (looks like `price_1ABC123...`)
   - ❌ **DO NOT** use the Product ID from the product overview page
6. Set up webhooks:
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Signing secret** (starts with `whsec_`)

**Pricing:**
- **Free tier**: No monthly fee
- **Transaction fees**: 2.9% + $0.30 per successful payment
- **No setup fees** or monthly minimums

**Support:**
- **Stripe Support Phone**: (919) 322-9418
- **Stripe Dashboard**: [dashboard.stripe.com](https://dashboard.stripe.com)
- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)

**Note:** This is optional. If not configured, subscription features will show "coming soon" messages. Use test mode keys for development.

---

## Complete .env.local Template

Copy this entire template to `Digital-Grimoire/app/.env.local` and fill in your values:

```env
# ============================================
# Supabase Configuration
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ============================================
# Cloudflare R2 (File Storage)
# ============================================
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=convergence-library
R2_PUBLIC_URL=https://pub-ACCOUNT_ID.r2.dev/convergence-library

# ============================================
# Azure Computer Vision (OCR)
# ============================================
AZURE_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_azure_vision_key

# ============================================
# Anthropic Claude API (Metadata Extraction)
# ============================================
ANTHROPIC_API_KEY=sk-ant-your_key_here

# ============================================
# Replicate (Book Cover Generation) - OPTIONAL
# ============================================
REPLICATE_API_TOKEN=your_replicate_api_token_here

# ============================================
# Sentry (Error Tracking) - OPTIONAL
# ============================================
# Format: https://your-key@your-org.ingest.sentry.io/your-project-id
# Get from: Sentry Dashboard → Settings → Projects → Client Keys (DSN)
NEXT_PUBLIC_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id

# ============================================
# Stripe (Payment Processing) - OPTIONAL
# ============================================
# Get from: Stripe Dashboard → Developers → API keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_your_yearly_price_id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Verification

After setting up environment variables, verify they're loaded correctly:

```bash
cd Digital-Grimoire/app
pnpm dev
```

Check the terminal for any missing environment variable errors.

---

## Security Notes

⚠️ **NEVER commit `.env.local` to Git**

The `.env.local` file is already in `.gitignore`. Keep it that way.

### Best Practices:
1. ✅ Use `.env.local` for local development
2. ✅ Use Vercel Environment Variables for production (see [VERCEL_PRODUCTION_SECRETS.md](./VERCEL_PRODUCTION_SECRETS.md))
3. ✅ Rotate API keys every 90 days
4. ✅ Use separate keys for development and production
5. ❌ Never hardcode credentials in source code
6. ❌ Never share `.env.local` files or commit environment variables to git

---

## Environment-Specific Variables

### Development
Use local/test credentials with free tiers.

### Production
Use production credentials with appropriate rate limits and monitoring.

### Testing
Consider using separate Supabase project and R2 bucket for testing.

---

## Troubleshooting

### "Environment variable not found" error
- Restart the Next.js dev server after adding new variables
- Ensure variable names match exactly (case-sensitive)
- Check for typos or extra spaces

### CORS errors
- Verify R2 CORS policy includes your domain
- Check browser console for specific CORS error messages

### API authentication errors
- Verify keys are copied correctly (no extra spaces/newlines)
- Check that keys haven't expired
- Ensure you're using the correct key type (anon vs service role)

---

## Next Steps

1. ✅ Create `.env.local` file
2. ✅ Set up Supabase (already done if you're running the app)
3. 📋 Set up Cloudflare R2 → [CLOUDFLARE_R2_SETUP.md](./CLOUDFLARE_R2_SETUP.md)
4. 📋 Set up Azure Computer Vision → [AZURE_COMPUTER_VISION_SETUP.md](./AZURE_COMPUTER_VISION_SETUP.md)
5. 📋 Get Anthropic API key → [console.anthropic.com](https://console.anthropic.com/)
6. 📋 (Optional) Get Nano Banana API key → [nano-banana.ai](https://nano-banana.ai) for AI cover generation

