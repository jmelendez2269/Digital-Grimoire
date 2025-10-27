/**
 * PDF Text Extraction Utility
 * Extracts text from PDF files using pdf.js
 */

import * as pdfjsLib from 'pdfjs-dist';

export interface PDFTextPage {
  pageNumber: number;
  text: string;
  items: Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
  }>;
}

export interface PDFTextContent {
  fullText: string;
  pages: PDFTextPage[];
  numPages: number;
}

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.js';
}

const textCache = new Map<string, PDFTextContent>();

/**
 * Extract text from a PDF URL
 */
export async function extractPDFText(pdfUrl: string): Promise<PDFTextContent> {
  // Check cache first
  if (textCache.has(pdfUrl)) {
    return textCache.get(pdfUrl)!;
  }

  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    const numPages = pdf.numPages;
    const pages: PDFTextPage[] = [];
    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items into page text
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      pages.push({
        pageNumber: pageNum,
        text: pageText,
        items: textContent.items.map((item: any) => ({
          str: item.str,
          transform: item.transform,
          width: item.width,
          height: item.height,
        })),
      });

      fullText += pageText + '\n\n';
    }

    const result: PDFTextContent = {
      fullText: fullText.trim(),
      pages,
      numPages,
    };

    // Cache the result
    textCache.set(pdfUrl, result);

    return result;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from a specific page range
 */
export async function extractPDFTextRange(
  pdfUrl: string,
  startPage: number,
  endPage: number
): Promise<string> {
  const content = await extractPDFText(pdfUrl);
  
  const pageTexts = content.pages
    .filter((page) => page.pageNumber >= startPage && page.pageNumber <= endPage)
    .map((page) => page.text);

  return pageTexts.join('\n\n');
}

/**
 * Find the page number for a character position in the full text
 */
export function findPageForPosition(
  content: PDFTextContent,
  charPosition: number
): number {
  let currentPos = 0;

  for (const page of content.pages) {
    const pageLength = page.text.length + 2; // +2 for '\n\n'
    if (charPosition <= currentPos + pageLength) {
      return page.pageNumber;
    }
    currentPos += pageLength;
  }

  return content.numPages; // Return last page if position is beyond content
}

/**
 * Clear the text cache
 */
export function clearTextCache(): void {
  textCache.clear();
}

/**
 * Remove specific URL from cache
 */
export function removeCachedText(pdfUrl: string): void {
  textCache.delete(pdfUrl);
}

