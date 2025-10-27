'use client';

import { useState } from 'react';
import { Worker, Viewer, DocumentLoadEvent, PageChangeEvent } from '@react-pdf-viewer/core';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import '@react-pdf-viewer/core/lib/styles/index.css';

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  onDocumentLoad?: (numPages: number) => void;
  onPageChange?: (currentPage: number) => void;
}

export default function PDFViewer({ fileUrl, fileName, onDocumentLoad, onPageChange }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);

  const handleDocumentLoad = (e: DocumentLoadEvent) => {
    setNumPages(e.doc.numPages);
    if (onDocumentLoad) {
      onDocumentLoad(e.doc.numPages);
    }
  };

  const handlePageChange = (e: PageChangeEvent) => {
    setCurrentPage(e.currentPage + 1);
    if (onPageChange) {
      // e.currentPage is 0-indexed, convert to 1-indexed
      onPageChange(e.currentPage + 1);
    }
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const renderError = (e: any) => {
    console.error('Error loading PDF:', e);
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 h-full">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-amber-100 mb-2">Error Loading PDF</h3>
          <p className="text-sm text-amber-100/60 mb-4">Failed to load PDF document. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden pdf-viewer-container">
      {/* Custom Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/20 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            disabled={currentPage <= 1}
            className="p-2 text-amber-100 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm text-amber-100 min-w-[100px] text-center">
            {currentPage} / {numPages || '?'}
          </span>
          
          <button
            onClick={goToNext}
            disabled={currentPage >= numPages}
            className="p-2 text-amber-100 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 text-amber-100 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          
          <span className="text-sm text-amber-100 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="p-2 text-amber-100 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto">
        <Worker workerUrl="/pdf-worker/pdf.worker.min.js">
          <Viewer
            fileUrl={fileUrl}
            renderError={renderError}
            onDocumentLoad={handleDocumentLoad}
            onPageChange={handlePageChange}
            defaultScale={scale}
            initialPage={currentPage - 1}
          />
        </Worker>
      </div>

      {/* Custom styles for dark theme integration */}
      <style jsx global>{`
        .pdf-viewer-container .rpv-core__viewer {
          background-color: rgba(24, 24, 27, 0.5);
        }
        
        .pdf-viewer-container .rpv-core__inner-pages {
          background-color: transparent;
        }
        
        .pdf-viewer-container .rpv-core__page-layer {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          margin-bottom: 1rem;
        }

        .pdf-viewer-container .rpv-core__text-layer {
          color: #f0efeb;
        }

        .pdf-viewer-container .rpv-core__canvas-layer {
          filter: brightness(0.95);
        }
      `}</style>
    </div>
  );
}

