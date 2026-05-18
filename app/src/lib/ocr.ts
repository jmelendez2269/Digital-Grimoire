import { logOcrUsage } from './usage-tracker';
import { performLocalImageOCR } from './utils/local-ocr';

interface OCRResult {
  text: string;
  pageCount: number;
  lineCount: number;
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|bmp|tiff?|webp)(?:$|\?)/i;
const PDF_EXTENSIONS = /\.pdf(?:$|\?)/i;
const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_OCR_MODEL = process.env.MISTRAL_OCR_MODEL || 'mistral-ocr-latest';

interface MistralOcrPage {
  index?: number;
  markdown?: string;
  text?: string;
  content?: string;
}

interface MistralOcrResponse {
  pages?: MistralOcrPage[];
  usage_info?: { pages_processed?: number };
}

async function performMistralPdfOCR(fileUrl: string): Promise<{ text: string; pageCount: number }> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY not configured. Add it to app/.env.local to enable PDF OCR.');
  }

  console.log(`Calling Mistral OCR (${MISTRAL_OCR_MODEL}) for PDF: ${fileUrl.substring(0, 120)}`);

  const response = await fetch(MISTRAL_OCR_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MISTRAL_OCR_MODEL,
      document: { type: 'document_url', document_url: fileUrl },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Mistral OCR ${response.status} ${response.statusText}: ${errorBody.substring(0, 400)}`);
  }

  const data = (await response.json()) as MistralOcrResponse;
  const pages = Array.isArray(data.pages) ? data.pages : [];
  if (pages.length === 0) {
    throw new Error('Mistral OCR returned no pages');
  }

  const sortedPages = [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const text = sortedPages
    .map((page) => page.markdown ?? page.text ?? page.content ?? '')
    .filter(Boolean)
    .join('\n\n');

  return {
    text,
    pageCount: data.usage_info?.pages_processed ?? pages.length,
  };
}

export async function performOCR(
  fileUrl: string,
  userId?: string,
  documentId?: string
): Promise<OCRResult> {
  console.log(`Starting OCR for URL: ${fileUrl}`);

  const lowerUrl = fileUrl.toLowerCase();
  const urlLooksLikePdf = PDF_EXTENSIONS.test(lowerUrl);
  const urlLooksLikeImage = IMAGE_EXTENSIONS.test(lowerUrl);

  // PDF path: Mistral OCR API. Skip the buffer fetch — Mistral pulls the URL directly.
  if (urlLooksLikePdf) {
    const startedAt = Date.now();
    try {
      const { text, pageCount } = await performMistralPdfOCR(fileUrl);
      const lineCount = text.split('\n').filter((line) => line.trim().length > 0).length;

      console.log(`Mistral OCR complete: ${pageCount} pages, ${lineCount} lines, ${text.length} chars`);
      await logOcrUsage({
        pages: pageCount,
        userId,
        documentId,
        success: true,
        responseTime: Date.now() - startedAt,
      });

      return { text, pageCount, lineCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Mistral OCR error';
      await logOcrUsage({ pages: 0, userId, documentId, success: false, errorMessage: message });
      throw new Error(`Mistral OCR failed: ${message}`);
    }
  }

  // Image path: local Tesseract. Fetch buffer then OCR.
  let buffer: Buffer;
  let contentType = '';
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file for OCR: ${response.status} ${response.statusText}`);
    }
    contentType = (response.headers.get('content-type') || '').toLowerCase();
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error';
    await logOcrUsage({ pages: 0, userId, documentId, success: false, errorMessage: message });
    throw new Error(`OCR fetch failed: ${message}`);
  }

  const isImage = contentType.startsWith('image/') || urlLooksLikeImage;
  // Content-type detection rescue: header says PDF even though URL didn't.
  if (!isImage && (contentType === 'application/pdf' || contentType.includes('pdf'))) {
    // Try Mistral with the URL anyway.
    const startedAt = Date.now();
    try {
      const { text, pageCount } = await performMistralPdfOCR(fileUrl);
      const lineCount = text.split('\n').filter((line) => line.trim().length > 0).length;
      await logOcrUsage({ pages: pageCount, userId, documentId, success: true, responseTime: Date.now() - startedAt });
      return { text, pageCount, lineCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Mistral OCR error';
      await logOcrUsage({ pages: 0, userId, documentId, success: false, errorMessage: message });
      throw new Error(`Mistral OCR failed: ${message}`);
    }
  }

  if (!isImage) {
    const message = `Unsupported file type for OCR: ${contentType || 'unknown'} (${fileUrl.substring(0, 120)}). Supported: image/* (Tesseract) and PDFs (Mistral OCR).`;
    await logOcrUsage({ pages: 0, userId, documentId, success: false, errorMessage: message });
    throw new Error(message);
  }

  const startedAt = Date.now();
  try {
    const { text, confidence } = await performLocalImageOCR(buffer);
    const lineCount = text.split('\n').filter((line) => line.trim().length > 0).length;

    console.log(`Tesseract OCR complete: ${lineCount} lines, ${text.length} chars, ${confidence.toFixed(1)}% confidence`);
    await logOcrUsage({
      pages: 1,
      userId,
      documentId,
      success: true,
      responseTime: Date.now() - startedAt,
    });

    return { text, pageCount: 1, lineCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Tesseract error';
    await logOcrUsage({ pages: 0, userId, documentId, success: false, errorMessage: message });
    throw new Error(`Local Tesseract OCR failed: ${message}`);
  }
}
