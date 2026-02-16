"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AlertCircle, BookOpen } from "lucide-react";
import EntityDetailModal from "@/components/admin/EntityDetailModal";

import DocumentationLink from '@/components/DocumentationLink';
import dynamic from "next/dynamic";

// Ported Components from Admin
import KnowledgeGraphHeader from "@/components/admin/knowledge/KnowledgeGraphHeader";
import GraphControls from "@/components/admin/knowledge/GraphControls";
import EntityNode from "@/components/admin/knowledge/EntityNode";

// Convergence Specifics (retained for functionality but integrated)
import SimilarityControls from "@/components/parallax/SimilarityControls";
import ComparativeTable from "@/components/parallax/ComparativeTable";

// Dynamically import graph visualization
const GraphVisualization = dynamic(
  () => import("@/components/admin/GraphVisualization"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-amber-500/40 font-mono text-sm uppercase tracking-widest animate-pulse">
        Loading Knowledge Graph...
      </div>
    )
  }
);

type GraphType = "correspondences" | "convergence";
type ViewMode = "cards" | "graph" | "table"; // Added table for convergence support

// Reusing interfaces
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

function GraphPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [graphType, setGraphType] = useState<GraphType>("correspondences");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Convergence Specific State
  const [minSimilarity, setMinSimilarity] = useState(0);
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);

  // Initialize from URL
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const viewParam = searchParams.get("view");
    if (typeParam === "convergence") setGraphType("convergence");
    if (viewParam === "graph") setViewMode("graph");
    if (viewParam === "table") setViewMode("table");
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (graphType === "correspondences") {
        const [entRes, relRes] = await Promise.all([
          fetch("/api/graph/entities?limit=500"),
          fetch("/api/graph/edges?limit=1000")
        ]);
        if (entRes.ok && relRes.ok) {
          const entData = await entRes.json();
          const relData = await relRes.json();
          setEntities(entData.items || []);
          setRelationships(relData.items || []);
        }
      } else {
        const [concRes, relRes] = await Promise.all([
          fetch("/api/concepts?limit=500"),
          fetch(`/api/concepts/relationships?limit=1000&minSimilarity=${minSimilarity}`)
        ]);
        if (concRes.ok && relRes.ok) {
          const concData = await concRes.json();
          const relData = await relRes.json();
          setEntities(concData.items || []);
          setRelationships(relData.items || []);
        }
      }
    } catch (err) {
      console.error("Error fetching graph data:", err);
    } finally {
      setLoading(false);
    }
  }, [graphType, minSimilarity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const traditions = graphType === "convergence"
    ? Array.from(new Set((entities as ConvergenceConcept[]).map((c) => c.tradition))).sort()
    : [];

  const filteredEntities = entities.filter((entity) => {
    const query = searchQuery.toLowerCase();

    // Convergence Tradition Filter
    if (graphType === "convergence" && selectedTradition) {
      const e = entity as ConvergenceConcept;
      if (e.tradition !== selectedTradition) return false;
    }

    if (!searchQuery) return true;

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

  const handleTypeChange = (type: GraphType) => {
    setGraphType(type);
    setSearchQuery("");
    const params = new URLSearchParams(searchParams);
    params.set("type", type);
    router.replace(`/graph?${params.toString()}`, { scroll: false });
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    const params = new URLSearchParams(searchParams);
    params.set("view", mode);
    router.replace(`/graph?${params.toString()}`, { scroll: false });
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#050505] items-center justify-center relative overflow-hidden">
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
            Loading Graph Data
          </h2>
          <p className="text-amber-500/50 font-mono text-xs mt-2">Authenticating Public Key...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] text-white selection:bg-amber-500/30 selection:text-amber-100">
      <Header />
      <DocumentationLink href="/wiki/user/graph" label="Graph Guide" className="container mx-auto px-4 py-2" />
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
          entityCount={entities.length}
          connectionCount={relationships.length}
          loading={loading}
        // No onCreateClick for public view
        />

        {/* Action Controls Bar */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <GraphControls
              graphType={graphType}
              onGraphTypeChange={handleTypeChange}
              viewMode={viewMode === 'table' ? 'cards' : viewMode} // GraphControls only supports cards/graph
              onViewModeChange={(mode) => handleViewChange(mode)}
            />

            {/* Extra View Modes for Public (Componentized if possible, but inline for now) */}
            {graphType === 'convergence' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewChange("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 hover:text-amber-200 transition-colors ${viewMode === 'table' ? 'text-amber-200 bg-white/10' : ''}`}
                >
                  {/* Reuse Settings icon or similar for now, usually Table icon */}
                  <span>Table View</span>
                </button>
              </div>
            )}
          </div>

          {/* Convergence Specific Controls */}
          {graphType === 'convergence' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <SimilarityControls
                minSimilarity={minSimilarity}
                onSimilarityChange={setMinSimilarity}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery} // Redundant with Header but kept for similarity control layout if needed
                selectedTradition={selectedTradition}
                onTraditionChange={setSelectedTradition}
                traditions={traditions}
              />
            </div>
          )}
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
                // No edit/delete actions passed
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
                      : "Knowledge base is empty."}
                  </p>
                </div>
              )}
            </div>
          ) : viewMode === "table" ? (
            <ComparativeTable
              concepts={filteredEntities as ConvergenceConcept[]}
              relationships={relationships}
              onSelectConcept={(entity) => {
                setSelectedEntity(entity);
                setShowDetailModal(true);
              }}
            />
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
                  setShowDetailModal(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedEntity && (
          <EntityDetailModal
            entity={selectedEntity}
            graphType={graphType}
            onClose={() => setShowDetailModal(false)}
            readOnly={true}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-amber-500/50 font-mono tracking-widest uppercase">
        Initializing...
      </div>
    }>
      <GraphPageContent />
    </Suspense>
  );
}
