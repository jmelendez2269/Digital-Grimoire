"use client";

import { useEffect, useRef } from "react";
import { Sigma } from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { buildGraphologyGraph, GraphEntity, GraphEdge } from "@/lib/graph/graphology-adapter";

console.log("[GraphDebug] SigmaGraph.tsx module loaded");

// ─── Props ────────────────────────────────────────────────────────────────────

interface SigmaGraphProps {
    entities: GraphEntity[];
    edges: GraphEdge[];
    onSelectEntity: (entity: GraphEntity) => void;
    minSimilarity?: number;
    height?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SigmaGraph({
    entities,
    edges,
    onSelectEntity,
    minSimilarity = 0,
    height = 700,
}: SigmaGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);

    useEffect(() => {
        if (!containerRef.current || entities.length === 0) return;

        // ── 1. Build the graphology graph from raw API data ───────────────────────
        // The adapter already seeds random x/y positions
        const graph = buildGraphologyGraph(entities, edges, minSimilarity);

        // ── 2. Run ForceAtlas2 synchronously for a quick settle ───────────────────
        //    100 iterations gives a reasonably settled layout without blocking the UI.
        //    For very large graphs (1000+ nodes), barnesHutOptimize kicks in automatically.
        if (graph.order > 0) {
            forceAtlas2.assign(graph, {
                iterations: 100,
                settings: {
                    gravity: 0.05,
                    scalingRatio: 4,
                    strongGravityMode: false,
                    barnesHutOptimize: graph.order > 300,
                },
            });
        }

        // ── 3. Instantiate Sigma ──────────────────────────────────────────────────
        const renderer = new Sigma(graph, containerRef.current, {
            renderEdgeLabels: false,
            defaultEdgeColor: "#374151",
            defaultNodeColor: "#22D3EE",
            labelFont: "Inter, system-ui, sans-serif",
            labelSize: 13,
            labelWeight: "600",
            labelColor: { color: "#f3f4f6" },
            // Lower threshold for label rendering — we want to see them!
            labelRenderedSizeThreshold: 4,
            minCameraRatio: 0.1,
            maxCameraRatio: 8,
        });

        sigmaRef.current = renderer;

        // ── 4. Node hover — highlight neighbours ─────────────────────────────────
        let hoveredNode: string | null = null;
        let neighbors = new Set<string>();

        renderer.on("enterNode", ({ node }) => {
            hoveredNode = node;
            neighbors = new Set(graph.neighbors(node));

            renderer.refresh({
                skipIndexation: true,
            });

            renderer.setSetting("nodeReducer", (n, data) => {
                const isHovered = n === hoveredNode;
                const isNeighbor = neighbors.has(n);

                if (isHovered) {
                    return {
                        ...data,
                        zIndex: 10,
                        size: (data.size ?? 6) * 1.5,
                        // Brighten the color slightly on hover
                        color: "#fbbf24", // Amber glow for selection
                        label: data.label,
                        forceLabel: true
                    };
                }

                if (isNeighbor) {
                    return {
                        ...data,
                        zIndex: 5,
                        label: data.label,
                        forceLabel: true
                    };
                }

                // Dim non-neighbors
                return {
                    ...data,
                    color: "#1f2937",
                    label: "",
                    opacity: 0.2
                };
            });

            renderer.setSetting("edgeReducer", (edge, data) => {
                if (graph.hasExtremity(edge, node)) {
                    return {
                        ...data,
                        color: "#b48f4a",
                        size: (data.size ?? 1) * 2,
                        zIndex: 10
                    };
                }
                return { ...data, hidden: true, opacity: 0.1 };
            });
        });

        renderer.on("leaveNode", () => {
            hoveredNode = null;
            neighbors.clear();
            renderer.setSetting("nodeReducer", null);
            renderer.setSetting("edgeReducer", null);
            renderer.refresh();
        });

        // ── 5. Node click — fire callback ─────────────────────────────────────────
        renderer.on("clickNode", ({ node }) => {
            const attrs = graph.getNodeAttributes(node);
            if (attrs.originalData) {
                onSelectEntity(attrs.originalData as GraphEntity);
            }
        });

        // ── Cleanup ───────────────────────────────────────────────────────────────
        return () => {
            renderer.kill();
            sigmaRef.current = null;
        };
    }, [entities, edges, minSimilarity, onSelectEntity]);

    console.log("[GraphDebug] SigmaGraph rendering. entities:", entities.length);
    if (entities.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[600px] text-amber-100/60 transition-all duration-500 ease-in-out">
                <div className="text-center p-8 rounded-2xl border border-amber-900/20 bg-zinc-950/50 backdrop-blur-xl">
                    <p className="text-xl font-light mb-2 text-amber-200">No resonance detected</p>
                    <p className="text-sm max-w-xs mx-auto text-amber-100/40">Try adjusting your filters or expanding the search volume to find hidden connections.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group/graph overflow-hidden rounded-xl border border-white/5 bg-zinc-950">
            {/* Subtle premium background glow */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_var(--color-amber-900)_0%,_transparent_70%)]" />

            <div
                ref={containerRef}
                className="sigma-graph-container w-full relative z-10"
                style={{ height }}
            />

            {/* Hint overlay */}
            <div className="absolute bottom-4 left-4 z-20 flex gap-4 pointer-events-none opacity-0 group-hover/graph:opacity-100 transition-opacity duration-500">
                <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] uppercase tracking-wider text-amber-200/60">
                    Scroll to Zoom
                </div>
                <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] uppercase tracking-wider text-amber-200/60">
                    Drag to Pan
                </div>
            </div>
        </div>
    );
}
