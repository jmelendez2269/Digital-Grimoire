"use client";

import Link from "next/link";
import { X, Lock } from "lucide-react";
import { useEffect } from "react";
import { CorrespondenceEntity, GraphType, ParallaxConcept } from "@/lib/types";

interface GraphNodeGateProps {
  entity: ParallaxConcept | CorrespondenceEntity;
  graphType: GraphType;
  onClose: () => void;
}

export default function GraphNodeGate({ entity, graphType, onClose }: GraphNodeGateProps) {
  const isCorrespondence = graphType === "correspondences";
  const correspondence = isCorrespondence ? (entity as CorrespondenceEntity) : null;
  const parallax = !isCorrespondence ? (entity as ParallaxConcept) : null;

  const typeLabel = isCorrespondence
    ? correspondence?.type?.label || correspondence?.category
    : parallax?.tradition_ref?.label || parallax?.tradition;

  const preview = isCorrespondence
    ? correspondence?.description
    : parallax?.short_definition;

  const previewText = preview
    ? preview.length > 120
      ? preview.slice(0, 120).trimEnd() + "…"
      : preview
    : null;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl border border-amber-900/30 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-amber-900/30 px-5 py-4">
          <div>
            {typeLabel && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500/60 mb-1">
                {typeLabel}
              </p>
            )}
            <h2 className="text-lg font-bold text-amber-100">{entity.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1.5 text-amber-100/50 hover:text-amber-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {previewText && (
            <p className="text-sm text-amber-100/70 leading-relaxed">{previewText}</p>
          )}

          <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 p-4 flex gap-3 items-start">
            <Lock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-amber-100/80 font-medium mb-1">
                Sign in to explore the full dossier
              </p>
              <p className="text-xs text-amber-100/50">
                Connections, sources, cross-tradition relationships, and more — free with an account.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex-1 text-center rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex-1 text-center rounded-lg border border-amber-700/40 hover:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-amber-100/80 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
