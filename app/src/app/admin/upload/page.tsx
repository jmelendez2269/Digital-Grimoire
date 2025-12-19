'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Check, AlertCircle, Loader2, ChevronDown, ChevronUp, Eye, Trash2, Home, Library, LayoutDashboard, Shrink, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DocumentMetadata } from '@/lib/claude-metadata';
import Link from 'next/link';
import Header from '@/components/Header';
import { compressPDF, shouldCompressPDF, formatFileSize as formatFileSizeUtil } from '@/lib/utils/pdf-compress';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:11',message:'Import check - Header',data:{HeaderType:typeof Header,HeaderValue:Header?.toString?.()?.substring(0,50)||'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:11',message:'Import check - lucide icons',data:{Upload:typeof Upload,FileText:typeof FileText,X:typeof X,Check:typeof Check,AlertCircle:typeof AlertCircle,Loader2:typeof Loader2,ChevronDown:typeof ChevronDown,ChevronUp:typeof ChevronUp,Eye:typeof Eye,Trash2:typeof Trash2,Home:typeof Home,Library:typeof Library,LayoutDashboard:typeof LayoutDashboard,Shrink:typeof Shrink,RotateCcw:typeof RotateCcw},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:11',message:'Import check - pdf-compress',data:{compressPDF:typeof compressPDF,shouldCompressPDF:typeof shouldCompressPDF,formatFileSizeUtil:typeof formatFileSizeUtil},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:11',message:'Import check - Link and useDropzone',data:{Link:typeof Link,useDropzone:typeof useDropzone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion

interface SimilarDocument {
  id: string;
  title: string;
  author?: string;
  year?: number;
  standardizedId?: string;
  similarityScore: number;
  matchReason: string;
}

interface UploadFile {
  id: string;
  file: File;
  originalFile?: File; // Store original file when compressed
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error' | 'compressing';
  error?: string;
  warning?: string;
  metadata?: DocumentMetadata;
  shortSummary?: string;
  longSummary?: string;
  rawAiOutput?: string;
  pageCount?: number;
  lineCount?: number;
  lenses?: string[];
  previewUrl?: string;
  similarDocuments?: SimilarDocument[];
  hasDuplicates?: boolean;
  isCompressed?: boolean;
  originalSize?: number;
  compressionRatio?: number;
}

export default function AdminUploadPage() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:45',message:'Component render start',data:{HeaderDefined:Header!==undefined,HeaderType:typeof Header},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const supabase = createClient();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);

  // Prevent browser default drop behavior globally (opening files)
  useEffect(() => {
    const handleGlobalDrop = (e: DragEvent) => {
      // Only prevent default if dropping files (not text/links)
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    const handleGlobalDragOver = (e: DragEvent) => {
      // Prevent default to allow drop
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
    };

    document.addEventListener('drop', handleGlobalDrop);
    document.addEventListener('dragover', handleGlobalDragOver);
    
    return () => {
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('dragover', handleGlobalDragOver);
    };
  }, []);

  // Suppress FileSystemFileHandle errors - these are non-fatal and react-dropzone falls back to standard API
  useEffect(() => {
    // Store original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Override console.error to filter out FileSystemFileHandle errors
    console.error = (...args: any[]) => {
      const errorString = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.message || arg?.toString() || ''
      ).join(' ');
      
      // Suppress FileSystemFileHandle errors - more permissive check
      if (
        errorString.includes('FileSystemFileHandle') ||
        (errorString.includes('getFile') && errorString.includes('FileSystem')) ||
        (errorString.includes('NotAllowedError') && (errorString.includes('getFile') || errorString.includes('FileSystem')))
      ) {
        // Suppress the error - don't log it
        return;
      }
      
      // Log other errors normally
      originalConsoleError.apply(console, args);
    };

    // Override console.warn to filter out FileSystemFileHandle warnings
    console.warn = (...args: any[]) => {
      const warnString = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.message || arg?.toString() || ''
      ).join(' ');
      
      // Suppress FileSystemFileHandle warnings - more permissive check
      if (
        warnString.includes('FileSystemFileHandle') ||
        (warnString.includes('getFile') && warnString.includes('FileSystem')) ||
        (warnString.includes('NotAllowedError') && (warnString.includes('getFile') || warnString.includes('FileSystem')))
      ) {
        // Suppress the warning - don't log it
        return;
      }
      
      // Log other warnings normally
      originalConsoleWarn.apply(console, args);
    };

    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      const errorMessage = error?.message || error?.toString() || '';
      
      // Suppress FileSystemFileHandle errors - these are expected when File System Access API is not available
      if (
        errorMessage.includes('FileSystemFileHandle') ||
        errorMessage.includes('getFile') ||
        (error?.name === 'NotAllowedError' && errorMessage.includes('FileSystem'))
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      return true;
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      
      // Suppress FileSystemFileHandle errors - these are expected when File System Access API is not available
      if (
        errorMessage.includes('FileSystemFileHandle') ||
        errorMessage.includes('getFile') ||
        (error?.name === 'NotAllowedError' && errorMessage.includes('FileSystem'))
      ) {
        event.preventDefault();
        return false;
      }
      return true;
    };

    window.addEventListener('error', handleError, true); // Use capture phase
    window.addEventListener('unhandledrejection', handleRejection, true); // Use capture phase

    return () => {
      // Restore original console methods
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection, true);
    };
  }, []);

  // File validation
  const validateFile = (file: File): string | null => {
    // Different max sizes for different file types
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 200 * 1024 * 1024 : 50 * 1024 * 1024; // 200MB for video, 50MB for others
    const ocrRecommendedSize = 8 * 1024 * 1024; // 8MB recommended for OCR processing
    
    const allowedTypes = [
      // Documents
      'application/pdf',
      'text/html',
      // Images (existing)
      'image/png',
      'image/jpeg',
      'image/jpg',
      // Media (new)
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/flac',
      'audio/x-m4a',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'image/gif',
      'image/webp',
    ];

    // Also allow any audio/*, video/*, or image/* MIME types
    const isAllowedGenericType = 
      file.type.startsWith('audio/') ||
      file.type.startsWith('video/') ||
      file.type.startsWith('image/');

    if (!allowedTypes.includes(file.type) && !isAllowedGenericType) {
      return 'Only PDF, HTML, image, audio, and video files are allowed';
    }

    if (file.size > maxSize) {
      return isVideo 
        ? 'Video file size must be less than 200MB'
        : 'File size must be less than 50MB';
    }

    // Warn about image files over 8MB (may fail OCR due to Azure's 4MB limit)
    const isImage = file.type.startsWith('image/');
    if (isImage && file.size > ocrRecommendedSize) {
      // Return a warning (non-blocking) - we'll handle this in the UI
      // For now, just allow it but we'll show a warning in the file list
    }

    return null;
  };

  // Drag-and-drop handler
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    try {
      console.log('[UPLOAD] onDrop called:', { 
        acceptedCount: acceptedFiles.length, 
        rejectedCount: rejectedFiles.length,
        acceptedFiles: acceptedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
        rejectedFiles: rejectedFiles.map(({ file, errors }) => ({ 
          name: file.name, 
          type: file.type, 
          errors: errors.map((e: any) => `${e.code}: ${e.message}`) 
        }))
      });
      
      if (rejectedFiles.length > 0) {
        console.error('[UPLOAD] Files rejected:', rejectedFiles);
      }
      
      const ocrRecommendedSize = 8 * 1024 * 1024; // 8MB recommended for OCR processing
      const newFiles: UploadFile[] = acceptedFiles.map((file) => {
        const error = validateFile(file);
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        
        // Warning for large images
        let warning: string | undefined = undefined;
        if (isImage && file.size > ocrRecommendedSize) {
          warning = 'Image file exceeds 8MB. OCR processing may fail due to Azure\'s 4MB limit for images. Consider compressing the image before uploading.';
        } else if (isPDF && shouldCompressPDF(file)) {
          // Warning for large PDFs
          warning = 'Large PDF detected. OCR may fail due to Azure\'s 4MB per-page limit. Consider compressing the PDF before uploading.';
        }
        
        // Create preview URL for PDFs and images
        const previewUrl = 
          file.type === 'application/pdf' || 
          file.type.startsWith('image/') ||
          file.type.startsWith('video/')
            ? URL.createObjectURL(file) 
            : undefined;
        return {
          id: Math.random().toString(36).substring(7),
          file,
          originalFile: undefined, // Will be set if compressed
          progress: 0,
          status: error ? 'error' : 'pending',
          error: error || undefined,
          warning,
          previewUrl,
          isCompressed: false,
          originalSize: file.size,
        };
      });
      setFiles((prev) => [...prev, ...newFiles]);
    } catch (error) {
      // Catch any errors during file processing (including FileSystemFileHandle errors)
      console.error('[UPLOAD] Error in onDrop:', error);
      // If it's a FileSystemFileHandle error, it's non-fatal - the files should still be available
      if (error instanceof Error && error.message.includes('FileSystemFileHandle')) {
        console.debug('[UPLOAD] FileSystemFileHandle error caught (non-fatal), continuing...');
      } else {
        // For other errors, show user feedback
        console.error('[UPLOAD] Unexpected error during file drop:', error);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      // Documents
      'application/pdf': ['.pdf'],
      'text/html': ['.html', '.htm'],
      // Images
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      // Audio
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'audio/flac': ['.flac'],
      'audio/x-m4a': ['.m4a'],
      // Video
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
    },
    multiple: true,
    maxSize: 209715200, // 200MB (for video files)
    noClick: false,
    noKeyboard: false,
    onDragEnter: () => {
      console.log('[UPLOAD] Drag enter');
    },
    onDragOver: () => {
      console.log('[UPLOAD] Drag over');
    },
    onDragLeave: () => {
      console.log('[UPLOAD] Drag leave');
    },
    onDropRejected: (rejectedFiles) => {
      console.error('[UPLOAD] Files rejected:', rejectedFiles);
      rejectedFiles.forEach(({ file, errors }) => {
        console.error(`[UPLOAD] File ${file.name} rejected:`, errors);
        const errorMessages = errors.map((e: any) => `${e.code}: ${e.message}`).join(', ');
        // Add rejected files to the queue with error status
        setFiles((prev) => [...prev, {
          id: Math.random().toString(36).substring(7),
          file,
          progress: 0,
          status: 'error',
          error: `File rejected: ${errorMessages}`,
        }]);
      });
    },
  });

  // Remove file from queue
  const removeFile = (id: string) => {
    const fileToRemove = files.find((f) => f.id === id);
    if (fileToRemove?.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Compress PDF file
  const handleCompressPDF = async (uploadFile: UploadFile) => {
    if (uploadFile.file.type !== 'application/pdf') {
      return;
    }

    try {
      // Update status to compressing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'compressing' } : f
        )
      );

      // Compress the PDF
      const result = await compressPDF(uploadFile.file);

      if (result.success && result.compressedBlob) {
        // Create a new File object from the compressed Blob
        const compressedFile = new File(
          [result.compressedBlob],
          uploadFile.file.name,
          { type: 'application/pdf' }
        );

        // Revoke old preview URL if exists
        if (uploadFile.previewUrl) {
          URL.revokeObjectURL(uploadFile.previewUrl);
        }

        // Create new preview URL for compressed file
        const newPreviewUrl = URL.createObjectURL(compressedFile);

        // Update file with compressed version
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  file: compressedFile,
                  originalFile: uploadFile.file, // Store original
                  status: 'pending',
                  isCompressed: true,
                  originalSize: result.originalSize,
                  compressionRatio: result.compressionRatio,
                  previewUrl: newPreviewUrl,
                  warning: undefined, // Clear warning after compression
                }
              : f
          )
        );
      } else {
        // Compression failed - show error but keep original
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'pending',
                  error: result.error || 'Compression failed. Using original file.',
                }
              : f
          )
        );
      }
    } catch (error) {
      console.error('Compression error:', error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'pending',
                error: error instanceof Error ? error.message : 'Compression failed. Using original file.',
              }
            : f
        )
      );
    }
  };

  // Restore original file
  const handleRestoreOriginal = (uploadFile: UploadFile) => {
    if (!uploadFile.originalFile) {
      return;
    }

    // Revoke compressed preview URL
    if (uploadFile.previewUrl) {
      URL.revokeObjectURL(uploadFile.previewUrl);
    }

    // Create new preview URL for original file
    const newPreviewUrl = URL.createObjectURL(uploadFile.originalFile);

    // Restore original file
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id
          ? {
              ...f,
              file: uploadFile.originalFile!,
              originalFile: undefined,
              isCompressed: false,
              originalSize: uploadFile.originalFile.size,
              compressionRatio: undefined,
              previewUrl: newPreviewUrl,
              warning: shouldCompressPDF(uploadFile.originalFile!)
                ? 'Large PDF detected. OCR may fail due to Azure\'s 4MB per-page limit. Consider compressing the PDF before uploading.'
                : undefined,
            }
          : f
      )
    );
  };

  // Clear all successful uploads
  const clearSuccessful = () => {
    files.forEach((f) => {
      if (f.status === 'success' && f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  // Clear all failed uploads
  const clearFailed = () => {
    files.forEach((f) => {
      if (f.status === 'error' && f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setFiles((prev) => prev.filter((f) => f.status !== 'error'));
  };

  // Clear all uploads (success and failed)
  const clearAll = () => {
    files.forEach((f) => {
      if ((f.status === 'success' || f.status === 'error') && f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setFiles((prev) => prev.filter((f) => f.status !== 'success' && f.status !== 'error'));
  };

  // Toggle file details expansion
  const toggleExpanded = (id: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Upload single file
  const uploadFile = async (uploadFile: UploadFile) => {
    const { file } = uploadFile;

    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
        )
      );

      // Get presigned URL from API
      const presignedResponse = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!presignedResponse.ok) {
        let errorMessage = 'Failed to get upload URL';
        try {
          const error = await presignedResponse.json();
          errorMessage = error.error || error.details || errorMessage;
          // Include additional details if available
          if (error.details && error.details !== error.error) {
            errorMessage = `${error.error || errorMessage}: ${error.details}`;
          }
        } catch (e) {
          // Response wasn't JSON, use status text
          errorMessage = `${errorMessage}: ${presignedResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const { presignedUrl, key } = await presignedResponse.json();

      // Update progress
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 25 } : f))
      );

      // Upload to R2
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file to R2: ${uploadResponse.statusText}`);
      }

      // Update progress
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 50 } : f))
      );

      // Update status to processing
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'processing', progress: 60 } : f))
      );

      // Get current user to pass to processing
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Determine if this is a media file
      const isMediaFile = 
        file.type.startsWith('audio/') ||
        file.type.startsWith('video/') ||
        (file.type.startsWith('image/') && file.type !== 'image/png' && file.type !== 'image/jpeg' && file.type !== 'image/jpg');

      // Route to appropriate processing endpoint
      const processEndpoint = isMediaFile ? '/api/process-media' : '/api/process-document';
      
      // Trigger processing (OCR/metadata extraction for documents, media processing for media)
      const processResponse = await fetch(processEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key,
          userId: currentUser?.id 
        }),
      });

      if (!processResponse.ok) {
        let errorMessage = 'Failed to process document';
        let errorData: any = {};
        try {
          errorData = await processResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response wasn't JSON, use status text
          errorMessage = `${errorMessage}: ${processResponse.statusText}`;
        }
        
        // Check if error is due to file size (Azure OCR size limit)
        const isSizeError = errorMessage.includes('too large') || 
                           errorMessage.includes('larger than') || 
                           errorMessage.includes('4MB limit') ||
                           errorMessage.includes('size limit');
        
        throw new Error(errorMessage);
      }

      const processData = await processResponse.json();

      // Update progress
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 90 } : f))
      );

      // Success! Store all the metadata
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                metadata: processData.metadata,
                shortSummary: processData.shortSummary,
                longSummary: processData.longSummary,
                rawAiOutput: processData.rawAiOutput,
                pageCount: processData.pageCount,
                lineCount: processData.lineCount,
                lenses: processData.metadata?.lenses || [],
                similarDocuments: processData.similarDocuments,
                hasDuplicates: processData.hasDuplicates,
              }
            : f
        )
      );
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Check if error is due to file size (Azure OCR size limit)
      const isSizeError = errorMessage.includes('too large') || 
                         errorMessage.includes('larger than') || 
                         errorMessage.includes('4MB limit') ||
                         errorMessage.includes('size limit');
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'error',
                error: errorMessage,
                // Add flag to show compression retry option for size errors
                warning: isSizeError && !f.isCompressed 
                  ? 'File size error detected. Try compressing the PDF and retrying.'
                  : undefined,
              }
            : f
        )
      );
    }
  };

  // Retry upload with compression
  const handleRetryWithCompression = async (fileItem: UploadFile) => {
    // First compress the file if not already compressed
    if (!fileItem.isCompressed && fileItem.file.type === 'application/pdf') {
      await handleCompressPDF(fileItem);
      
      // Wait a moment for state to update, then retry upload
      setTimeout(() => {
        setFiles((prev) => {
          const updatedFile = prev.find(f => f.id === fileItem.id);
          if (updatedFile && updatedFile.isCompressed) {
            // Clear error status and retry upload
            uploadFile(updatedFile);
            return prev;
          }
          return prev;
        });
      }, 500);
    } else {
      // Already compressed or not a PDF, just retry
      uploadFile(fileItem);
    }
  };

  // Upload all pending files
  const handleUploadAll = async () => {
    setIsUploading(true);
    const pendingFiles = files.filter((f) => f.status === 'pending');

    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    setIsUploading(false);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:730',message:'Before render - checking Header',data:{Header:Header,HeaderType:typeof Header,isFunction:typeof Header==='function',isUndefined:Header===undefined,hasType:!!Header?.type,hasRender:!!Header?.render,isMemo:!!Header?.compare},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return (
      <div className="min-h-screen bg-zinc-950 text-amber-50">
        {/* Main Header */}
        {/* #region agent log */}
        {(()=>{fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:733',message:'Rendering Header component',data:{HeaderDefined:Header!==undefined,HeaderType:typeof Header,canCall:typeof Header==='function'||(Header&&typeof Header.type==='function')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});return null;})()}
        {/* #endregion */}
        <Header />
      
      {/* Admin Navigation Bar */}
      <div className="border-b border-amber-900/20 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm">
              <Link 
                href="/"
                className="text-amber-100/60 hover:text-amber-100 transition-colors flex items-center gap-1.5"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <span className="text-amber-900">/</span>
              <Link 
                href="/dashboard"
                className="text-amber-100/60 hover:text-amber-100 transition-colors flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <span className="text-amber-900">/</span>
              <span className="text-amber-100 flex items-center gap-1.5 font-medium">
                <Upload className="w-4 h-4" />
                Admin Upload
              </span>
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-3">
              <Link
                href="/library"
                className="px-3 py-1.5 text-xs font-medium text-amber-100/60 hover:text-amber-100 transition-colors flex items-center gap-1.5"
              >
                <Library className="w-3.5 h-3.5" />
                View Library
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="border-b border-amber-900/20 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-amber-100">
            Upload Documents
          </h1>
          <p className="text-sm text-amber-100/60 mt-1">
            Add texts to The Convergence Library
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Drag-and-Drop Zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragActive
                ? 'border-amber-500 bg-amber-950/20'
                : 'border-amber-900/30 hover:border-amber-800/50 bg-zinc-900/30'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-amber-600" />
          <h3 className="text-lg font-medium text-amber-100 mb-2">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          <p className="text-sm text-amber-100/60 mb-4">
            or click to browse your computer
          </p>
          <p className="text-xs text-amber-100/40">
            Supported formats: PDF, PNG, JPG, HTML • Max size: 50MB per file (8MB recommended for OCR processing)
          </p>
          {fileRejections.length > 0 && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
              <p className="text-xs text-red-400 font-medium mb-1">Some files were rejected:</p>
              {fileRejections.map(({ file, errors }, idx) => (
                <p key={idx} className="text-xs text-red-300">
                  {file.name}: {errors.map(e => e.message).join(', ')}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Upload Queue */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-amber-100">
                Upload Queue ({files.length})
              </h2>
              <div className="flex items-center gap-3">
                {successCount > 0 && (
                  <span className="text-sm text-emerald-400">
                    {successCount} uploaded
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-sm text-red-400">{errorCount} failed</span>
                )}
                
                {/* Clear buttons */}
                {(successCount > 0 || errorCount > 0) && (
                  <>
                    {successCount > 0 && (
                      <button
                        onClick={clearSuccessful}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                        title="Clear successful uploads"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear Success
                      </button>
                    )}
                    {errorCount > 0 && (
                      <button
                        onClick={clearFailed}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                        title="Clear failed uploads"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear Failed
                      </button>
                    )}
                    {successCount > 0 && errorCount > 0 && (
                      <button
                        onClick={clearAll}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                        title="Clear all completed uploads"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    )}
                  </>
                )}
                
                {pendingCount > 0 && (
                  <button
                    onClick={handleUploadAll}
                    disabled={isUploading}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>Upload {pendingCount} file{pendingCount > 1 ? 's' : ''}</>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {files.map((uploadFile) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/3b2f6436-4ebc-4289-b024-a34094c46a49',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:915',message:'Rendering file item - checking components',data:{FileText:typeof FileText,Shrink:typeof Shrink,RotateCcw:typeof RotateCcw,Eye:typeof Eye,X:typeof X,Check:typeof Check,AlertCircle:typeof AlertCircle,Loader2:typeof Loader2,ChevronDown:typeof ChevronDown,ChevronUp:typeof ChevronUp,formatFileSize:typeof formatFileSize},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
                // #endregion
                return (
                <div
                  key={uploadFile.id}
                  className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-100 truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-amber-100/60 mt-0.5">
                          {uploadFile.isCompressed && uploadFile.originalSize
                            ? `${formatFileSize(uploadFile.originalSize)} → ${formatFileSize(uploadFile.file.size)} (${uploadFile.compressionRatio}% smaller)`
                            : formatFileSize(uploadFile.file.size)}
                        </p>
                        {uploadFile.isCompressed && (
                          <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                            <Shrink className="w-3 h-3" />
                            Compressed
                          </p>
                        )}
                        {uploadFile.error && (
                          <p className="text-xs text-red-400 mt-1">
                            {uploadFile.error}
                          </p>
                        )}
                        {uploadFile.warning && (
                          <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {uploadFile.warning}
                          </p>
                        )}
                        {uploadFile.status === 'success' && uploadFile.hasDuplicates && (
                          <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Possible duplicate detected - expand for details
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Compress PDF button for large PDFs */}
                      {uploadFile.status === 'pending' && 
                       uploadFile.file.type === 'application/pdf' && 
                       shouldCompressPDF(uploadFile.file) && 
                       !uploadFile.isCompressed && (
                        <button
                          onClick={() => handleCompressPDF(uploadFile)}
                          className="text-amber-100/60 hover:text-amber-100 transition-colors"
                          title="Compress PDF to reduce file size"
                        >
                          <Shrink className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Restore Original button for compressed files */}
                      {uploadFile.status === 'pending' && uploadFile.isCompressed && uploadFile.originalFile && (
                        <button
                          onClick={() => handleRestoreOriginal(uploadFile)}
                          className="text-amber-100/60 hover:text-amber-100 transition-colors"
                          title="Restore original file"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Preview button for PDFs */}
                      {uploadFile.previewUrl && uploadFile.status === 'pending' && (
                        <button
                          onClick={() => setPreviewFile(uploadFile)}
                          className="text-amber-100/60 hover:text-amber-100 transition-colors"
                          title="Preview PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Status Icon */}
                      {uploadFile.status === 'pending' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="text-amber-100/40 hover:text-amber-100 transition-colors"
                          title="Remove from queue"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {uploadFile.status === 'compressing' && (
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin" title="Compressing PDF..." />
                      )}
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                      )}
                      {uploadFile.status === 'success' && (
                        <>
                          {uploadFile.hasDuplicates ? (
                            <div title="Possible duplicate detected">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            </div>
                          ) : (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="text-amber-100/40 hover:text-amber-100 transition-colors"
                            title="Remove from list"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {uploadFile.status === 'error' && (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          {/* Retry with compression button for size errors */}
                          {uploadFile.warning && 
                           uploadFile.file.type === 'application/pdf' && 
                           !uploadFile.isCompressed && (
                            <button
                              onClick={() => handleRetryWithCompression(uploadFile)}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                              title="Compress PDF and retry upload"
                            >
                              <Shrink className="w-3 h-3" />
                              Compress & Retry
                            </button>
                          )}
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="text-amber-100/40 hover:text-amber-100 transition-colors"
                            title="Remove from list"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Compression Status */}
                  {uploadFile.status === 'compressing' && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                        <p className="text-xs text-amber-100/60">
                          Compressing PDF... (this may take a moment)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-600 transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-amber-100/60 mt-1">
                        {uploadFile.status === 'uploading' ? 'Uploading...' : 'Processing with OCR...'}
                      </p>
                    </div>
                  )}

                  {/* Expandable Details Section for Success */}
                  {uploadFile.status === 'success' && uploadFile.metadata && (
                    <div className="mt-3 border-t border-amber-900/20 pt-3">
                      <button
                        onClick={() => toggleExpanded(uploadFile.id)}
                        className="flex items-center gap-2 text-sm text-amber-100 hover:text-amber-50 transition-colors"
                      >
                        {expandedFiles.has(uploadFile.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {expandedFiles.has(uploadFile.id) ? 'Hide Details' : 'View Details'}
                        </span>
                      </button>

                      {expandedFiles.has(uploadFile.id) && (
                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {/* Duplicate Warning */}
                          {uploadFile.hasDuplicates && uploadFile.similarDocuments && uploadFile.similarDocuments.length > 0 && (
                            <div className="bg-amber-950/50 border-2 border-amber-600/50 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-amber-200 mb-2">
                                    ⚠️ Possible Duplicate Detected
                                  </h4>
                                  <p className="text-xs text-amber-100/70 mb-3">
                                    We found {uploadFile.similarDocuments.length} similar document{uploadFile.similarDocuments.length > 1 ? 's' : ''} that may be duplicates:
                                  </p>
                                  <div className="space-y-2">
                                    {uploadFile.similarDocuments.map((similar, idx) => (
                                      <div
                                        key={similar.id}
                                        className="bg-zinc-900/50 border border-amber-900/30 rounded-md p-3"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <Link
                                              href={`/library/${similar.id}`}
                                              target="_blank"
                                              className="text-sm font-medium text-amber-200 hover:text-amber-100 transition-colors block truncate"
                                            >
                                              {similar.title}
                                            </Link>
                                            {similar.author && (
                                              <p className="text-xs text-amber-100/60 mt-0.5">
                                                by {similar.author}
                                                {similar.year && ` (${similar.year})`}
                                              </p>
                                            )}
                                            <p className="text-xs text-amber-100/50 mt-1">
                                              {similar.matchReason} • {Math.round(similar.similarityScore * 100)}% match
                                            </p>
                                          </div>
                                          <Link
                                            href={`/library/${similar.id}`}
                                            target="_blank"
                                            className="text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
                                            title="View document"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Link>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-xs text-amber-100/60 mt-3 italic">
                                    The document was uploaded successfully. If this is a duplicate, you may want to delete it.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Short Summary */}
                          {uploadFile.shortSummary && (
                            <div className="bg-amber-950/30 border border-amber-900/30 rounded-md p-4">
                              <h4 className="text-sm font-semibold text-amber-100 mb-2">Summary</h4>
                              <p className="text-sm text-amber-100/80 leading-relaxed">
                                {uploadFile.shortSummary}
                              </p>
                            </div>
                          )}

                          {/* Metadata Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-zinc-900/50 rounded-md p-3">
                              <p className="text-xs text-amber-100/60 mb-1">Title</p>
                              <p className="text-sm text-amber-100 font-medium">
                                {uploadFile.metadata.title}
                              </p>
                            </div>
                            {uploadFile.metadata.author && (
                              <div className="bg-zinc-900/50 rounded-md p-3">
                                <p className="text-xs text-amber-100/60 mb-1">Author</p>
                                <p className="text-sm text-amber-100 font-medium">
                                  {uploadFile.metadata.author}
                                </p>
                              </div>
                            )}
                            <div className="bg-zinc-900/50 rounded-md p-3">
                              <p className="text-xs text-amber-100/60 mb-1">Type</p>
                              <p className="text-sm text-amber-100 font-medium">
                                {uploadFile.metadata.type}
                              </p>
                            </div>
                            {uploadFile.metadata.year && (
                              <div className="bg-zinc-900/50 rounded-md p-3">
                                <p className="text-xs text-amber-100/60 mb-1">Year</p>
                                <p className="text-sm text-amber-100 font-medium">
                                  {uploadFile.metadata.year}
                                </p>
                              </div>
                            )}
                            {uploadFile.metadata.domain && (
                              <div className="bg-zinc-900/50 rounded-md p-3">
                                <p className="text-xs text-amber-100/60 mb-1">Domain</p>
                                <p className="text-sm text-amber-100 font-medium">
                                  {uploadFile.metadata.domain}
                                </p>
                              </div>
                            )}
                            <div className="bg-zinc-900/50 rounded-md p-3">
                              <p className="text-xs text-amber-100/60 mb-1">Confidence</p>
                              <p className="text-sm text-amber-100 font-medium capitalize">
                                {uploadFile.metadata.confidence}
                              </p>
                            </div>
                            {uploadFile.pageCount && (
                              <div className="bg-zinc-900/50 rounded-md p-3">
                                <p className="text-xs text-amber-100/60 mb-1">Pages</p>
                                <p className="text-sm text-amber-100 font-medium">
                                  {uploadFile.pageCount}
                                </p>
                              </div>
                            )}
                            {uploadFile.lineCount && (
                              <div className="bg-zinc-900/50 rounded-md p-3">
                                <p className="text-xs text-amber-100/60 mb-1">Lines</p>
                                <p className="text-sm text-amber-100 font-medium">
                                  {uploadFile.lineCount}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Lenses */}
                          {uploadFile.lenses && uploadFile.lenses.length > 0 && (
                            <div>
                              <p className="text-xs text-amber-100/60 mb-2">Convergence Machine Lenses</p>
                              <div className="flex flex-wrap gap-2">
                                {uploadFile.lenses.map((lens, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1.5 bg-amber-600/20 border border-amber-600/40 rounded-md text-xs text-amber-100 font-medium"
                                  >
                                    {lens.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {uploadFile.metadata.tags && uploadFile.metadata.tags.length > 0 && (
                            <div>
                              <p className="text-xs text-amber-100/60 mb-2">Tags</p>
                              <div className="flex flex-wrap gap-2">
                                {uploadFile.metadata.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-amber-900/20 border border-amber-900/30 rounded text-xs text-amber-100"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Raw AI Output */}
                          {uploadFile.rawAiOutput && (
                            <div>
                              <h4 className="text-sm font-semibold text-amber-100 mb-2">
                                Raw AI Output
                              </h4>
                              <pre className="bg-zinc-950 border border-amber-900/20 rounded-md p-3 text-xs text-amber-100/70 overflow-x-auto max-h-64 overflow-y-auto">
                                {JSON.stringify(JSON.parse(uploadFile.rawAiOutput), null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-sm text-amber-100/40">
              No files uploaded yet. Drag and drop files above to get started.
            </p>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewFile && previewFile.previewUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="bg-zinc-900 border border-amber-900/30 rounded-lg max-w-6xl w-full h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-amber-900/20">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-amber-100 truncate">
                  {previewFile.file.name}
                </h3>
                <p className="text-sm text-amber-100/60">
                  {formatFileSize(previewFile.file.size)}
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="ml-4 text-amber-100/60 hover:text-amber-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* PDF Preview */}
            <div className="flex-1 overflow-auto p-4">
              <iframe
                src={previewFile.previewUrl}
                className="w-full h-full border-0 rounded"
                title="PDF Preview"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-amber-900/20 flex justify-end gap-3">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-md text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewFile(null);
                  // Upload will happen when user clicks the upload button in the queue
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Continue to Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

