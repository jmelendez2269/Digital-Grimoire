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
 * but born-digital PDFs will have substantial text. Some scanned PDFs also have
 * a thin, low-quality embedded text layer from a prior bad OCR pass — we must
 * reject these even if they technically exceed a bare character count.
 */
export function isTextSubstantial(text: string, pageCount: number): boolean {
  if (!text || pageCount === 0) return false;

  const charsPerPage = text.length / pageCount;
  console.log(`Local PDF extraction yielded ~${Math.round(charsPerPage)} chars/page`);

  // Require at least 300 meaningful characters per page.
  // 100 was too low — many scanned PDFs with a bad embedded text layer pass it.
  if (charsPerPage < 300) return false;

  // Quality check: at least 70% of characters should be alphanumeric or common
  // punctuation. Garbage OCR layers tend to be full of special chars and symbols.
  const alphanumAndPunctuation = (text.match(/[a-zA-Z0-9 .,;:'"!?\-\n]/g) || []).length;
  const qualityRatio = alphanumAndPunctuation / text.length;
  console.log(`Local PDF text quality ratio: ${(qualityRatio * 100).toFixed(1)}% clean chars`);

  if (qualityRatio < 0.70) {
    console.log('⚠️ Text quality too low (likely garbled embedded OCR layer). Falling back to Azure OCR.');
    return false;
  }

  // Sanity check: the text should contain real words, not just symbols/numbers.
  // Count words with 3+ letters as a proxy for "real prose".
  const realWords = (text.match(/[a-zA-Z]{3,}/g) || []).length;
  const realWordsPerPage = realWords / pageCount;
  console.log(`Local PDF extraction: ~${Math.round(realWordsPerPage)} real words/page`);

  if (realWordsPerPage < 50) {
    console.log('⚠️ Too few real words per page. Falling back to Azure OCR.');
    return false;
  }

  return true;
}
