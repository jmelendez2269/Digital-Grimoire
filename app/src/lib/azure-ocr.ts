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
    const missing = [];
    if (!endpoint) missing.push('AZURE_VISION_ENDPOINT');
    if (!key) missing.push('AZURE_VISION_KEY');
    throw new Error(
      `Azure credentials not configured. Missing: ${missing.join(', ')}. ` +
      `Please add these to your app/.env.local file. See docs/Setup Docs/AZURE_COMPUTER_VISION_SETUP.md for instructions.`
    );
  }

  // Validate endpoint format
  if (!endpoint.startsWith('https://') || !endpoint.includes('.cognitiveservices.azure.com')) {
    throw new Error(
      `Invalid Azure endpoint format: ${endpoint}. ` +
      `Expected format: https://YOUR_RESOURCE.cognitiveservices.azure.com/`
    );
  }

  // Validate key format (should be 32 characters)
  if (key.length < 32) {
    console.warn(`Azure key appears to be too short (${key.length} chars). Expected 32 characters.`);
  }

  console.log(`Starting OCR for URL: ${fileUrl}`);
  console.log(`Azure endpoint: ${endpoint.substring(0, 50)}...`); // Only log first 50 chars for security

  // Detect if file is likely a PDF based on URL
  const isLikelyPDF = fileUrl.toLowerCase().includes('.pdf') || 
                      fileUrl.toLowerCase().endsWith('/pdf') ||
                      fileUrl.toLowerCase().includes('application/pdf');

  // Try Document Intelligence API first (better for large documents)
  // If that fails with 401/404, fall back to Computer Vision API
  const baseEndpoint = endpoint.replace(/\/$/, '');
  const documentIntelligenceUrl = `${baseEndpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
  const computerVisionUrl = `${baseEndpoint}/vision/v3.2/read/analyze`;
  
  let analyzeResponse;
  let useDocumentIntelligence = true;
  
  try {
    // First, try Document Intelligence API
    console.log('Attempting Document Intelligence API (Form Recognizer)...');
    const response = await fetch(documentIntelligenceUrl, {
      method: 'POST',
      headers: { 
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ urlSource: fileUrl })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorText = JSON.stringify(errorData);
      const errorMessage = errorData.error?.message || errorText;
      
      console.error('Document Intelligence API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorText.substring(0, 200)
      });
      
      // Check if this is a size-related error from Document Intelligence
      const isSizeError = errorMessage.includes('too large') || 
                         errorMessage.includes('larger than') || 
                         errorMessage.includes('exceeds') ||
                         errorMessage.includes('size limit') ||
                         errorMessage.includes('4MB') ||
                         errorMessage.includes('50MB');
      
      // If Document Intelligence fails with a size error, don't fall back to Computer Vision
      // Computer Vision has a 4MB limit and will definitely fail for large files
      if (response.status === 400 && isSizeError) {
        const errorDetails = errorMessage.substring(0, 200);
        const finalError = `Azure Document Intelligence failed: The file exceeds the size limit. ` +
          `Document Intelligence supports PDFs up to 50MB, but this file appears to be too large. ` +
          `File URL: ${fileUrl.substring(0, 80)}... ` +
          `Please compress the file or split it into smaller parts. ` +
          `Error details: ${errorDetails}`;
        
        await logOcrUsage({
          pages: 0,
          userId,
          documentId,
          success: false,
          errorMessage: finalError,
        });
        
        throw new Error(finalError);
      }
      
      // If 400 (non-size), 401, or 404, try falling back to Computer Vision API
      // 400 can happen if Document Intelligence API doesn't support the file or URL format
      // For PDFs, only fall back if it's not a size error (Computer Vision has 4MB limit)
      if ((response.status === 400 || response.status === 401 || response.status === 404) && useDocumentIntelligence) {
        // For PDFs, be cautious about falling back to Computer Vision due to 4MB limit
        if (isLikelyPDF && response.status === 400) {
          console.warn('Document Intelligence failed for PDF with 400 error. This may indicate a size or format issue.');
          console.warn('Computer Vision fallback may fail for large PDFs due to 4MB image limit.');
          
          // If Document Intelligence fails with 400 for a PDF, it might be a page-level size issue
          // Don't fall back to Computer Vision as it will likely fail with the same issue
          const errorDetails = errorMessage.substring(0, 500);
          const finalError = `Azure Document Intelligence failed to process your PDF. ` +
            `Even though your file is under 8MB total, individual pages may exceed Azure's 4MB limit when converted to images. ` +
            `This often happens with PDFs that have high-resolution images or scanned pages. ` +
            `\n\nSolutions:\n` +
            `1. Further compress the PDF using a tool that compresses embedded images\n` +
            `2. Reduce the resolution of images within the PDF\n` +
            `3. Split the PDF into smaller sections\n` +
            `4. Use a PDF with lower image quality/resolution\n\n` +
            `Error details: ${errorDetails}`;
          
          await logOcrUsage({
            pages: 0,
            userId,
            documentId,
            success: false,
            errorMessage: finalError,
          });
          
          throw new Error(finalError);
        }
        console.log('Document Intelligence API not available, trying Computer Vision API...');
        useDocumentIntelligence = false;
        
        // Fallback to Computer Vision API
        console.log('Trying Computer Vision API with URL format...');
        const cvResponse = await fetch(computerVisionUrl, {
          method: 'POST',
          headers: { 
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: fileUrl })
        });
        
        if (!cvResponse.ok) {
          const cvErrorData = await cvResponse.json().catch(() => ({}));
          console.error('Both Azure OCR APIs failed:', {
            documentIntelligence: { status: response.status, statusText: response.statusText, error: errorData },
            computerVision: { status: cvResponse.status, statusText: cvResponse.statusText, error: cvErrorData },
            fileUrl: fileUrl.substring(0, 100) + '...'
          });
          
          let errorMessage = `Azure OCR API failed: ${cvResponse.status} - ${cvResponse.statusText}`;
          if (cvResponse.status === 400) {
            const errorDetails = cvErrorData.error?.message || JSON.stringify(cvErrorData);
            const isCvSizeError = errorDetails.includes('too large') || errorDetails.includes('larger than') || errorDetails.includes('4MB');
            if (isCvSizeError) {
              errorMessage = `Azure OCR failed: Individual PDF pages exceed the 4MB image limit. ` +
                `Even though your total file is under 8MB, when Azure converts PDF pages to images for processing, ` +
                `each page image must be under 4MB. High-resolution or scanned pages often exceed this limit. ` +
                `\n\nSolutions:\n` +
                `1. Compress the PDF using a tool that reduces image resolution (not just file structure)\n` +
                `2. Reduce image quality/resolution within the PDF\n` +
                `3. Split the PDF into smaller sections with fewer pages\n` +
                `4. Use a lower-resolution version of the PDF\n\n` +
                `Error details: ${errorDetails.substring(0, 200)}`;
            } else {
              errorMessage = `Azure OCR bad request (400). ` +
                `This usually means the file URL is not accessible or the file format/size is not supported. ` +
                `File URL: ${fileUrl.substring(0, 80)}... ` +
                `Ensure the file is publicly accessible and not behind authentication. ` +
                `Error details: ${errorDetails.substring(0, 200)}`;
            }
          } else if (cvResponse.status === 401) {
            errorMessage = `Azure OCR authentication failed (401 PermissionDenied). ` +
              `Please verify your AZURE_VISION_KEY in app/.env.local is correct. ` +
              `You can find your key in Azure Portal → Your Computer Vision resource → Keys and Endpoint. ` +
              `Make sure you're using the full 32-character key (no spaces), and that the resource hasn't been deleted or expired. ` +
              `Also check that your subscription is active and not past the free trial period.`;
          } else if (cvResponse.status === 404) {
            errorMessage = `Azure OCR endpoint not found (404). ` +
              `Please verify your AZURE_VISION_ENDPOINT in app/.env.local. ` +
              `The endpoint should be: https://YOUR_RESOURCE.cognitiveservices.azure.com/ ` +
              `(with trailing slash). Also ensure your resource supports Computer Vision API.`;
          } else if (cvResponse.status === 429) {
            errorMessage = `Azure OCR rate limit exceeded (429). ` +
              `Please wait a moment and try again, or upgrade your Azure pricing tier.`;
          }
          
          await logOcrUsage({
            pages: 0,
            userId,
            documentId,
            success: false,
            errorMessage,
          });
          
          throw new Error(errorMessage);
        }
        
        // Computer Vision API succeeded
        analyzeResponse = {
          headers: Object.fromEntries(cvResponse.headers.entries())
        };
        console.log('Using Computer Vision API (fallback)');
      } else {
        // Document Intelligence API failed with non-401/404 error
        console.error('Azure OCR API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          url: documentIntelligenceUrl.substring(0, 100) + '...'
        });
        
        let errorMessage = `Azure OCR API failed: ${response.status} - ${response.statusText}`;
        if (response.status === 400) {
          const errorDetails = errorData.error?.message || JSON.stringify(errorData);
          const isSizeError = errorDetails.includes('too large') || errorDetails.includes('larger than');
          if (isSizeError) {
            errorMessage = `Azure OCR bad request (400). ` +
              `The file exceeds Azure's size limit. ` +
              `Document Intelligence API supports PDFs up to 50MB, but if processing fails and falls back to Computer Vision, images must be under 4MB. ` +
              `File URL: ${fileUrl.substring(0, 80)}... ` +
              `The system will try Computer Vision API as fallback, but it may also fail if the file is too large. ` +
              `Error details: ${errorDetails.substring(0, 200)}`;
          } else {
            errorMessage = `Azure OCR bad request (400). ` +
              `Document Intelligence API may not support this file format, size, or URL. ` +
              `File URL: ${fileUrl.substring(0, 80)}... ` +
              `The system will try Computer Vision API as fallback. ` +
              `Error details: ${errorDetails.substring(0, 200)}`;
          }
          // Don't throw here - let it fall through to try Computer Vision
        } else if (response.status === 401) {
          errorMessage = `Azure OCR authentication failed (401 PermissionDenied). ` +
            `Please verify your AZURE_VISION_KEY in app/.env.local is correct. ` +
            `You can find your key in Azure Portal → Your Computer Vision resource → Keys and Endpoint. ` +
            `Make sure you're using the full 32-character key (no spaces), and that the resource hasn't been deleted or expired. ` +
            `Also check that your subscription is active and not past the free trial period.`;
        } else if (response.status === 404) {
          errorMessage = `Azure OCR endpoint not found (404). ` +
            `Your resource may not support Document Intelligence API. ` +
            `The system will try Computer Vision API as fallback.`;
        } else if (response.status === 429) {
          errorMessage = `Azure OCR rate limit exceeded (429). ` +
            `Please wait a moment and try again, or upgrade your Azure pricing tier.`;
        }
        
        await logOcrUsage({
          pages: 0,
          userId,
          documentId,
          success: false,
          errorMessage,
        });
        
        throw new Error(errorMessage);
      }
    } else {
      // Document Intelligence API succeeded
      analyzeResponse = {
        headers: Object.fromEntries(response.headers.entries())
      };
      console.log('Using Document Intelligence API');
    }
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

  // Extract text from the OCR response
  // Document Intelligence uses: analyzeResult.pages[].lines[].content
  // Computer Vision uses: analyzeResult.readResults[].lines[].text
  const analyzeResult = resultData.analyzeResult;
  
  if (!analyzeResult) {
    throw new Error('Invalid OCR response: missing analyzeResult');
  }

  // Extract all text lines from all pages
  const allLines: string[] = [];
  let pageCount = 0;

  // Try Document Intelligence format first (pages structure)
  if (analyzeResult.pages && Array.isArray(analyzeResult.pages)) {
    // Document Intelligence v4.0 structure: analyzeResult.pages[].lines[].content
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
  } else if (analyzeResult.readResults && Array.isArray(analyzeResult.readResults)) {
    // Computer Vision API structure: analyzeResult.readResults[].lines[].text
    for (const page of analyzeResult.readResults) {
      pageCount++;
      if (page.lines && Array.isArray(page.lines)) {
        for (const line of page.lines) {
          if (line.text) {
            allLines.push(line.text);
          }
        }
      }
    }
  } else {
    throw new Error('Invalid OCR response: missing pages or readResults data');
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

