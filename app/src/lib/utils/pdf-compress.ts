import { PDFDocument } from 'pdf-lib';

export interface CompressionResult {
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  success: boolean;
  error?: string;
}

/**
 * Try server-side compression as a fallback when client-side fails
 */
async function tryServerSideCompression(file: File): Promise<CompressionResult | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/compress-pdf', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.file) {
      return {
        compressedBlob: file,
        originalSize: data.originalSize || file.size,
        compressedSize: data.compressedSize || file.size,
        compressionRatio: data.compressionRatio || 0,
        success: false,
        error: data.error || 'Server-side compression did not reduce file size',
      };
    }
    
    // Convert base64 back to Blob
    const binaryString = atob(data.file);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const compressedBlob = new Blob([bytes], { type: 'application/pdf' });
    
    return {
      compressedBlob,
      originalSize: data.originalSize,
      compressedSize: data.compressedSize,
      compressionRatio: data.compressionRatio,
      success: true,
    };
  } catch (error) {
    console.warn('Server-side compression failed:', error);
    return null;
  }
}

/**
 * Compress a PDF file using pdf-lib with aggressive optimization.
 * This function is non-destructive - it works on a copy and never modifies the original.
 * 
 * @param file - The original PDF File object (will not be modified)
 * @returns Promise with compression result including compressed Blob
 */
export async function compressPDF(file: File): Promise<CompressionResult> {
  const originalSize = file.size;
  
  try {
    // Read the PDF file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false,
      updateMetadata: false, // Preserve original metadata
    });
    
    // Try multiple compression strategies and use the best result
    let bestResult: { bytes: Uint8Array; size: number } | null = null;
    
    // Helper to update best result
    const updateBestResult = (bytes: Uint8Array, size: number) => {
      if (bestResult === null) {
        bestResult = { bytes, size };
      } else if (size < bestResult.size) {
        bestResult = { bytes, size };
      }
    };
    
    // Strategy 1: Standard save with object streams disabled (often smaller)
    try {
      const bytes1 = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      });
      updateBestResult(bytes1, bytes1.length);
    } catch (e) {
      console.warn('Compression strategy 1 failed:', e);
    }
    
    // Strategy 2: Try with object streams enabled (sometimes smaller for certain PDFs)
    try {
      const bytes2 = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });
      updateBestResult(bytes2, bytes2.length);
    } catch (e) {
      console.warn('Compression strategy 2 failed:', e);
    }
    
    // Strategy 3: Create a new PDF and copy pages (removes unnecessary metadata/objects)
    try {
      const newPdfDoc = await PDFDocument.create();
      const pages = pdfDoc.getPages();
      
      for (const page of pages) {
        const size = page.getSize();
        const newPage = newPdfDoc.addPage([size.width, size.height]);
        
        // Copy page content (this may lose some formatting but reduces size)
        const content = page.node;
        // Note: Direct content copying is complex with pdf-lib
        // This strategy may not work perfectly, so we'll skip it for now
      }
      
      // Only use this if we successfully copied pages
      // For now, we'll rely on strategies 1 and 2
    } catch (e) {
      // Strategy 3 is experimental, failures are expected
    }
    
    if (!bestResult) {
      throw new Error('All compression strategies failed');
    }
    
    // TypeScript guard: bestResult is guaranteed to be non-null here
    const result: { bytes: Uint8Array; size: number } = bestResult;
    
    // Validate: Try to load the compressed PDF to ensure it's still valid
    try {
      await PDFDocument.load(result.bytes);
    } catch (validationError) {
      console.error('Compressed PDF validation failed:', validationError);
      // If validation fails, return original file
      return {
        compressedBlob: file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        success: false,
        error: 'Compressed PDF validation failed. Using original file.',
      };
    }
    
    // Create a Blob from the compressed bytes
    const compressedBlob = new Blob([result.bytes], { type: 'application/pdf' });
    const compressedSize = result.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
    
    // If compression didn't actually reduce size (or increased it), try server-side compression
    // But allow up to 1% size increase (some PDFs are already optimized)
    if (compressedSize >= originalSize * 0.99) {
      console.log('Client-side compression did not reduce file size. Trying server-side compression...');
      
      // Try server-side compression as fallback
      const serverResult = await tryServerSideCompression(file);
      if (serverResult && serverResult.success) {
        console.log(`Server-side compression succeeded: ${serverResult.compressionRatio}% reduction`);
        return serverResult;
      }
      
      // If server-side also failed, return original
      console.log('PDF is already optimized. Compression did not reduce file size significantly. Using original file.');
      return {
        compressedBlob: file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        success: false,
        error: 'This PDF appears to already be optimized. The file structure is already compressed. The PDF may contain already-compressed images or be in an optimal format.',
      };
    }
    
    return {
      compressedBlob,
      originalSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 10) / 10, // Round to 1 decimal
      success: true,
    };
  } catch (error) {
    console.error('PDF compression error:', error);
    
    // On any error, return the original file
    return {
      compressedBlob: file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown compression error',
    };
  }
}

/**
 * Check if a file is a PDF and might benefit from compression
 */
export function shouldCompressPDF(file: File): boolean {
  if (file.type !== 'application/pdf') {
    return false;
  }
  
  // Compress PDFs larger than 8MB (recommended threshold for OCR)
  const sizeThreshold = 8 * 1024 * 1024; // 8MB
  return file.size > sizeThreshold;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
