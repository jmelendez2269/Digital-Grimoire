"use client";
// Force HMR update

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Plus, Settings, AlertCircle } from "lucide-react";
import EntityModal from "@/components/admin/EntityModal";
import ConnectionModal from "@/components/admin/ConnectionModal";
import TypeManagerModal from "@/components/admin/TypeManagerModal";
import EntityDetailModal from "@/components/admin/EntityDetailModal";
import dynamic from "next/dynamic";

// New Components
import KnowledgeGraphHeader from "@/components/admin/knowledge/KnowledgeGraphHeader";
import GraphControls from "@/components/admin/knowledge/GraphControls";
import EntityNode from "@/components/admin/knowledge/EntityNode";

// Dynamically import graph visualization
const GraphVisualization = dynamic(
  () => import("@/components/admin/GraphVisualization"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-amber-500/40 font-mono text-sm uppercase tracking-widest animate-pulse">
        Initializing Neural Net...
      </div>
    )
  }
);

type GraphType = "correspondences" | "convergence";

// Reusing interfaces from previous version
interface CorrespondenceEntity {
  id: string;
  slug: string;
  name: string;
  category: string;
  type_id?: string;
  type?: { id: string; slug: string; label: string; color?: string; icon?: string };
  aliases?: string[];
  description?: string;
  lenses?: string[];
}

interface ConvergenceConcept {
  id: string;
  slug: string;
  name: string;
  tradition: string;
  tradition_id?: string;
  tradition_ref?: { id: string; slug: string; label: string; color?: string; icon?: string };
  era?: string;
  short_definition?: string;
  primary_sources?: string[];
  tags?: string[];
}

type Entity = CorrespondenceEntity | ConvergenceConcept;

function KnowledgeGraphContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [graphType, setGraphType] = useState<GraphType>("correspondences");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "graph">("cards");
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState<{
    open: boolean;
    kind: "entity" | "relationship" | "tradition";
  }>({ open: false, kind: "entity" });

  useEffect(() => {
    checkAdminAndFetch();
  }, [graphType]);

  // Handle editId query parameter to auto-open edit modal
  const [pendingConsensus, setPendingConsensus] = useState<string | null>(null);

  useEffect(() => {
    const editId = searchParams.get("editId");
    const urlGraphType = searchParams.get("graphType") as GraphType | null;
    const consensusText = searchParams.get("consensusText");
    const useStoredConsensus = searchParams.get("useStoredConsensus");

    let consensus: string | null = null;
    if (useStoredConsensus === "true" && editId) {
      consensus = sessionStorage.getItem(`consensus_${editId}`);
      if (consensus) {
        sessionStorage.removeItem(`consensus_${editId}`);
      }
    } else if (consensusText) {
      consensus = decodeURIComponent(consensusText);
    }

    if (consensus) {
      setPendingConsensus(consensus);
    }

    if (editId && entities.length > 0) {
      const entityToEdit = entities.find((e) => e.id === editId);
      if (entityToEdit) {
        if (urlGraphType && urlGraphType !== graphType) {
          setGraphType(urlGraphType);
          setTimeout(() => {
            setEditingEntity(entityToEdit);
            setShowCreateModal(true);
            router.replace("/admin/knowledge-graph", { scroll: false });
          }, 100);
        } else {
          setEditingEntity(entityToEdit);
          setShowCreateModal(true);
          router.replace("/admin/knowledge-graph", { scroll: false });
        }
      }
    }
  }, [searchParams, entities, graphType, router]);

  const checkAdminAndFetch = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchEntities(), fetchRelationships()]);
    } catch (error) {
      console.error("Error in checkAdminAndFetch:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntities = async () => {
    try {
      if (graphType === "correspondences") {
        const res = await fetch("/api/graph/entities?limit=500");
        if (!res.ok) throw new Error("Failed to load entities");
        const data = await res.json();
        setEntities(data.items || []);
      } else {
        const res = await fetch("/api/concepts?limit=500");
        if (!res.ok) throw new Error("Failed to load concepts");
        const data = await res.json();
        setEntities(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching entities:", err);
    }
  };

  const fetchRelationships = async () => {
    try {
      if (graphType === "correspondences") {
        const res = await fetch("/api/graph/edges?limit=1000");
        if (!res.ok) throw new Error("Failed to load relationships");
        const data = await res.json();
        setRelationships(data.items || []);
      } else {
        const res = await fetch("/api/concepts/relationships?limit=1000");
        if (!res.ok) throw new Error("Failed to load relationships");
        const data = await res.json();
        setRelationships(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching relationships:", err);
    }
  };

  const handleDelete = async (entityId: string) => {
    if (!confirm("Are you sure you want to delete this entity? This will also delete all its relationships.")) {
      return;
    }

    try {
      const endpoint = graphType === "correspondences"
        ? `/api/graph/entities/${entityId}`
        : `/api/concepts/${entityId}`;

      const res = await fetch(endpoint, { method: "DELETE" });

      if (!res.ok) {
        throw new Error("Failed to delete entity");
      }

      await fetchEntities();
      await fetchRelationships();
    } catch (err) {
      console.error("Error deleting entity:", err);
      alert("Failed to delete entity");
    }
  };

  const filteredEntities = entities.filter((entity) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (graphType === "correspondences") {
      const e = entity as CorrespondenceEntity;
      return (
        e.name.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.aliases?.some((a) => a.toLowerCase().includes(query)) ||
        e.description?.toLowerCase().includes(query)
      );
    } else {
      const e = entity as ConvergenceConcept;
      return (
        e.name.toLowerCase().includes(query) ||
        e.tradition.toLowerCase().includes(query) ||
        e.tags?.some((t) => t.toLowerCase().includes(query)) ||
        e.short_definition?.toLowerCase().includes(query)
      );
    }
  });

  // LOADING STATE
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#050505] items-center justify-center relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] animate-pulse" />
        </div>

        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-1.5 h-12 bg-amber-600 animate-[height_1s_ease-in-out_infinite]" />
            <span className="w-1.5 h-16 bg-amber-500 animate-[height_1.2s_ease-in-out_infinite_0.1s]" />
            <span className="w-1.5 h-10 bg-amber-600 animate-[height_0.8s_ease-in-out_infinite_0.2s]" />
          </div>
          <h2 className="text-xl font-mono font-bold text-amber-100 uppercase tracking-widest animate-pulse">
            System Initialization
          </h2>
          <p className="text-amber-500/50 font-mono text-xs mt-2">Connecting to Neural Net...</p>
        </div>
      </div>
    );
  }

  // ACCESS DENIED
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-red-500/80 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-100 mb-2">Access Denied</h2>
          <p className="text-red-100/60 mb-6 font-mono text-sm">
            Neural interface connection rejected. Admin clearance required.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 rounded text-red-200 transition-colors uppercase font-mono text-xs tracking-wider"
          >
            Return to Safety
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] text-white selection:bg-amber-500/30 selection:text-amber-100">
      <Header />

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[150px] opacity-30 mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] opacity-20 mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02]" />
      </div>

      <main className="flex-1 relative z-10 pt-32 pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto w-full">

        {/* HUD Header */}
        <KnowledgeGraphHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateClick={() => {
            setEditingEntity(null);
            setShowCreateModal(true);
          }}
          entityCount={entities.length}
          connectionCount={relationships.length}
          loading={loading}
        />

        {/* Action Controls Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <GraphControls
            graphType={graphType}
            onGraphTypeChange={(type) => {
              setGraphType(type);
              setSearchQuery("");
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Type Managers */}
          <div className="flex gap-2">
            {graphType === "correspondences" ? (
              <>
                <button
                  onClick={() => setShowTypeManager({ open: true, kind: "entity" })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 hover:text-amber-200 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Entity Types</span>
                </button>
                <button
                  onClick={() => setShowTypeManager({ open: true, kind: "relationship" })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 hover:text-amber-200 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Rel Types</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowTypeManager({ open: true, kind: "tradition" })}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 hover:text-amber-200 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Traditions</span>
              </button>
            )}
          </div>
        </div>

        {/* Content View */}
        <div className="min-h-[600px] animate-in fade-in duration-700">
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEntities.map((entity) => (
                <EntityNode
                  key={entity.id}
                  entity={entity}
                  graphType={graphType}
                  relationships={relationships}
                  onSelect={() => {
                    setSelectedEntity(entity);
                    setShowDetailModal(true);
                  }}
                  onEdit={() => {
                    setEditingEntity(entity);
                    setShowCreateModal(true);
                  }}
                  onDelete={() => handleDelete(entity.id)}
                  onCreateConnection={() => {
                    setSelectedEntity(entity);
                    setShowConnectionModal(true);
                  }}
                />
              ))}
              {filteredEntities.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="inline-block p-4 rounded-full bg-white/5 border border-white/10 mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-500/50" />
                  </div>
                  <h3 className="text-amber-100 font-bold mb-2">No Signal Found</h3>
                  <p className="text-amber-100/40 text-sm max-w-sm mx-auto">
                    {searchQuery
                      ? "Neural scan produced no matches. Adjust search parameters."
                      : "Knowledge base is empty. Inject new nodes to begin."}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[700px] bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
              {/* Decorative HUD Elements */}
              <div className="absolute top-0 left-0 p-4 font-mono text-[10px] text-amber-500/40 z-10 pointer-events-none">
                <div className="flex flex-col gap-1">
                  <span>NET_VISUALIZATION_ACTIVE</span>
                  <span>RENDER_ENGINE: WEBGL</span>
                </div>
              </div>
              <GraphVisualization
                entities={filteredEntities}
                relationships={relationships}
                graphType={graphType}
                onSelectEntity={(entity: any) => {
                  setSelectedEntity(entity);
                  setEditingEntity(entity);
                  setShowCreateModal(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Modals - Kept Logic, Wrapped if necessary (Default modals are usually portals) */}
        {showCreateModal && (
          <EntityModal
            entity={editingEntity}
            graphType={graphType}
            initialConsensus={pendingConsensus}
            onClose={() => {
              setShowCreateModal(false);
              setEditingEntity(null);
              setPendingConsensus(null);
            }}
            onSave={async () => {
              await fetchEntities();
              await fetchRelationships();
              setShowCreateModal(false);
              setEditingEntity(null);
              setPendingConsensus(null);
            }}
          />
        )}

        {showConnectionModal && selectedEntity && (
          <ConnectionModal
            sourceEntity={selectedEntity}
            graphType={graphType}
            allEntities={entities}
            existingRelationships={relationships}
            onClose={() => {
              setShowConnectionModal(false);
              setSelectedEntity(null);
            }}
            onSave={async () => {
              await fetchRelationships();
              setShowConnectionModal(false);
              setSelectedEntity(null);
            }}
          />
        )}

        {showTypeManager.open && (
          <TypeManagerModal
            kind={showTypeManager.kind}
            onClose={() => setShowTypeManager({ ...showTypeManager, open: false })}
            onUpdated={async () => {
              await fetchEntities();
              await fetchRelationships();
            }}
          />
        )}

        {showDetailModal && selectedEntity && (
          <EntityDetailModal
            entity={selectedEntity}
            graphType={graphType}
            onClose={() => setShowDetailModal(false)}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function AdminKnowledgeGraphPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-amber-500/50 font-mono tracking-widest uppercase">
        Initializing...
      </div>
    }>
      <KnowledgeGraphContent />
    </Suspense>
  );
}

