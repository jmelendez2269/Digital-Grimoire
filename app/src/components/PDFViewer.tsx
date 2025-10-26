'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
}

export default function PDFViewer({ fileUrl, fileName }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState<boolean>(false);

  // Initialize PDF.js worker
  useEffect(() => {
    try {
      // Configure PDF.js worker with full HTTPS URL for v4.x
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      }
      setWorkerReady(true);
    } catch (err) {
      console.error('Error configuring PDF.js worker:', err);
      setError('Failed to initialize PDF viewer');
      setLoading(false);
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF document. Please try again.');
    setLoading(false);
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-amber-900/20">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || loading}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="px-3 py-1 bg-zinc-800/50 rounded-lg text-sm text-amber-100">
            <span className="font-medium">{pageNumber}</span>
            <span className="text-amber-100/60"> / {numPages || '...'}</span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || loading}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5 || loading}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <div className="px-3 py-1 bg-zinc-800/50 rounded-lg text-sm text-amber-100 min-w-[4rem] text-center">
            {Math.round(scale * 100)}%
          </div>

          <button
            onClick={zoomIn}
            disabled={scale >= 3.0 || loading}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Download</span>
        </button>
      </div>

      {/* PDF Display */}
      <div className="flex-1 overflow-auto bg-zinc-800/30 p-4">
        <div className="flex justify-center">
          {(loading || !workerReady) && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
              <p className="text-amber-100/60">
                {!workerReady ? 'Initializing PDF viewer...' : 'Loading document...'}
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="max-w-md text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-lg font-medium text-amber-100 mb-2">Error Loading PDF</h3>
                <p className="text-sm text-amber-100/60 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!error && workerReady && (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              className="shadow-2xl"
              options={{
                cMapUrl: 'https://unpkg.com/pdfjs-dist@4.4.168/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.4.168/standard_fonts/',
              }}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="border border-amber-900/20 shadow-xl"
              />
            </Document>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="px-4 py-2 bg-zinc-900/60 border-t border-amber-900/20 text-xs text-amber-100/40 text-center">
        Tip: Use arrow keys to navigate pages, +/- to zoom
      </div>
    </div>
  );
}

