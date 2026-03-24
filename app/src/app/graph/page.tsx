"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import AppLoader from "@/components/ui/AppLoader";
import ParallaxLoader from "@/components/ui/ParallaxLoader";

// Ported Components from Admin
import KnowledgeGraphHeader from "@/components/admin/knowledge/KnowledgeGraphHeader";
import CorrespondenceControls from "@/components/admin/knowledge/CorrespondenceControls";
import GraphControls from "@/components/admin/knowledge/GraphControls";

// Parallax-specific components
import SimilarityControls from "@/components/parallax/SimilarityControls";
import TraditionLegend from "@/components/parallax/TraditionLegend";
import EntityNode from "@/components/PublicEntityCard";
import ComparativeTable from "@/components/parallax/ComparativeTable";

// Modals
import EntityDetailModal from "@/components/admin/EntityDetailModal";
import ConceptDetailModal from "@/components/parallax/ConceptDetailModal";

// Types
import { ParallaxConcept, CorrespondenceEntity, GraphType } from "@/lib/types";

// Dynamic Imports
const GraphVisualization = dynamic(
  () => import("@/components/parallax/ParallaxGraph"),
  { ssr: false, loading: () => <ParallaxLoader /> }
);

const FloatingAISearch = dynamic(() => import("@/components/FloatingAISearch"), {
  ssr: false,
  loading: () => null,
});

function GraphPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [graphType, setGraphType] = useState<GraphType>((searchParams.get("type") as GraphType) || "correspondences");
  const [viewMode, setViewMode] = useState<"cards" | "graph" | "table">("graph");
  const [entities, setEntities] = useState<(ParallaxConcept | CorrespondenceEntity)[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected entity — typed separately so we can use the right modal
  const [selectedParallaxConcept, setSelectedParallaxConcept] = useState<ParallaxConcept | null>(null);
  const [selectedCorrespondenceEntity, setSelectedCorrespondenceEntity] = useState<CorrespondenceEntity | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minSimilarity, setMinSimilarity] = useState(0);

  // Initial Data Fetch — minSimilarity triggers a re-fetch in parallax mode (same as /parallax-graph)
  useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true);
      try {
        if (graphType === "parallax") {
          const [entitiesRes, relationshipsRes] = await Promise.all([
            fetch("/api/concepts?limit=200"),
            fetch(`/api/concepts/relationships?limit=400&minSimilarity=${minSimilarity}`)
          ]);

          const entitiesData = await entitiesRes.json();
          const relationshipsData = await relationshipsRes.json();

          setEntities(entitiesData.items || []);
          setRelationships(relationshipsData.items || []);
        } else {
          const [entitiesRes, relationshipsRes] = await Promise.all([
            fetch("/api/graph/entities?limit=100"),
            fetch("/api/graph/edges?limit=400")
          ]);

          const entitiesData = await entitiesRes.json();
          const relationshipsData = await relationshipsRes.json();

          setEntities(entitiesData.items || []);
          // Map 'weight' to 'similarity' for graph visualization compatibility
          setRelationships((relationshipsData.items || []).map((r: any) => ({
            ...r,
            similarity: r.weight || 0.5
          })));
        }

      } catch (error) {
        console.error("Failed to fetch entities", error);
        setEntities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, [graphType, minSimilarity]);

  // Derived Data for Filters
  const traditions = useMemo(() => {
    return graphType === "parallax"
      ? Array.from(new Set((entities as ParallaxConcept[]).map((c) => c.tradition || c.tradition_ref?.label).filter(Boolean) as string[])).sort()
      : [];
  }, [graphType, entities]);

  const categories = useMemo(() => {
    return graphType === "correspondences"
      ? Array.from(new Set((entities as CorrespondenceEntity[]).map((e) => e.category || e.type?.label).filter(Boolean) as string[])).sort()
      : [];
  }, [graphType, entities]);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      const query = searchQuery.toLowerCase();

      // Parallax Tradition Filter
      if (graphType === "parallax" && selectedTradition) {
        const e = entity as ParallaxConcept;
        const traditionLabel = e.tradition || e.tradition_ref?.label;
        if (traditionLabel !== selectedTradition) return false;
      }

      // Correspondence Category Filter
      if (graphType === "correspondences" && selectedCategory) {
        const e = entity as CorrespondenceEntity;
        const categoryLabel = e.category || e.type?.label;
        if (categoryLabel !== selectedCategory) return false;
      }

      if (!searchQuery) return true;

      if (graphType === "correspondences") {
        const e = entity as CorrespondenceEntity;
        return (
          e.name.toLowerCase().includes(query) ||
          (e.category && e.category.toLowerCase().includes(query)) ||
          (e.type?.label && e.type.label.toLowerCase().includes(query)) ||
          e.aliases?.some((a) => a.toLowerCase().includes(query)) ||
          e.description?.toLowerCase().includes(query)
        );
      } else {
        const e = entity as ParallaxConcept;
        return (
          e.name.toLowerCase().includes(query) ||
          (e.tradition && e.tradition.toLowerCase().includes(query)) ||
          (e.tradition_ref && e.tradition_ref.label.toLowerCase().includes(query)) ||
          e.tags?.some((t) => t.toLowerCase().includes(query)) ||
          e.short_definition?.toLowerCase().includes(query)
        );
      }
    });
  }, [entities, graphType, selectedTradition, selectedCategory, searchQuery]);

  const handleTypeChange = (type: GraphType) => {
    setGraphType(type);
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedTradition(null);
    setMinSimilarity(0);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    router.replace(`/graph?${params.toString()}`, { scroll: false });
  };

  const handleViewChange = (mode: "cards" | "graph" | "table") => {
    setViewMode(mode);
  };

  const handleSelectEntity = (entity: ParallaxConcept | CorrespondenceEntity) => {
    if (graphType === "parallax") {
      setSelectedParallaxConcept(entity as ParallaxConcept);
    } else {
      setSelectedCorrespondenceEntity(entity as CorrespondenceEntity);
    }
  };

  const isParallaxGraphView = graphType === "parallax" && viewMode === "graph";

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 selection:bg-amber-900/30">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <KnowledgeGraphHeader
          title={graphType === "parallax" ? "The Parallax Graph" : "Correspondences"}
          subtitle={graphType === "parallax"
            ? "Visualizing the convergence of magical traditions and modern theory."
            : "Explore the web of symbolic connections and correspondences."}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          entityCount={filteredEntities.length}
          connectionCount={relationships.length}
          loading={loading}
        />

        {/* Action Controls Bar */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <GraphControls
              graphType={graphType}
              onGraphTypeChange={handleTypeChange}
              viewMode={viewMode === 'table' ? 'cards' : viewMode}
              onViewModeChange={(mode) => handleViewChange(mode)}
            />

            {/* Extra View Modes for Public */}
            {graphType === 'parallax' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewChange("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 hover:text-amber-200 transition-colors ${viewMode === 'table' ? 'text-amber-200 bg-white/10' : ''}`}
                >
                  <span>Table View</span>
                </button>
              </div>
            )}
          </div>

          {/* Parallax Specific Controls */}
          {graphType === 'parallax' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <SimilarityControls
                minSimilarity={minSimilarity}
                onSimilarityChange={setMinSimilarity}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTradition={selectedTradition}
                onTraditionChange={setSelectedTradition}
                traditions={traditions}
              />
            </div>
          )}

          {/* Correspondence Specific Controls */}
          {graphType === 'correspondences' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <CorrespondenceControls
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categories}
              />
            </div>
          )}
        </div>

        {/* Content View */}
        <div className="min-h-[600px] animate-in fade-in duration-700">
          {loading ? (
            <div className="flex items-center justify-center p-20">
              <ParallaxLoader />
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEntities.map((entity) => (
                <EntityNode
                  key={entity.id}
                  entity={entity}
                  graphType={graphType}
                  relationships={relationships}
                  onSelect={() => handleSelectEntity(entity)}
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
                      ? "Query produced no matches. Adjust search parameters."
                      : "Knowledge base is empty."}
                  </p>
                </div>
              )}
            </div>
          ) : viewMode === "table" ? (
            <ComparativeTable
              concepts={filteredEntities as ParallaxConcept[]}
              relationships={relationships}
              onSelectConcept={(entity) => handleSelectEntity(entity)}
            />
          ) : (
            /* Graph view — parallax mode gets the TraditionLegend sidebar */
            <div className={`grid gap-6 ${isParallaxGraphView ? "grid-cols-1 lg:grid-cols-4" : "grid-cols-1"}`}>
              {/* Main Graph Canvas */}
              <div className={isParallaxGraphView ? "lg:col-span-3" : "col-span-1"}>
                <div className="h-[700px] bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
                  <GraphVisualization
                    concepts={filteredEntities as any}
                    relationships={relationships}
                    onSelectConcept={(entity: any) => handleSelectEntity(entity)}
                    minSimilarity={minSimilarity}
                  />
                </div>
              </div>

              {/* Parallax TraditionLegend sidebar */}
              {isParallaxGraphView && (
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900/50 border border-amber-900/20 rounded-2xl p-4 shadow-2xl h-fit">
                    <TraditionLegend
                      traditions={traditions}
                      concepts={entities as ParallaxConcept[]}
                      selectedTradition={selectedTradition}
                      onSelectTradition={setSelectedTradition}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Parallax Concept Detail Modal */}
        {selectedParallaxConcept && (
          <ConceptDetailModal
            concept={selectedParallaxConcept}
            relationships={relationships}
            concepts={entities as ParallaxConcept[]}
            onClose={() => setSelectedParallaxConcept(null)}
          />
        )}

        {/* Correspondence Entity Detail Modal */}
        {selectedCorrespondenceEntity && (
          <EntityDetailModal
            entity={selectedCorrespondenceEntity}
            graphType={graphType}
            onClose={() => setSelectedCorrespondenceEntity(null)}
            readOnly={true}
          />
        )}
      </main>

      {/* Floating AI Search (parallax mode only) */}
      {graphType === "parallax" && <FloatingAISearch defaultCollapsed={true} />}

      <Footer />
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<AppLoader fullScreen />}>
      <GraphPageContent />
    </Suspense>
  );
}
