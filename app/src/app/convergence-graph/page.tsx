"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ComparativeTable from "@/components/convergence/ComparativeTable";
import ConceptDetailModal from "@/components/convergence/ConceptDetailModal";
import SimilarityControls from "@/components/convergence/SimilarityControls";
import TraditionLegend from "@/components/convergence/TraditionLegend";

// Dynamically import ConvergenceGraph to avoid SSR issues with D3
const ConvergenceGraph = dynamic(
  () => import("@/components/convergence/ConvergenceGraph"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-amber-100/60">Loading convergence graph…</p>
        </div>
      </div>
    ),
  }
);

// Dynamically import FloatingAISearch
const FloatingAISearch = dynamic(() => import('@/components/FloatingAISearch'), {
  ssr: false,
  loading: () => null,
});

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

type ViewMode = "graph" | "table";

export default function ConvergenceGraphPage() {
  const [concepts, setConcepts] = useState<ConvergenceConcept[]>([]);
  const [relationships, setRelationships] = useState<ConvergenceRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<ConvergenceConcept | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [minSimilarity, setMinSimilarity] = useState(0);
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [conceptsRes, relationshipsRes] = await Promise.all([
          fetch("/api/concepts?limit=200"),
          fetch(`/api/concepts/relationships?limit=400&minSimilarity=${minSimilarity}`),
        ]);

        if (!conceptsRes.ok || !relationshipsRes.ok) {
          throw new Error("Failed to load convergence data");
        }

        const conceptsData = await conceptsRes.json();
        const relationshipsData = await relationshipsRes.json();

        setConcepts(conceptsData.items || []);
        setRelationships(relationshipsData.items || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load convergence graph data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [minSimilarity]);

  // Filter concepts based on tradition and search
  const filteredConcepts = concepts.filter((concept) => {
    if (selectedTradition && concept.tradition !== selectedTradition) return false;
    if (searchQuery && !concept.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Get unique traditions for filter
  const traditions = Array.from(new Set(concepts.map((c) => c.tradition))).sort();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50">
          <div className="max-w-screen-2xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-amber-100 mb-2">
                The Convergence Graph
              </h1>
              <p className="text-amber-100/60">
                See how all wisdom paths converge. Visualize cross-tradition conceptual unity
                showing how Buddhist emptiness connects to quantum zero-point fields, Taoist Wu,
                and Christian apophatic theology.
              </p>
            </div>

            {/* Controls */}
            <div className="mb-6 space-y-4">
              <SimilarityControls
                minSimilarity={minSimilarity}
                onSimilarityChange={setMinSimilarity}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTradition={selectedTradition}
                onTraditionChange={setSelectedTradition}
                traditions={traditions}
              />

              {/* View Mode Toggle */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-amber-100/60">View:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("graph")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "graph"
                        ? "bg-amber-600 text-white"
                        : "bg-zinc-800 text-amber-100/60 hover:bg-zinc-700"
                      }`}
                  >
                    Network Graph
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "table"
                        ? "bg-amber-600 text-white"
                        : "bg-zinc-800 text-amber-100/60 hover:bg-zinc-700"
                      }`}
                  >
                    Comparative Table
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-amber-100/60">Loading convergence data…</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-400">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content Area */}
                <div className={`${viewMode === "graph" ? "lg:col-span-3" : "lg:col-span-4"}`}>
                  <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
                    {viewMode === "graph" ? (
                      <ConvergenceGraph
                        concepts={filteredConcepts}
                        relationships={relationships}
                        onSelectConcept={setSelectedConcept}
                        minSimilarity={minSimilarity}
                      />
                    ) : (
                      <ComparativeTable
                        concepts={filteredConcepts}
                        relationships={relationships}
                        onSelectConcept={setSelectedConcept}
                      />
                    )}
                  </div>
                </div>

                {/* Sidebar - Only show in graph view */}
                {viewMode === "graph" && (
                  <div className="lg:col-span-1">
                    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4 space-y-4">
                      <TraditionLegend
                        traditions={traditions}
                        concepts={concepts}
                        selectedTradition={selectedTradition}
                        onSelectTradition={setSelectedTradition}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating AI Search */}
      <FloatingAISearch defaultCollapsed={true} />

      {/* Concept Detail Modal */}
      <ConceptDetailModal
        concept={selectedConcept}
        relationships={relationships}
        concepts={concepts}
        onClose={() => setSelectedConcept(null)}
      />

      <Footer />
    </div>
  );
}
