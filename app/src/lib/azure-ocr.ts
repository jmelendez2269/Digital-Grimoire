import axios from 'axios';
import { logOcrUsage } from './usage-tracker';

interface OCRResult {
  text: string;
  pageCount: number;
  lineCount: number;
}

export async function performOCR(
  fileUrl: string,
  userId?: string,
  documentId?: string
): Promise<OCRResult> {
  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const key = process.env.AZURE_VISION_KEY;

  if (!endpoint || !key) {
    throw new Error('Azure credentials not configured');
  }

  console.log(`Starting OCR for URL: ${fileUrl}`);
  console.log(`Azure endpoint: ${endpoint}`);

  // Submit OCR request using Azure Document Intelligence Read API v4.0
  // This API is better for large documents (supports up to 2000 pages)
  // Using stable API version for better regional compatibility
  const analyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
  
  let analyzeResponse;
  try {
    analyzeResponse = await axios.post(
      analyzeUrl,
      { urlSource: fileUrl },
      { 
        headers: { 
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Azure OCR API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: analyzeUrl
      });
      
      // Log failed OCR attempt
      await logOcrUsage({
        pages: 0,
        userId,
        documentId,
        success: false,
        errorMessage: `Azure OCR API failed: ${error.response?.status} - ${error.response?.statusText || error.message}`,
      });
      
      throw new Error(`Azure OCR API failed: ${error.response?.status} - ${error.response?.statusText || error.message}`);
    }
    throw error;
  }

  const operationLocation = analyzeResponse.headers['operation-location'];
  console.log(`OCR operation submitted: ${operationLocation}`);

  // Poll for results with extended timeout for large documents (max 300 attempts = 5 minutes)
  let result;
  let attempts = 0;
  const maxAttempts = 300; // Increased for large PDFs
  
  do {
    await new Promise(resolve => setTimeout(resolve, 1000));
    result = await axios.get(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': key }
    });
    attempts++;
    
    if (attempts % 10 === 0) {
      console.log(`OCR still processing... (attempt ${attempts}/${maxAttempts}, status: ${result.data.status})`);
    }
  } while (
    (result.data.status === 'running' || result.data.status === 'notStarted') 
    && attempts < maxAttempts
  );

  if (result.data.status !== 'succeeded') {
    throw new Error(`OCR failed with status: ${result.data.status} after ${attempts} attempts`);
  }

  console.log(`OCR completed successfully after ${attempts} attempts`);

  // Extract text from the Document Intelligence response
  const analyzeResult = result.data.analyzeResult;
  
  if (!analyzeResult || !analyzeResult.pages) {
    throw new Error('Invalid OCR response: missing pages data');
  }

  // Extract all text lines from all pages
  const allLines: string[] = [];
  let pageCount = 0;

  // Document Intelligence v4.0 structure: analyzeResult.pages[].lines[]
  for (const page of analyzeResult.pages) {
    pageCount++;
    if (page.lines && Array.isArray(page.lines)) {
      for (const line of page.lines) {
        if (line.content) {
          allLines.push(line.content);
        }
      }
    }
  }

  const text = allLines.join('\n');
  const lineCount = allLines.length;

  console.log(`OCR extraction complete: ${pageCount} pages, ${lineCount} lines, ${text.length} characters`);

  // Log usage for tracking
  await logOcrUsage({
    pages: pageCount,
    userId,
    documentId,
    success: true,
    responseTime: attempts * 1000, // Approximate time in ms
  });

  return {
    text,
    pageCount,
    lineCount,
  };
}

