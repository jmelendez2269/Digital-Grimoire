# Phase 1 Quick Start: Azure Computer Vision Setup

## 🎯 Goal
Set up Azure Computer Vision API and verify it works with a test script.

## ⏱️ Estimated Time
15-20 minutes

## 📋 Checklist

### Part 1: Azure Portal Setup (10 minutes)

- [ ] **1.1** Go to [portal.azure.com](https://portal.azure.com) and sign in
- [ ] **1.2** Click "Create a resource" → Search "Computer Vision" → Click "Create"
- [ ] **1.3** Fill in the form:
  - Resource Group: Create new → `convergence-ocr`
  - Region: Choose closest (e.g., `East US`, `West Europe`)
  - Name: `convergence-vision` (or similar unique name)
  - Pricing: **F0 (Free)** - 5,000 transactions/month
- [ ] **1.4** Click "Review + Create" → "Create" (wait ~2 minutes)
- [ ] **1.5** After deployment, click "Go to resource"
- [ ] **1.6** Navigate to "Keys and Endpoint" in left sidebar
- [ ] **1.7** Copy both:
  - **Endpoint** (e.g., `https://convergence-vision.cognitiveservices.azure.com/`)
  - **Key 1** (32-character string)

### Part 2: Environment Configuration (2 minutes)

- [ ] **2.1** Navigate to `Digital-Grimoire/app/` folder
- [ ] **2.2** Open or create `.env.local` file
- [ ] **2.3** Add these lines (replace with your actual values):

```env
# Azure Computer Vision
AZURE_VISION_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_32_character_key_here
```

- [ ] **2.4** Save the file

### Part 3: Test the API (5 minutes)

- [ ] **3.1** Open terminal in project root: `Digital Grimore/`
- [ ] **3.2** Run the test script:

```powershell
cd Digital-Grimoire
npx tsx test-azure-ocr.ts
```

- [ ] **3.3** Verify you see successful output with extracted text
- [ ] **3.4** Check the output matches this format:

```
🚀 Azure Computer Vision OCR Test
══════════════════════════════════════════════════
📍 Endpoint: https://convergence-vision...
🔑 API Key: 1a2b3c4d...
══════════════════════════════════════════════════

🔍 Starting OCR analysis...
✅ Analysis submitted, polling for results...
⏳ Status: running (attempt 1/30)
⏳ Status: succeeded (attempt 2/30)

✅ OCR Complete!
📝 Extracted Text:
[Text extracted from test image]

✅ Test completed successfully!
```

## ✅ Success Criteria

Phase 1 is complete when:
- ✅ Azure Computer Vision resource is created
- ✅ API credentials are saved in `.env.local`
- ✅ Test script runs without errors
- ✅ OCR text is successfully extracted from test image

## 🚨 Common Issues

### "Missing Azure credentials"
**Solution:** Make sure `.env.local` is in the `app/` folder and has the correct variable names.

### "401 Unauthorized"
**Solution:** Double-check your API key - copy it exactly from Azure Portal with no spaces.

### "Resource not found"
**Solution:** Ensure your endpoint URL includes the trailing `/` and matches the format: `https://RESOURCE_NAME.cognitiveservices.azure.com/`

### PowerShell errors running test
**Solution:** Try running from the `Digital-Grimoire` folder:
```powershell
cd "Digital-Grimoire"
npx tsx test-azure-ocr.ts
```

## 📚 Reference Files

- **Detailed Setup Guide:** `docs/Setup Docs/AZURE_COMPUTER_VISION_SETUP.md`
- **Test Script:** `test-azure-ocr.ts`
- **Full Plan:** `.cursor/plans/azure-ocr-integration-4b4ee156.plan.md`

## 🎉 What's Next?

Once Phase 1 is complete, you'll move to:
- **Phase 2:** Cloudflare R2 bucket setup (file storage)
- **Phase 3:** Upload API implementation (presigned URLs)
- **Phase 4:** Document processing pipeline (OCR + Claude)

## 💰 Cost Tracking

**Phase 1 Cost:** $0/month (using F0 free tier)
- 5,000 OCR calls per month included
- Perfect for MVP and testing
- Can upgrade to S1 ($1/1000 calls) when scaling

## 📞 Need Help?

If you get stuck:
1. Check the detailed guide: `AZURE_COMPUTER_VISION_SETUP.md`
2. Review Azure's [Computer Vision docs](https://learn.microsoft.com/en-us/azure/cognitive-services/computer-vision/)
3. Test with a different image URL in `test-azure-ocr.ts`

---

**Ready to proceed?** Just follow the checklist above and run the test script! 🚀

