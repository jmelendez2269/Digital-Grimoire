# Azure Computer Vision Setup Guide

## Phase 1: Azure Account & Resource Creation

### Step 1: Create Azure Account
1. Go to [portal.azure.com](https://portal.azure.com)
2. Sign up for a free account (if you don't have one)
   - Free tier includes $200 credit for 30 days
   - Computer Vision has a permanent free tier (5,000 transactions/month)

### Step 2: Create Computer Vision Resource

1. In the Azure Portal, click "Create a resource"
2. Search for "Computer Vision"
3. Click "Create" and fill in:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new → `convergence-ocr` (or choose existing)
   - **Region**: Choose closest to your users:
     - East US
     - West Europe
     - Southeast Asia
   - **Name**: `convergence-vision` (must be globally unique)
   - **Pricing Tier**: **F0 (Free)**
     - 5,000 transactions per month
     - 20 calls per minute
     - Perfect for MVP testing

4. Click "Review + Create" → "Create"
5. Wait for deployment (usually 1-2 minutes)

### Step 3: Get API Credentials

1. Navigate to your Computer Vision resource
2. In the left sidebar, click "Keys and Endpoint"
3. Copy the following values:
   - **KEY 1** (or KEY 2) → This is your `AZURE_VISION_KEY`
   - **Endpoint** → This is your `AZURE_VISION_ENDPOINT`
     - Format: `https://YOUR_RESOURCE.cognitiveservices.azure.com/`

### Step 4: Add to Environment Variables

Add these to your `app/.env.local` file:

```env
# Azure Computer Vision
AZURE_VISION_ENDPOINT=https://convergence-vision.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_32_character_key_here
```

**Important:** 
- Keep your API key secret! Never commit it to git
- The `.env.local` file is already in `.gitignore`

## Phase 1.2: Test the API

### Install Dependencies

```bash
cd app
pnpm add axios tsx
```

### Run Test Script

From the project root:

```bash
npx tsx test-azure-ocr.ts
```

### Expected Output

```
🚀 Azure Computer Vision OCR Test
══════════════════════════════════════════════════
📍 Endpoint: https://convergence-vision.cognitiveservices.azure.com/
🔑 API Key: 1a2b3c4d...
══════════════════════════════════════════════════

🔍 Starting OCR analysis...
📄 Image URL: https://raw.githubusercontent.com/...
✅ Analysis submitted, polling for results...
⏳ Status: running (attempt 1/30)
⏳ Status: succeeded (attempt 2/30)

✅ OCR Complete!
📝 Extracted Text:
──────────────────────────────────────────────────
[Sample extracted text will appear here]
──────────────────────────────────────────────────

📊 Total pages: 1
📊 Total lines: 12
📊 Character count: 234

✅ Test completed successfully!
You can now proceed with Phase 2 of the integration plan.
```

## Troubleshooting

### Error: "Missing Azure credentials"
- Make sure `AZURE_VISION_ENDPOINT` and `AZURE_VISION_KEY` are set in `app/.env.local`
- The test script looks for these in the environment

### Error: "401 Unauthorized"
- Your API key is incorrect
- Copy the key exactly from Azure Portal (no spaces)
- Try using KEY 2 if KEY 1 doesn't work

### Error: "429 Too Many Requests"
- You've exceeded the rate limit (20 calls/minute on free tier)
- Wait 1 minute and try again

### Error: "Resource not found"
- Check that your endpoint URL is correct
- Should end with `.cognitiveservices.azure.com/` (with trailing slash)

## API Limits & Pricing

### Free Tier (F0)
- **5,000 transactions per month** (more than enough for MVP)
- **20 calls per minute**
- Perfect for development and testing

### Paid Tier (S1) - When You Scale
- **$1.00 per 1,000 transactions**
- **10 calls per second**
- For 1,000 documents/month: ~$1/month
- For 10,000 documents/month: ~$10/month

## Next Steps

Once the test script runs successfully:
1. ✅ Phase 1 Complete!
2. Move to Phase 2: Cloudflare R2 Setup
3. Then Phase 3: Upload API Implementation

## Additional Resources

- [Azure Computer Vision Documentation](https://learn.microsoft.com/en-us/azure/cognitive-services/computer-vision/)
- [Read API Reference](https://learn.microsoft.com/en-us/azure/cognitive-services/computer-vision/overview-ocr)
- [Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)

