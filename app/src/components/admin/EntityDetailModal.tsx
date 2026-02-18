"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, Edit } from "lucide-react";

type GraphType = "correspondences" | "parallax";

interface KnowledgeSource {
  id: string;
  title: string;
  author?: string | null;
  year?: string | null;
  citation?: string | null;
  url?: string | null;
}

interface KnowledgeClaim {
  id: string;
  field_key: string;
  field_value?: string | null;
  source?: KnowledgeSource | null;
}

interface EntityDetailModalProps {
  entity: any;
  graphType: GraphType;
  onClose: () => void;
  readOnly?: boolean;
}

export default function EntityDetailModal({ entity, graphType, onClose, readOnly }: EntityDetailModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"consensus" | "sources">("consensus");
  const [claims, setClaims] = useState<KnowledgeClaim[]>([]);
  const [generatingConsensus, setGeneratingConsensus] = useState(false);
  const [generatedConsensus, setGeneratedConsensus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClaims = async () => {
      if (!entity?.id) return;
      const res = await fetch(
        `/api/knowledge/claims?entityType=${graphType === "correspondences" ? "correspondence" : "parallax"}&entityId=${entity.id}`
      );
      const data = await res.json();
      setClaims(data.items || []);
    };
    loadClaims();
  }, [entity?.id, graphType]);

  const claimsBySource = useMemo(() => {
    const map = new Map<string, { source: KnowledgeSource | null; claims: KnowledgeClaim[] }>();
    for (const claim of claims) {
      const key = claim.source?.id || "unknown";
      if (!map.has(key)) {
        map.set(key, { source: claim.source || null, claims: [] });
      }
      map.get(key)?.claims.push(claim);
    }
    return Array.from(map.values());
  }, [claims]);

  const handleGenerateConsensus = async () => {
    if (!entity?.id || !entity?.name) {
      setError("Entity information is required");
      return;
    }
    if (claims.length === 0) {
      setError("No claims found. Add some claims first.");
      return;
    }
    setGeneratingConsensus(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entity.id,
          entityName: entity.name,
          entityCategory: entity.category || entity.type?.slug,
          tradition: entity.tradition || entity.tradition_ref?.label,
          entityType: graphType,
          existingDescription: graphType === "correspondences"
            ? entity.description
            : entity.short_definition,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate consensus");
      }

      const data = await res.json();
      const consensus = data.consensus || "";

      if (!consensus) {
        setError("No consensus was generated. Try again.");
        return;
      }

      setGeneratedConsensus(consensus);
    } catch (err: any) {
      setError(err.message || "Failed to generate consensus");
    } finally {
      setGeneratingConsensus(false);
    }
  };

  const handleEdit = () => {
    if (!entity?.id) return;
    onClose();
    // Pass generated consensus if it exists
    const params = new URLSearchParams({
      editId: entity.id,
      graphType: graphType === "correspondences" ? "correspondences" : "parallax",
    });
    if (generatedConsensus) {
      // Encode consensus text to pass via URL (or use sessionStorage for longer text)
      if (generatedConsensus.length > 2000) {
        // Use sessionStorage for very long text
        sessionStorage.setItem(`consensus_${entity.id}`, generatedConsensus);
        params.append("useStoredConsensus", "true");
      } else {
        params.append("consensusText", encodeURIComponent(generatedConsensus));
      }
    }
    router.push(`/admin/knowledge-graph?${params.toString()}`);
  };

  const handleEditWithConsensus = () => {
    handleEdit();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-amber-900/30 rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-amber-900/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-amber-100">{entity?.name}</h2>
            <p className="text-sm text-amber-100/60">
              {graphType === "correspondences"
                ? entity?.type?.label || entity?.category
                : entity?.tradition_ref?.label || entity?.tradition}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                title="Edit entity"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-amber-100/60 hover:text-amber-100 transition-colors p-2 hover:bg-zinc-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("consensus")}
              className={`px-3 py-2 rounded text-sm font-medium ${activeTab === "consensus" ? "bg-amber-600 text-white" : "bg-zinc-800 text-amber-100/70"
                }`}
            >
              Consensus
            </button>
            <button
              onClick={() => setActiveTab("sources")}
              className={`px-3 py-2 rounded text-sm font-medium ${activeTab === "sources" ? "bg-amber-600 text-white" : "bg-zinc-800 text-amber-100/70"
                }`}
            >
              Sources
            </button>
          </div>

          {activeTab === "consensus" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-amber-100/80">Consensus Description</h3>
                {claims.length > 0 && !readOnly && (
                  <button
                    onClick={handleGenerateConsensus}
                    disabled={generatingConsensus}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                    title="Generate consensus from all claims"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {generatingConsensus ? "Generating..." : "Generate Consensus"}
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {generatedConsensus && (
                <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-purple-200">Generated Consensus</span>
                    {!readOnly && (
                      <button
                        onClick={handleEditWithConsensus}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs flex items-center gap-1.5"
                        title="Edit entity to save this consensus"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit to Save
                      </button>
                    )}
                  </div>
                  <div className="text-amber-100/90 whitespace-pre-wrap text-sm leading-relaxed">
                    {generatedConsensus}
                  </div>
                </div>
              )}

              {graphType === "correspondences" ? (
                <>
                  {entity?.description && (
                    <div className="text-amber-100/80 whitespace-pre-wrap">{entity.description}</div>
                  )}
                  {entity?.aliases?.length ? (
                    <div className="text-sm text-amber-100/60">
                      Aliases: {entity.aliases.join(", ")}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {entity?.short_definition && (
                    <div className="text-amber-100/80 whitespace-pre-wrap">{entity.short_definition}</div>
                  )}
                  {entity?.tags?.length ? (
                    <div className="text-sm text-amber-100/60">
                      Tags: {entity.tags.join(", ")}
                    </div>
                  ) : null}
                </>
              )}
              {!entity?.description && !entity?.short_definition && !generatedConsensus && (
                <div className="text-sm text-amber-100/50">No consensus summary yet.</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {claimsBySource.length === 0 ? (
                <div className="text-sm text-amber-100/50">No claims yet.</div>
              ) : (
                claimsBySource.map((group) => (
                  <div key={group.source?.id || "unknown"} className="bg-zinc-900/40 border border-amber-900/20 rounded-lg p-3">
                    <div className="text-sm font-medium text-amber-100/80 mb-2">
                      {group.source?.title || "Unknown source"}
                      {group.source?.author ? ` — ${group.source.author}` : ""}
                    </div>
                    <div className="space-y-2">
                      {group.claims.map((claim) => (
                        <div key={claim.id}>
                          <div className="text-xs uppercase tracking-wide text-amber-100/50">
                            {claim.field_key}
                          </div>
                          <div className="text-sm text-amber-100/80 whitespace-pre-wrap">
                            {claim.field_value || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
