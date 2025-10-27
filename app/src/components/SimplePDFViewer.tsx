'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

interface SimplePDFViewerProps {
  fileUrl: string;
  fileName?: string;
  onDocumentLoad?: (numPages: number) => void;
  onPageChange?: (currentPage: number) => void;
}

export default function SimplePDFViewer({
  fileUrl,
  fileName,
  onDocumentLoad,
  onPageChange,
}: SimplePDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF.js dynamically
  useEffect(() => {
    let mounted = true;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // Dynamically import pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.js';

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;

        if (!mounted) return;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        
        if (onDocumentLoad) {
          onDocumentLoad(pdf.numPages);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (mounted) {
          setError('Failed to load PDF document');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      mounted = false;
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [fileUrl, onDocumentLoad]);

  // Render current page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      setRendering(true);

      // Cancel previous render task if any
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      const viewport = page.getViewport({ scale });

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;

      setRendering(false);
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
      setRendering(false);
    }
  }, [pdfDoc, scale]);

  // Re-render when page or scale changes
  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, renderPage]);

  // Notify parent of page change
  useEffect(() => {
    if (onPageChange && currentPage > 0) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
          <p className="text-amber-100/60">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-amber-900/20 rounded-lg">
        <div className="text-center px-4">
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
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/20 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="p-2 text-amber-100 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm text-amber-100 min-w-[100px] text-center">
            {currentPage} / {numPages}
          </span>
          
          <button
            onClick={goToNextPage}
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
            disabled={scale >= 3.0}
            className="p-2 text-amber-100 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto bg-zinc-950/50 p-4">
        <div className="flex items-start justify-center min-h-full">
          <div className="relative">
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 z-10">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="shadow-2xl shadow-black/50 max-w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

