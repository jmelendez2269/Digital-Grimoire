'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
}

export default function AdminUploadPage() {
  const supabase = createClient();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF and image files (PNG, JPG) are allowed';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 50MB';
    }

    return null;
  };

  // Drag-and-drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => {
      const error = validateFile(file);
      return {
        id: Math.random().toString(36).substring(7),
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      };
    });
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    multiple: true,
    maxSize: 52428800, // 50MB
  });

  // Remove file from queue
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
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
        const error = await presignedResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
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

      // Trigger document processing (OCR + metadata extraction)
      const processResponse = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key,
          userId: currentUser?.id 
        }),
      });

      if (!processResponse.ok) {
        const error = await processResponse.json();
        throw new Error(error.error || 'Failed to process document');
      }

      // Update progress
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 90 } : f))
      );

      // Success!
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
        )
      );
    } catch (error) {
      console.error('Upload error:', error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );
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

  return (
    <div className="min-h-screen bg-zinc-950 text-amber-50">
      {/* Header */}
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
            Supported formats: PDF, PNG, JPG • Max size: 50MB per file
          </p>
        </div>

        {/* Upload Queue */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-amber-100">
                Upload Queue ({files.length})
              </h2>
              <div className="flex items-center gap-4">
                {successCount > 0 && (
                  <span className="text-sm text-emerald-400">
                    {successCount} uploaded
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-sm text-red-400">{errorCount} failed</span>
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
              {files.map((uploadFile) => (
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
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                        {uploadFile.error && (
                          <p className="text-xs text-red-400 mt-1">
                            {uploadFile.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Icon */}
                      {uploadFile.status === 'pending' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="text-amber-100/40 hover:text-amber-100 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                      )}
                      {uploadFile.status === 'success' && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>

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
                </div>
              ))}
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
    </div>
  );
}

