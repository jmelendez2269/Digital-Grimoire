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
    const response = await fetch(analyzeUrl, {
      method: 'POST',
      headers: { 
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ urlSource: fileUrl })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Azure OCR API Error:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
        url: analyzeUrl
      });
      
      // Log failed OCR attempt
      await logOcrUsage({
        pages: 0,
        userId,
        documentId,
        success: false,
        errorMessage: `Azure OCR API failed: ${response.status} - ${response.statusText}`,
      });
      
      throw new Error(`Azure OCR API failed: ${response.status} - ${response.statusText}`);
    }

    analyzeResponse = {
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Azure OCR API failed')) {
      throw error;
    }
    console.error('Network error during OCR request:', error);
    await logOcrUsage({
      pages: 0,
      userId,
      documentId,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown network error',
    });
    throw error;
  }

  const operationLocation = analyzeResponse.headers['operation-location'];
  console.log(`OCR operation submitted: ${operationLocation}`);

  // Poll for results with extended timeout for large documents (max 300 attempts = 5 minutes)
  let resultData: any;
  let attempts = 0;
  const maxAttempts = 300; // Increased for large PDFs
  
  do {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': key }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to poll OCR status: ${response.status} - ${response.statusText}`);
    }
    
    resultData = await response.json();
    attempts++;
    
    if (attempts % 10 === 0) {
      console.log(`OCR still processing... (attempt ${attempts}/${maxAttempts}, status: ${resultData.status})`);
    }
  } while (
    (resultData.status === 'running' || resultData.status === 'notStarted') 
    && attempts < maxAttempts
  );

  if (resultData.status !== 'succeeded') {
    throw new Error(`OCR failed with status: ${resultData.status} after ${attempts} attempts`);
  }

  console.log(`OCR completed successfully after ${attempts} attempts`);

  // Extract text from the Document Intelligence response
  const analyzeResult = resultData.analyzeResult;
  
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

