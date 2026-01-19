"use client";

import { useEffect } from "react";

interface ConvergenceConcept {
  id: string;
  slug: string;
  name: string;
  tradition: string;
  era?: string;
  short_definition?: string;
  primary_sources?: string[];
  tags?: string[];
}

interface ConvergenceRelationship {
  id: string;
  source_id: string;
  target_id: string;
  similarity: number;
  source_citation?: string;
  notes?: string;
}

interface ConceptDetailModalProps {
  concept: ConvergenceConcept | null;
  relationships: ConvergenceRelationship[];
  concepts: ConvergenceConcept[];
  onClose: () => void;
}

export default function ConceptDetailModal({
  concept,
  relationships,
  concepts,
  onClose,
}: ConceptDetailModalProps) {
  useEffect(() => {
    if (concept) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [concept]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (concept) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [concept, onClose]);

  if (!concept) return null;

  // Find related concepts
  const relatedConcepts = relationships
    .filter(
      (rel) => rel.source_id === concept.id || rel.target_id === concept.id
    )
    .map((rel) => {
      const relatedId = rel.source_id === concept.id ? rel.target_id : rel.source_id;
      const relatedConcept = concepts.find((c) => c.id === relatedId);
      return relatedConcept
        ? {
            concept: relatedConcept,
            relationship: rel,
            similarity: rel.similarity,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.similarity - a.similarity);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-amber-900/30 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-amber-900/30 px-6 py-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded text-xs font-medium bg-amber-900/20 border border-amber-700/30 text-amber-100/90">
                {concept.tradition}
              </span>
              {concept.era && (
                <span className="px-3 py-1 rounded text-xs bg-zinc-800 text-amber-100/60">
                  {concept.era}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-amber-100">{concept.name}</h2>
            {concept.slug && (
              <p className="text-sm text-amber-100/50 mt-1">/{concept.slug}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-amber-100/60 hover:text-amber-100 transition-colors p-2 hover:bg-zinc-800 rounded"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Definition */}
          {concept.short_definition && (
            <div>
              <h3 className="text-sm font-semibold text-amber-100/80 mb-2 uppercase tracking-wide">
                Definition
              </h3>
              <p className="text-amber-100/80 leading-relaxed">{concept.short_definition}</p>
            </div>
          )}

          {/* Tags */}
          {concept.tags && concept.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-100/80 mb-2 uppercase tracking-wide">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {concept.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded text-xs bg-zinc-800 text-amber-100/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Primary Sources */}
          {concept.primary_sources && concept.primary_sources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-100/80 mb-2 uppercase tracking-wide">
                Primary Sources
              </h3>
              <ul className="space-y-1">
                {concept.primary_sources.map((source, idx) => (
                  <li key={idx} className="text-sm text-amber-100/70">
                    • {source}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Concepts */}
          <div>
            <h3 className="text-sm font-semibold text-amber-100/80 mb-3 uppercase tracking-wide">
              Related Concepts ({relatedConcepts.length})
            </h3>
            {relatedConcepts.length > 0 ? (
              <div className="space-y-3">
                {relatedConcepts.map(({ concept: related, similarity, relationship }) => (
                  <div
                    key={related.id}
                    className="bg-zinc-800/50 border border-amber-900/20 rounded-lg p-4 hover:bg-zinc-800/70 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-amber-100">{related.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-amber-100/70">
                            {related.tradition}
                          </span>
                          {related.era && (
                            <span className="text-xs text-amber-100/50">{related.era}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-amber-400">
                          {(similarity * 100).toFixed(0)}%
                        </div>
                        <div className="w-20 bg-zinc-700 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                            style={{ width: `${similarity * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {related.short_definition && (
                      <p className="text-sm text-amber-100/60 mt-2 line-clamp-2">
                        {related.short_definition}
                      </p>
                    )}
                    {relationship.source_citation && (
                      <p className="text-xs text-amber-100/40 mt-2">
                        Source: {relationship.source_citation}
                      </p>
                    )}
                    {relationship.notes && (
                      <p className="text-xs text-amber-100/50 mt-2 italic">
                        {relationship.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-100/50">No related concepts found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
