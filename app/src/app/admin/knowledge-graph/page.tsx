"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Plus, Search, Network, BookOpen, Link2, Edit, Trash2, Settings } from "lucide-react";
import EntityModal from "@/components/admin/EntityModal";
import ConnectionModal from "@/components/admin/ConnectionModal";
import TypeManagerModal from "@/components/admin/TypeManagerModal";
import EntityDetailModal from "@/components/admin/EntityDetailModal";
import dynamic from "next/dynamic";

// Dynamically import graph visualization
const GraphVisualization = dynamic(
  () => import("@/components/admin/GraphVisualization"),
  { ssr: false, loading: () => <div className="text-amber-100/60">Loading graph...</div> }
);

type GraphType = "correspondences" | "convergence";

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

    // Get consensus from URL or sessionStorage
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
        // Set graph type if specified in URL
        if (urlGraphType && urlGraphType !== graphType) {
          setGraphType(urlGraphType);
          // Wait for graph type change to complete before opening modal
          setTimeout(() => {
            setEditingEntity(entityToEdit);
            setShowCreateModal(true);
            // Clean up URL
            router.replace("/admin/knowledge-graph", { scroll: false });
          }, 100);
        } else {
          setEditingEntity(entityToEdit);
          setShowCreateModal(true);
          // Clean up URL
          router.replace("/admin/knowledge-graph", { scroll: false });
        }
      }
    }
  }, [searchParams, entities, graphType, router]);

  const checkAdminAndFetch = async () => {
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
    await fetchEntities();
    await fetchRelationships();
    setLoading(false);
  };

  const fetchEntities = async () => {
    try {
      if (graphType === "correspondences") {
        const res = await fetch("/api/graph/entities?limit=500");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errorData.error || `Failed to load entities: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        console.log(`[Admin] Loaded ${data.items?.length || 0} correspondence entities`);
        setEntities(data.items || []);
      } else {
        const res = await fetch("/api/concepts?limit=500");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errorData.error || `Failed to load concepts: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        console.log(`[Admin] Loaded ${data.items?.length || 0} convergence concepts`, data);
        setEntities(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching entities:", err);
      alert(`Failed to load ${graphType === "correspondences" ? "entities" : "concepts"}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const fetchRelationships = async () => {
    try {
      if (graphType === "correspondences") {
        const res = await fetch("/api/graph/edges?limit=1000");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errorData.error || `Failed to load relationships: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setRelationships(data.items || []);
      } else {
        const res = await fetch("/api/concepts/relationships?limit=1000");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errorData.error || `Failed to load concept relationships: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setRelationships(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching relationships:", err);
      // Show error to user if needed
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

  if (!isAdmin || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-amber-100/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="max-w-screen-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-amber-100 mb-2">
              Knowledge Graph Manager
            </h1>
            <p className="text-amber-100/60">
              Manage correspondences and convergence concepts with an Obsidian-style card interface
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {/* Graph Type Toggle */}
            <div className="flex gap-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg p-1">
              <button
                onClick={() => {
                  setGraphType("correspondences");
                  setSearchQuery("");
                }}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${graphType === "correspondences"
                  ? "bg-amber-600 text-white"
                  : "text-amber-100/60 hover:text-amber-100"
                  }`}
              >
                Correspondences
              </button>
              <button
                onClick={() => {
                  setGraphType("convergence");
                  setSearchQuery("");
                }}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${graphType === "convergence"
                  ? "bg-amber-600 text-white"
                  : "text-amber-100/60 hover:text-amber-100"
                  }`}
              >
                Convergence Concepts
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "cards"
                  ? "bg-amber-600 text-white"
                  : "text-amber-100/60 hover:text-amber-100"
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "graph"
                  ? "bg-amber-600 text-white"
                  : "text-amber-100/60 hover:text-amber-100"
                  }`}
              >
                <Network className="w-4 h-4" />
                Graph
              </button>
            </div>

            {/* Manage Types */}
            {graphType === "correspondences" ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTypeManager({ open: true, kind: "entity" })}
                  className="px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100/70 text-sm hover:bg-zinc-800/50 hover:text-amber-100 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage Entity Types
                </button>
                <button
                  onClick={() => setShowTypeManager({ open: true, kind: "relationship" })}
                  className="px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100/70 text-sm hover:bg-zinc-800/50 hover:text-amber-100 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage Relationship Types
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTypeManager({ open: true, kind: "tradition" })}
                className="px-3 py-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg text-amber-100/70 text-sm hover:bg-zinc-800/50 hover:text-amber-100 transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Traditions
              </button>
            )}

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-100/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entities..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                />
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={() => {
                setEditingEntity(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create {graphType === "correspondences" ? "Entity" : "Concept"}
            </button>
          </div>

          {/* Content */}
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEntities.map((entity) => (
                <EntityCard
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
                <div className="col-span-full text-center py-12 text-amber-100/60">
                  <p className="text-lg mb-2">No entities found</p>
                  <p className="text-sm">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Create your first entity to get started"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4 min-h-[600px]">
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

          {/* Create/Edit Modal */}
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

          {/* Connection Modal */}
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
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AdminKnowledgeGraphPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-950"><div className="text-amber-100/60">Loading Knowledge Graph...</div></div>}>
      <KnowledgeGraphContent />
    </Suspense>
  );
}

// Entity Card Component (Obsidian-style)
function EntityCard({
  entity,
  graphType,
  relationships,
  onSelect,
  onEdit,
  onDelete,
  onCreateConnection,
}: {
  entity: Entity;
  graphType: GraphType;
  relationships: any[];
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateConnection: () => void;
}) {
  const relatedCount = relationships.filter(
    (r) => r.source_id === entity.id || r.target_id === entity.id
  ).length;

  return (
    <div
      className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4 hover:border-amber-700/50 transition-colors cursor-pointer group relative"
      onClick={onSelect}
    >
      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-amber-100/60 hover:text-amber-100"
          title="Edit"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 bg-zinc-800 hover:bg-red-900/50 rounded text-amber-100/60 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="pr-16">
        <h3 className="font-semibold text-amber-100 mb-2">{entity.name}</h3>

        {graphType === "correspondences" ? (
          <div className="space-y-2">
            <span className="inline-block px-2 py-0.5 bg-amber-900/20 border border-amber-700/30 rounded text-xs text-amber-100/80">
              {(entity as CorrespondenceEntity).type?.icon
                ? `${(entity as CorrespondenceEntity).type?.icon} `
                : ""}
              {(entity as CorrespondenceEntity).type?.label || (entity as CorrespondenceEntity).category}
            </span>
            {(entity as CorrespondenceEntity).description && (
              <p className="text-sm text-amber-100/60 line-clamp-2">
                {(entity as CorrespondenceEntity).description}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <span className="inline-block px-2 py-0.5 bg-amber-900/20 border border-amber-700/30 rounded text-xs text-amber-100/80">
              {(entity as ConvergenceConcept).tradition_ref?.icon
                ? `${(entity as ConvergenceConcept).tradition_ref?.icon} `
                : ""}
              {(entity as ConvergenceConcept).tradition_ref?.label || (entity as ConvergenceConcept).tradition}
            </span>
            {(entity as ConvergenceConcept).short_definition && (
              <p className="text-sm text-amber-100/60 line-clamp-2">
                {(entity as ConvergenceConcept).short_definition}
              </p>
            )}
          </div>
        )}

        {/* Connections */}
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/50">
          <Link2 className="w-3.5 h-3.5" />
          <span>{relatedCount} connection{relatedCount !== 1 ? "s" : ""}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateConnection();
            }}
            className="ml-auto text-amber-600 hover:text-amber-500 transition-colors"
            title="Add connection"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
