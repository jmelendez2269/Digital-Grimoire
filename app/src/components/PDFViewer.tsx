'use client';

import { useState } from 'react';
import { Worker, Viewer, DocumentLoadEvent, PageChangeEvent } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  onDocumentLoad?: (numPages: number) => void;
  onPageChange?: (currentPage: number) => void;
}

export default function PDFViewer({ fileUrl, fileName, onDocumentLoad, onPageChange }: PDFViewerProps) {
  // Create plugin instance with lazy initialization
  const [defaultLayoutPluginInstance] = useState(() => defaultLayoutPlugin());

  const handleDocumentLoad = (e: DocumentLoadEvent) => {
    if (onDocumentLoad) {
      onDocumentLoad(e.doc.numPages);
    }
  };

  const handlePageChange = (e: PageChangeEvent) => {
    if (onPageChange) {
      // e.currentPage is 0-indexed, convert to 1-indexed
      onPageChange(e.currentPage + 1);
    }
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
      <div className="flex-1 overflow-hidden">
        <Worker workerUrl="/pdf-worker/pdf.worker.min.js">
          <Viewer
            fileUrl={fileUrl}
            plugins={[defaultLayoutPluginInstance]}
            renderError={renderError}
            onDocumentLoad={handleDocumentLoad}
            onPageChange={handlePageChange}
            theme={{
              theme: 'dark',
            }}
          />
        </Worker>
      </div>

      {/* Custom styles for dark theme integration */}
      <style jsx global>{`
        .pdf-viewer-container .rpv-core__viewer {
          background-color: rgba(24, 24, 27, 0.3);
        }
        
        .pdf-viewer-container .rpv-core__inner-pages {
          background-color: transparent;
        }
        
        .pdf-viewer-container .rpv-core__page-layer {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .pdf-viewer-container .rpv-core__text-layer {
          color: #f0efeb;
        }

        .pdf-viewer-container button {
          color: #f0efeb;
          transition: all 0.2s;
        }

        .pdf-viewer-container button:hover {
          background-color: rgba(180, 143, 74, 0.2);
          color: #fbbf24;
        }

        .pdf-viewer-container input {
          background-color: rgba(39, 39, 42, 0.5);
          color: #f0efeb;
          border: 1px solid rgba(180, 143, 74, 0.2);
          border-radius: 0.375rem;
        }

        .pdf-viewer-container .rpv-core__inner-container {
          background-color: rgba(24, 24, 27, 0.5);
        }

        .pdf-viewer-container .rpv-default-layout__sidebar {
          background-color: rgba(24, 24, 27, 0.95);
          border-right: 1px solid rgba(180, 143, 74, 0.2);
        }

        .pdf-viewer-container .rpv-default-layout__sidebar-tab {
          color: rgba(240, 239, 235, 0.6);
        }

        .pdf-viewer-container .rpv-default-layout__sidebar-tab--selected {
          color: #fbbf24;
          background-color: rgba(180, 143, 74, 0.1);
        }
      `}</style>
    </div>
  );
}

