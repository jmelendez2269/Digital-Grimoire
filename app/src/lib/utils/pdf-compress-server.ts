import { PDFDocument } from 'pdf-lib';

export interface ServerCompressionResult {
  compressedBuffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  success: boolean;
  error?: string;
}

/**
 * Compress a PDF buffer on the server side.
 * This function is non-destructive - it works on a copy and never modifies the original.
 * 
 * @param pdfBuffer - The original PDF buffer (will not be modified)
 * @returns Promise with compression result including compressed buffer
 */
export async function compressPDFServer(pdfBuffer: Buffer): Promise<ServerCompressionResult> {
  const originalSize = pdfBuffer.length;
  
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: false,
      updateMetadata: false, // Preserve original metadata
    });
    
    // Light optimization: Remove unnecessary objects and optimize structure
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: false, // Can help reduce size in some cases
      addDefaultPage: false,
    });
    
    const compressedBuffer = Buffer.from(compressedBytes);
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
    
    // Validate: Try to load the compressed PDF to ensure it's still valid
    try {
      await PDFDocument.load(compressedBytes);
    } catch (validationError) {
      console.error('Compressed PDF validation failed:', validationError);
      // If validation fails, return original buffer
      return {
        compressedBuffer: pdfBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        success: false,
        error: 'Compressed PDF validation failed. Using original file.',
      };
    }
    
    // If compression didn't actually reduce size (or increased it), return original
    if (compressedSize >= originalSize) {
      console.warn('Compression did not reduce file size. Using original.');
      return {
        compressedBuffer: pdfBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        success: false,
        error: 'Compression did not reduce file size. Using original file.',
      };
    }
    
    return {
      compressedBuffer,
      originalSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 10) / 10, // Round to 1 decimal
      success: true,
    };
  } catch (error) {
    console.error('PDF compression error:', error);
    
    // On any error, return the original buffer
    return {
      compressedBuffer: pdfBuffer,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown compression error',
    };
  }
}
