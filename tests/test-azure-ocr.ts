/**
 * Azure Computer Vision OCR Test Script
 * 
 * This script tests the Azure Computer Vision API for OCR capabilities.
 * Run with: npx tsx test-azure-ocr.ts
 */

import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from app/.env.local
config({ path: resolve(__dirname, 'app', '.env.local') });

const endpoint = process.env.AZURE_VISION_ENDPOINT;
const key = process.env.AZURE_VISION_KEY;

interface AzureOCRResult {
  status: string;
  analyzeResult?: {
    readResults: Array<{
      page: number;
      lines: Array<{
        text: string;
        boundingBox: number[];
      }>;
    }>;
  };
}

async function testOCR(imageUrl: string): Promise<string> {
  if (!endpoint || !key) {
    throw new Error('Missing Azure credentials. Set AZURE_VISION_ENDPOINT and AZURE_VISION_KEY in .env.local');
  }

  console.log('🔍 Starting OCR analysis...');
  console.log(`📄 Image URL: ${imageUrl}`);
  
  // Step 1: Submit the read request
  const analyzeUrl = `${endpoint}/vision/v3.2/read/analyze`;
  
  try {
    const response = await axios.post(
      analyzeUrl,
      { url: imageUrl },
      {
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/json'
        }
      }
    );

    const operationLocation = response.headers['operation-location'];
    if (!operationLocation) {
      throw new Error('No operation-location header received');
    }

    console.log('✅ Analysis submitted, polling for results...');

    // Step 2: Poll for results
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    let result: AzureOCRResult;

    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const resultResponse = await axios.get<AzureOCRResult>(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': key }
      });
      
      result = resultResponse.data;
      console.log(`⏳ Status: ${result.status} (attempt ${attempts}/${maxAttempts})`);

      if (result.status === 'failed') {
        throw new Error('OCR analysis failed');
      }

      if (attempts >= maxAttempts) {
        throw new Error('OCR analysis timed out');
      }

    } while (result.status === 'running' || result.status === 'notStarted');

    // Step 3: Extract text from results
    if (!result.analyzeResult) {
      throw new Error('No analyze result returned');
    }

    const extractedText = result.analyzeResult.readResults
      .flatMap(page => page.lines.map(line => line.text))
      .join('\n');

    console.log('\n✅ OCR Complete!');
    console.log('📝 Extracted Text:');
    console.log('─'.repeat(50));
    console.log(extractedText);
    console.log('─'.repeat(50));
    console.log(`\n📊 Total pages: ${result.analyzeResult.readResults.length}`);
    console.log(`📊 Total lines: ${result.analyzeResult.readResults.reduce((sum, page) => sum + page.lines.length, 0)}`);
    console.log(`📊 Character count: ${extractedText.length}`);

    return extractedText;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ API Error:', error.response?.data || error.message);
      throw new Error(`Azure API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

// Test with a sample image
async function main() {
  try {
    // Using a sample image with text (you can replace with your own)
    const testImageUrl = 'https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/ComputerVision/Images/printed_text.jpg';
    
    console.log('🚀 Azure Computer Vision OCR Test');
    console.log('═'.repeat(50));
    console.log(`📍 Endpoint: ${endpoint}`);
    console.log(`🔑 API Key: ${key ? key.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log('═'.repeat(50));
    console.log();

    await testOCR(testImageUrl);

    console.log('\n✅ Test completed successfully!');
    console.log('You can now proceed with Phase 2 of the integration plan.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();

