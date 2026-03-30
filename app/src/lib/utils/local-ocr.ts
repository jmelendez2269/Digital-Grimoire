import { createWorker } from 'tesseract.js';

export interface LocalOCRResult {
  text: string;
  confidence: number;
}

/**
 * Perform local OCR on an image buffer using tesseract.js
 * Default language is 'eng'. Can pass an array of languages like ['eng', 'fra']
 */
export async function performLocalImageOCR(imageBuffer: Buffer, languages = 'eng'): Promise<LocalOCRResult> {
  console.log(`Starting local OCR with Tesseract.js for languages: ${languages}`);
  let worker: any = null;
  
  try {
    // Create worker
    worker = await createWorker(languages);
    
    // Process image
    console.log('Tesseract.js recognizing image...');
    const { data } = await worker.recognize(imageBuffer);
    
    const text = data.text ? data.text.trim() : '';
    const confidence = data.confidence || 0;
    
    console.log(`Local OCR completed: ${text.length} characters extracted with ${confidence}% confidence.`);
    
    return {
      text,
      confidence
    };
  } catch (error) {
    console.error('Local OCR execution failed:', error);
    throw new Error(`Failed to perform local OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (worker) {
      await worker.terminate().catch(console.error);
    }
  }
}
