"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GraphView from "@/components/graph/GraphView";
import EntityDetails from "@/components/graph/EntityDetails";

// Dynamically import FloatingAISearch
const FloatingAISearch = dynamic(() => import('@/components/FloatingAISearch'), {
  ssr: false,
  loading: () => null,
});

interface Entity {
  id: string;
  slug?: string;
  name: string;
  category: string;
  aliases?: string[];
  description?: string;
  lenses?: string[];
}

interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
  confidence: string;
}

export default function GraphPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Entity | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [entRes, edgeRes] = await Promise.all([
          fetch("/api/graph/entities?limit=200"),
          fetch("/api/graph/edges?limit=400&minWeight=0"),
        ]);

        // Check if responses are successful
        if (!entRes.ok) {
          const errorData = await entRes.json().catch(() => ({ error: entRes.statusText }));
          throw new Error(errorData.error || `Failed to load entities: ${entRes.status} ${entRes.statusText}`);
        }

        if (!edgeRes.ok) {
          const errorData = await edgeRes.json().catch(() => ({ error: edgeRes.statusText }));
          throw new Error(errorData.error || `Failed to load edges: ${edgeRes.status} ${edgeRes.statusText}`);
        }

        const entJson = await entRes.json();
        const edgeJson = await edgeRes.json();
        setEntities(entJson.items || []);
        setEdges(edgeJson.items || []);
      } catch (e: any) {
        console.error("Error loading graph data:", e);
        setError(e?.message || "Failed to load graph data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-zinc-950 text-amber-50">
          <div className="max-w-screen-2xl mx-auto px-4 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-amber-100">Knowledge Graph</h1>
              <p className="text-amber-100/60">Explore correspondences and conceptual connections.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-amber-100/60">Loading graph…</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 border-4 border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Knowledge Graph</h2>
                  <p className="text-red-300/80 mb-6">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-3">
                    <GraphView
                      entities={entities}
                      edges={edges}
                      onSelectEntity={(e) => setSelected(e)}
                    />
                  </div>
                </div>
                <div>
                  <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
                    <EntityDetails entity={selected} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Floating AI Search */}
      <FloatingAISearch defaultCollapsed={true} />
      
      <Footer />
    </div>
  );
}
