import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

/**
 * Server-side PDF compression API route
 * This provides better compression than client-side due to Node.js capabilities
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    const originalSize = file.size;
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });

    // Try multiple compression strategies
    let bestResult: { bytes: Uint8Array; size: number } | null = null;

    // Helper to update best result
    const updateBestResult = (bytes: Uint8Array, size: number) => {
      if (bestResult === null) {
        bestResult = { bytes, size };
      } else if (size < bestResult.size) {
        bestResult = { bytes, size };
      }
    };

    // Strategy 1: Standard save with object streams disabled
    try {
      const bytes1 = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      });
      updateBestResult(bytes1, bytes1.length);
    } catch (e) {
      console.warn('Compression strategy 1 failed:', e);
    }

    // Strategy 2: Try with object streams enabled
    try {
      const bytes2 = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });
      updateBestResult(bytes2, bytes2.length);
    } catch (e) {
      console.warn('Compression strategy 2 failed:', e);
    }

    if (!bestResult) {
      return NextResponse.json(
        { error: 'All compression strategies failed' },
        { status: 500 }
      );
    }

    // TypeScript guard: bestResult is guaranteed to be non-null here
    const result: { bytes: Uint8Array; size: number } = bestResult;

    // Validate the compressed PDF
    try {
      await PDFDocument.load(result.bytes);
    } catch (validationError) {
      return NextResponse.json(
        { error: 'Compressed PDF validation failed' },
        { status: 500 }
      );
    }

    const compressedSize = result.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    // If compression didn't help, return original
    if (compressedSize >= originalSize * 0.99) {
      return NextResponse.json({
        success: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        error: 'PDF is already optimized. Compression did not reduce file size.',
        file: null, // Return null to indicate no compression occurred
      });
    }

    // Convert to base64 for transfer
    const base64 = Buffer.from(result.bytes).toString('base64');

    return NextResponse.json({
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 10) / 10,
      file: base64, // Base64 encoded compressed PDF
    });
  } catch (error) {
    console.error('PDF compression error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown compression error',
      },
      { status: 500 }
    );
  }
}
