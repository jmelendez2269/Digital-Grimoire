"use client";

import { useEffect, useRef } from "react";
import { Sigma } from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { buildGraphologyGraph, GraphEntity, GraphEdge } from "@/lib/graph/graphology-adapter";

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
            labelSize: 12,
            labelWeight: "400",
            labelColor: { color: "#e5e7eb" },
            // Only show labels for nodes above this rendered size during zoom-out
            labelRenderedSizeThreshold: 6,
            minCameraRatio: 0.05,
            maxCameraRatio: 10,
        });

        sigmaRef.current = renderer;

        // ── 4. Node hover — highlight neighbours ─────────────────────────────────
        let hoveredNode: string | null = null;

        renderer.on("enterNode", ({ node }) => {
            hoveredNode = node;
            renderer.setSetting("nodeReducer", (n, data) => {
                if (n === hoveredNode) return { ...data, highlighted: true, size: (data.size ?? 6) * 1.5 };
                if (graph.neighbors(hoveredNode!).includes(n)) return { ...data, highlighted: true };
                return { ...data, color: "#1f2937", label: "" };
            });
            renderer.setSetting("edgeReducer", (edge, data) => {
                if (graph.hasExtremity(edge, hoveredNode!)) {
                    return { ...data, color: "#b48f4a", size: (data.size ?? 1) * 2 };
                }
                return { ...data, hidden: true };
            });
        });

        renderer.on("leaveNode", () => {
            hoveredNode = null;
            renderer.setSetting("nodeReducer", null);
            renderer.setSetting("edgeReducer", null);
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

    if (entities.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[600px] text-amber-100/60">
                <div className="text-center">
                    <p className="text-lg mb-2">No concepts found</p>
                    <p className="text-sm">Try adjusting your filters or adding concepts to the database.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="sigma-graph-container w-full rounded-lg"
            style={{ height }}
        />
    );
}
