'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, Download, RotateCw, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  title: string;
  exif?: Record<string, any>;
  description?: string;
  onDownload?: () => void;
}

export default function ImageViewer({
  imageUrl,
  title,
  exif,
  description,
  onDownload,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = (direction: 'cw' | 'ccw') => {
    setRotation((prev) => (direction === 'cw' ? prev + 90 : prev - 90));
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden"
    >
      {/* Image Container */}
      <div
        className="flex-1 relative overflow-hidden bg-zinc-950"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={title}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200"
          style={{
            transform: `translate(-50%, -50%) scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
          draggable={false}
        />
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-amber-900/20 bg-zinc-900/80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-amber-100">{title}</h3>
          <div className="flex gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-amber-400" />
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Fullscreen"
            >
              <Maximize className="w-5 h-5 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5 text-amber-400" />
            </button>
            <span className="text-sm text-amber-100/60 w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 5}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5 text-amber-400" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRotate('ccw')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Rotate counter-clockwise"
            >
              <RotateCcw className="w-5 h-5 text-amber-400" />
            </button>
            <button
              onClick={() => handleRotate('cw')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Rotate clockwise"
            >
              <RotateCw className="w-5 h-5 text-amber-400" />
            </button>
          </div>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 rounded-lg text-sm text-amber-400 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Description */}
        {description && (
          <div className="mt-4 pt-4 border-t border-amber-900/20">
            <p className="text-sm text-amber-100/80">{description}</p>
          </div>
        )}

        {/* EXIF Data */}
        {exif && Object.keys(exif).length > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-900/20">
            <h4 className="text-xs font-semibold text-amber-100/60 mb-2">EXIF Data</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-amber-100/60">
              {exif.camera && (
                <div>
                  <span className="font-medium">Camera:</span> {exif.camera}
                </div>
              )}
              {exif.iso && (
                <div>
                  <span className="font-medium">ISO:</span> {exif.iso}
                </div>
              )}
              {exif.aperture && (
                <div>
                  <span className="font-medium">Aperture:</span> {exif.aperture}
                </div>
              )}
              {exif.shutterSpeed && (
                <div>
                  <span className="font-medium">Shutter:</span> {exif.shutterSpeed}
                </div>
              )}
              {exif.focalLength && (
                <div>
                  <span className="font-medium">Focal Length:</span> {exif.focalLength}
                </div>
              )}
              {exif.dateTaken && (
                <div>
                  <span className="font-medium">Date:</span> {exif.dateTaken}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

