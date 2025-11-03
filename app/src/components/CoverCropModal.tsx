"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface CoverCropModalProps {
  imageSrc: string;
  onComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function CoverCropModal({
  imageSrc,
  onComplete,
  onCancel,
}: CoverCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createCroppedImage = async () => {
    if (!croppedAreaPixels) return;

    setProcessing(true);
    try {
      const image = new Image();
      // Handle CORS for external images
      image.crossOrigin = "anonymous";
      image.src = imageSrc;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      // Set canvas size to the cropped area
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Draw the cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      // Convert to blob with high quality for book covers
      canvas.toBlob((blob) => {
        if (blob) {
          onComplete(blob);
        }
      }, "image/jpeg", 0.95); // Higher quality for covers
    } catch (error) {
      console.error("Error cropping image:", error);
      alert("Failed to crop image. This may be due to CORS restrictions if the image is from an external source.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-amber-900/30 bg-zinc-900 p-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-amber-100">
            Crop Book Cover
          </h2>
          <p className="mt-1 text-sm text-amber-100/60">
            Drag to reposition • Scroll or pinch to zoom • Recommended: 2:3 aspect ratio
          </p>
        </div>

        {/* Cropper - taller for book covers */}
        <div className="relative h-[500px] w-full rounded-lg bg-black overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={2 / 3} // Book cover aspect ratio
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom Slider */}
        <div className="mt-6">
          <label className="mb-2 block text-sm text-amber-100/80">
            Zoom: {Math.round(zoom * 100)}%
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700"
            style={{
              accentColor: "#f59e0b",
            }}
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-amber-100 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={createCroppedImage}
            disabled={processing || !croppedAreaPixels}
            className="flex-1 rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              "Save Cropped Cover"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

