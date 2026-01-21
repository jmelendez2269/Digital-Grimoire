"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Network, BookOpen, TableProperties } from "lucide-react";
import PublicEntityCard from "@/components/PublicEntityCard";
import EntityDetails from "@/components/graph/EntityDetails";
import SimilarityControls from "@/components/convergence/SimilarityControls";
import TraditionLegend from "@/components/convergence/TraditionLegend";
import ComparativeTable from "@/components/convergence/ComparativeTable";

// Dynamically import graph visualization from Admin component for consistency
const GraphVisualization = dynamic(
  () => import("@/components/admin/GraphVisualization"),
  { ssr: false, loading: () => <div className="text-amber-100/60">Loading graph...</div> }
);

// Dynamically import FloatingAISearch
const FloatingAISearch = dynamic(() => import('@/components/FloatingAISearch'), {
  ssr: false,
  loading: () => null,
});

type GraphType = "correspondences" | "convergence";
type ViewMode = "cards" | "graph" | "table";

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

  // State
  const [graphType, setGraphType] = useState<GraphType>("correspondences");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // Convergence Specific State
  const [minSimilarity, setMinSimilarity] = useState(0);
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const viewParam = searchParams.get("view");

    if (typeParam === "convergence") setGraphType("convergence");
    if (viewParam === "graph") setViewMode("graph");
    if (viewParam === "table") setViewMode("table");
  }, [searchParams]);

  // Fetch data on type change or similarity change (only for convergence)
  useEffect(() => {
    fetchData();
  }, [graphType, minSimilarity]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (graphType === "correspondences") {
        const [entRes, relRes] = await Promise.all([
          fetch("/api/graph/entities?limit=500"),
          fetch("/api/graph/edges?limit=1000")
        ]);

        const entData = await entRes.json();
        const relData = await relRes.json();

        setEntities(entData.items || []);
        setRelationships(relData.items || []);
      } else {
        const [concRes, relRes] = await Promise.all([
          fetch("/api/concepts?limit=500"),
          fetch(`/api/concepts/relationships?limit=1000&minSimilarity=${minSimilarity}`)
        ]);

        const concData = await concRes.json();
        const relData = await relRes.json();

        setEntities(concData.items || []);
        setRelationships(relData.items || []);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get traditions for filter (Convergence only)
  const traditions = graphType === "convergence"
    ? Array.from(new Set((entities as ConvergenceConcept[]).map((c) => c.tradition))).sort()
    : [];

  // Filtering
  const filteredEntities = entities.filter((entity) => {
    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (graphType === "correspondences") {
        const e = entity as CorrespondenceEntity;
        if (!(
          e.name.toLowerCase().includes(query) ||
          e.category.toLowerCase().includes(query) ||
          e.aliases?.some((a) => a.toLowerCase().includes(query)) ||
          e.description?.toLowerCase().includes(query)
        )) return false;
      } else {
        const e = entity as ConvergenceConcept;
        if (!(
          e.name.toLowerCase().includes(query) ||
          e.tradition.toLowerCase().includes(query) ||
          e.tags?.some((t) => t.toLowerCase().includes(query)) ||
          e.short_definition?.toLowerCase().includes(query)
        )) return false;
      }
    }

    // Tradition Filter (Convergence only)
    if (graphType === "convergence" && selectedTradition) {
      const e = entity as ConvergenceConcept;
      if (e.tradition !== selectedTradition) return false;
    }

    return true;
  });

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);
    setShowDetailPanel(true);
  };

  // Helper to handle view change request
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    const params = new URLSearchParams(searchParams);
    params.set("view", mode);
    router.replace(`/graph?${params.toString()}`, { scroll: false });
  };

  // Helper to handle type change request
  const handleTypeChange = (type: GraphType) => {
    setGraphType(type);
    setSearchQuery("");

    // When switching types, ensure view mode is compatible or default to cards/graph
    if (type === 'convergence') {
      // Keep current view unless it was specifically for correspondences (though mostly shared)
      // If users switch to convergence, they might want graph by default
      if (viewMode === 'cards') setViewMode('graph');
    } else {
      if (viewMode === 'table') setViewMode('cards'); // No table view for correspondences yet
    }

    const params = new URLSearchParams(searchParams);
    params.set("type", type);
    // Reset view param if we changed it automatically, otherwise keep
    // Actually simplicity: just let user switch.

    router.replace(`/graph?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="max-w-screen-2xl mx-auto px-4 py-8">

          {/* Header & Controls */}
          <div className="mb-6 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-100 mb-2">Knowledge Graph</h1>
              <p className="text-amber-100/60">
                {graphType === "correspondences"
                  ? "Explore the interconnected lattice of correspondences."
                  : "See how all wisdom paths converge. Visualize cross-tradition conceptual unity."}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Top Row: Type, View, and Search (if not utilizing SimilarityControls) */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Graph Type Toggle */}
                <div className="flex gap-2 bg-zinc-900/50 border border-amber-900/20 rounded-lg p-1">
                  <button
                    onClick={() => handleTypeChange("correspondences")}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${graphType === "correspondences"
                        ? "bg-amber-600 text-white"
                        : "text-amber-100/60 hover:text-amber-100"
                      }`}
                  >
                    Correspondences
                  </button>
                  <button
                    onClick={() => handleTypeChange("convergence")}
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
                    onClick={() => handleViewChange("cards")}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "cards"
                        ? "bg-amber-600 text-white"
                        : "text-amber-100/60 hover:text-amber-100"
                      }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Cards
                  </button>
                  <button
                    onClick={() => handleViewChange("graph")}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "graph"
                        ? "bg-amber-600 text-white"
                        : "text-amber-100/60 hover:text-amber-100"
                      }`}
                  >
                    <Network className="w-4 h-4" />
                    Graph
                  </button>
                  {graphType === 'convergence' && (
                    <button
                      onClick={() => handleViewChange("table")}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "table"
                          ? "bg-amber-600 text-white"
                          : "text-amber-100/60 hover:text-amber-100"
                        }`}
                    >
                      <TableProperties className="w-4 h-4" />
                      Table
                    </button>
                  )}
                </div>

                {/* Only show simple search if NOT in convergence mode (which has its own controls) */}
                {graphType !== 'convergence' && (
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
                )}
              </div>

              {/* Convergence Controls */}
              {graphType === 'convergence' && (
                <SimilarityControls
                  minSimilarity={minSimilarity}
                  onSimilarityChange={setMinSimilarity}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedTradition={selectedTradition}
                  onTraditionChange={setSelectedTradition}
                  traditions={traditions}
                />
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
            {/* Main view area */}
            <div className={`transition-all duration-300 ${(showDetailPanel || (viewMode === 'graph' && graphType === 'convergence'))
                ? 'lg:col-span-3'
                : 'lg:col-span-4'
              }`}>

              {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : viewMode === "cards" ? (
                /* Cards View */
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`}>
                  {filteredEntities.map((entity) => (
                    <PublicEntityCard
                      key={entity.id}
                      entity={entity}
                      graphType={graphType}
                      relationships={relationships}
                      onSelect={() => handleEntitySelect(entity)}
                    />
                  ))}
                  {filteredEntities.length === 0 && (
                    <div className="col-span-full text-center py-12 text-amber-100/60">
                      No entities found.
                    </div>
                  )}
                </div>
              ) : viewMode === "table" ? (
                /* Table View (Convergence Only) */
                <ComparativeTable
                  concepts={filteredEntities as ConvergenceConcept[]}
                  relationships={relationships}
                  onSelectConcept={handleEntitySelect as any}
                />
              ) : (
                /* Graph View */
                <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4 min-h-[600px] h-[75vh]">
                  <GraphVisualization
                    entities={filteredEntities}
                    relationships={relationships}
                    graphType={graphType}
                    onSelectEntity={(entity: Entity) => handleEntitySelect(entity)}
                  />
                </div>
              )}
            </div>

            {/* Right Sidebar - Logic to split Legend and Details Panel */}
            {(viewMode === 'graph' && graphType === 'convergence') ? (
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-4">
                  {/* Legend */}
                  <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
                    <TraditionLegend
                      traditions={traditions}
                      concepts={entities as ConvergenceConcept[]}
                      selectedTradition={selectedTradition}
                      onSelectTradition={setSelectedTradition}
                    />
                  </div>

                  {/* Detail Panel within Sidebar if space permits or overlay? 
                          Let's keep it overlay for consistent experience or stacked below.
                          If selectedEntity exists, show it.
                      */}
                  {showDetailPanel && selectedEntity && (
                    <div className="bg-zinc-900/80 backdrop-blur-md border border-amber-900/20 rounded-lg p-4 max-h-[50vh] overflow-y-auto shadow-xl">
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-bold text-amber-100 bg-zinc-900/50 px-2 py-1 rounded">
                          {selectedEntity.name}
                        </h2>
                        <button onClick={() => setShowDetailPanel(false)} className="text-amber-100/40 hover:text-amber-100">✕</button>
                      </div>
                      <EntityDetails
                        entity={selectedEntity}
                        onGraphRefresh={() => { }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : showDetailPanel && selectedEntity && (
              <div className="lg:col-span-1 fixed inset-y-0 right-0 w-96 bg-zinc-950 border-l border-amber-900/20 shadow-2xl z-40 p-6 overflow-y-auto lg:static lg:w-auto lg:h-auto lg:border-0 lg:shadow-none lg:p-0">
                <div className="sticky top-24">
                  <div className="bg-zinc-900/80 backdrop-blur-md border border-amber-900/20 rounded-lg p-4 max-h-[80vh] overflow-y-auto shadow-xl shadow-black/50">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xl font-bold text-amber-100">Details</h2>
                      <button onClick={() => setShowDetailPanel(false)} className="text-amber-100/40 hover:text-amber-100">✕</button>
                    </div>
                    <EntityDetails entity={selectedEntity} onGraphRefresh={() => { }} />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <FloatingAISearch defaultCollapsed={true} />
      <Footer />
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950"></div>}>
      <GraphPageContent />
    </Suspense>
  );
}
