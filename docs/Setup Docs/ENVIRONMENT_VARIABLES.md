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
2. ✅ Use Vercel/hosting platform environment variables for production
3. ✅ Rotate API keys every 90 days
4. ✅ Use separate keys for development and production
5. ❌ Never hardcode credentials in source code
6. ❌ Never share `.env.local` file

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

