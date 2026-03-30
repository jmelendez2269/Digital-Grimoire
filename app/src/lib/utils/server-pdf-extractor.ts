const pdfParse = require('pdf-parse');

export interface PDFResult {
  text: string;
  pageCount: number;
}

/**
 * Extracts text natively from a PDF buffer using pdf-parse.
 * This works perfectly for digital (born-digital) PDFs, but not for scanned images.
 * Returns the extracted text and the number of pages.
 */
export async function extractPdfTextLocally(fileBuffer: Buffer): Promise<PDFResult> {
  console.log('Attempting local PDF text extraction via pdf-parse...');
  try {
    const data = await pdfParse(fileBuffer, { max: 0 }); // max:0 extracts all pages
    
    // Check if the extracted text is substantial
    // Scanned PDFs often return very little text or garbage characters
    const text = data.text ? data.text.trim() : '';
    const pageCount = data.numpages || 0;
    
    console.log(`pdf-parse completed: ${pageCount} pages, ${text.length} characters extracted.`);
    
    return {
      text,
      pageCount
    };
  } catch (error) {
    console.error('pdf-parse extraction failed:', error);
    throw new Error(`Failed to extract PDF text locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Heuristics to determine if the extracted text from a PDF is good enough
 * to skip OCR completely.
 * 
 * Scanned PDFs might yield a few stray characters from invisible text layers,
 * but born-digital PDFs will have substantial text.
 */
export function isTextSubstantial(text: string, pageCount: number): boolean {
  if (!text || pageCount === 0) return false;
  
  // Average characters per page in a normal book/document is ~1500-3000
  // If we have less than 50 characters per page on average, it's likely a scan
  // or a very image-heavy document without proper text layers.
  const charsPerPage = text.length / pageCount;
  
  console.log(`Local PDF extraction yielded ~${Math.round(charsPerPage)} chars/page`);
  
  return charsPerPage >= 100; // Requires at least 100 characters per page to trust the raw extract
}
