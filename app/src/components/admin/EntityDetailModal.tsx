"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Sparkles, X } from "lucide-react";
import CorrespondenceProfileDossier from "@/components/graph/CorrespondenceProfileDossier";
import type { CorrespondenceProfile } from "@/lib/graph/correspondence-profile";
import { CorrespondenceEntity, GraphType, ParallaxConcept } from "@/lib/types";

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
  entity: ParallaxConcept | CorrespondenceEntity;
  graphType: GraphType;
  onClose: () => void;
  readOnly?: boolean;
}

function toCorrespondenceEntity(
  connectionEntity: CorrespondenceProfile["connections"]["byRelationship"][number]["items"][number]["entity"],
): CorrespondenceEntity {
  return {
    id: connectionEntity.id,
    slug: connectionEntity.slug,
    name: connectionEntity.name,
    category: connectionEntity.category || null,
    type: connectionEntity.typeLabel
      ? {
          id: "",
          slug: connectionEntity.typeLabel.toLowerCase().replace(/\s+/g, "-"),
          label: connectionEntity.typeLabel,
          color: connectionEntity.color || undefined,
          icon: connectionEntity.icon || undefined,
        }
      : undefined,
  };
}

export default function EntityDetailModal({
  entity,
  graphType,
  onClose,
  readOnly,
}: EntityDetailModalProps) {
  const router = useRouter();
  const isCorrespondence = graphType === "correspondences";

  const [activeEntity, setActiveEntity] = useState(entity);
  const [activeTab, setActiveTab] = useState<"consensus" | "sources">("consensus");
  const [claims, setClaims] = useState<KnowledgeClaim[]>([]);
  const [profile, setProfile] = useState<CorrespondenceProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [generatingConsensus, setGeneratingConsensus] = useState(false);
  const [generatedConsensus, setGeneratedConsensus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const correspondence = isCorrespondence ? (activeEntity as CorrespondenceEntity) : null;
  const parallax = !isCorrespondence ? (activeEntity as ParallaxConcept) : null;

  useEffect(() => {
    setActiveEntity(entity);
    setProfile(null);
    setError(null);
  }, [entity]);

  useEffect(() => {
    if (!isCorrespondence || !activeEntity?.id) return;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        setError(null);
        const res = await fetch(`/api/graph/entity-profile?entityId=${activeEntity.id}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load profile");
        }
        setProfile(data.profile || null);
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [activeEntity?.id, isCorrespondence]);

  useEffect(() => {
    if (isCorrespondence) return;

    const loadClaims = async () => {
      if (!activeEntity?.id) return;
      const res = await fetch(
        `/api/knowledge/claims?entityType=parallax&entityId=${activeEntity.id}`,
      );
      const data = await res.json();
      setClaims(data.items || []);
    };

    loadClaims();
  }, [activeEntity?.id, isCorrespondence]);

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
    if (!activeEntity?.id || !activeEntity?.name) {
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
          entityId: activeEntity.id,
          entityName: activeEntity.name,
          entityCategory: correspondence?.category || correspondence?.type?.slug,
          tradition: parallax?.tradition || parallax?.tradition_ref?.label,
          entityType: graphType,
          existingDescription: isCorrespondence
            ? correspondence?.description
            : parallax?.short_definition,
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
    if (!activeEntity?.id) return;

    onClose();

    const params = new URLSearchParams({
      editId: activeEntity.id,
      graphType: isCorrespondence ? "correspondences" : "parallax",
    });

    if (generatedConsensus) {
      if (generatedConsensus.length > 2000) {
        sessionStorage.setItem(`consensus_${activeEntity.id}`, generatedConsensus);
        params.append("useStoredConsensus", "true");
      } else {
        params.append("consensusText", encodeURIComponent(generatedConsensus));
      }
    }

    router.push(`/admin/knowledge-graph?${params.toString()}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-amber-900/30 bg-zinc-900 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-amber-900/30 bg-zinc-900/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-bold text-amber-100">{activeEntity?.name}</h2>
            <p className="text-sm text-amber-100/60">
              {isCorrespondence
                ? correspondence?.type?.label || correspondence?.category
                : parallax?.tradition_ref?.label || parallax?.tradition}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-700"
                title="Edit entity"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded p-2 text-amber-100/60 transition-colors hover:bg-zinc-800 hover:text-amber-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {isCorrespondence ? (
            loadingProfile ? (
              <div className="py-10 text-sm italic text-amber-100/45">
                Loading structured profile...
              </div>
            ) : profile ? (
              <CorrespondenceProfileDossier
                profile={profile}
                onSelectConnectionEntity={(connection) => {
                  setActiveEntity(toCorrespondenceEntity(connection.entity));
                }}
              />
            ) : (
              <div className="py-10 text-sm italic text-amber-100/45">
                {error || "No structured profile is available for this correspondence yet."}
              </div>
            )
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setActiveTab("consensus")}
                  className={`rounded px-3 py-2 text-sm font-medium ${
                    activeTab === "consensus"
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-800 text-amber-100/70"
                  }`}
                >
                  Consensus
                </button>
                <button
                  onClick={() => setActiveTab("sources")}
                  className={`rounded px-3 py-2 text-sm font-medium ${
                    activeTab === "sources"
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-800 text-amber-100/70"
                  }`}
                >
                  Sources
                </button>
              </div>

              {activeTab === "consensus" ? (
                <div className="space-y-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-amber-100/80">
                      Consensus Description
                    </h3>
                    {claims.length > 0 && !readOnly && (
                      <button
                        onClick={handleGenerateConsensus}
                        disabled={generatingConsensus}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-zinc-700"
                        title="Generate consensus from all claims"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {generatingConsensus ? "Generating..." : "Generate Consensus"}
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {generatedConsensus && (
                    <div className="space-y-3 rounded-lg border border-purple-700/50 bg-purple-900/20 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-purple-200">
                          Generated Consensus
                        </span>
                        {!readOnly && (
                          <button
                            onClick={handleEdit}
                            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
                            title="Edit entity to save this consensus"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit to Save
                          </button>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-amber-100/90">
                        {generatedConsensus}
                      </div>
                    </div>
                  )}

                  <>
                    {parallax?.short_definition && (
                      <div className="whitespace-pre-wrap text-amber-100/80">
                        {parallax.short_definition}
                      </div>
                    )}
                    {parallax?.tags?.length ? (
                      <div className="text-sm text-amber-100/60">
                        Tags: {parallax.tags.join(", ")}
                      </div>
                    ) : null}
                  </>

                  {!parallax?.short_definition && !generatedConsensus && (
                    <div className="text-sm text-amber-100/50">No consensus summary yet.</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {claimsBySource.length === 0 ? (
                    <div className="text-sm text-amber-100/50">No claims yet.</div>
                  ) : (
                    claimsBySource.map((group) => (
                      <div
                        key={group.source?.id || "unknown"}
                        className="rounded-lg border border-amber-900/20 bg-zinc-900/40 p-3"
                      >
                        <div className="mb-2 text-sm font-medium text-amber-100/80">
                          {group.source?.title || "Unknown source"}
                          {group.source?.author ? ` - ${group.source.author}` : ""}
                        </div>
                        <div className="space-y-2">
                          {group.claims.map((claim) => (
                            <div key={claim.id}>
                              <div className="text-xs uppercase tracking-wide text-amber-100/50">
                                {claim.field_key}
                              </div>
                              <div className="whitespace-pre-wrap text-sm text-amber-100/80">
                                {claim.field_value || "-"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
