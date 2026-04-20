"use client";

import { useEffect, useRef, useState } from "react";
import { Sigma } from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type Graph from "graphology";
import { buildGraphologyGraph, GraphEntity, GraphEdge } from "@/lib/graph/graphology-adapter";

interface SigmaGraphProps {
    entities: GraphEntity[];
    edges: GraphEdge[];
    onSelectEntity: (entity: GraphEntity) => void;
    minSimilarity?: number;
    height?: number;
}

const GRAPH_PADDING = 160;
const MIN_WORLD_SIZE = 1200;

function getGraphBounds(graph: Graph) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    graph.forEachNode((node) => {
        const attrs = graph.getNodeAttributes(node);
        const size = typeof attrs.size === "number" ? attrs.size : 0;
        const x = typeof attrs.x === "number" ? attrs.x : 0;
        const y = typeof attrs.y === "number" ? attrs.y : 0;
        minX = Math.min(minX, x - size);
        minY = Math.min(minY, y - size);
        maxX = Math.max(maxX, x + size);
        maxY = Math.max(maxY, y + size);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return { minX: -MIN_WORLD_SIZE / 2, minY: -MIN_WORLD_SIZE / 2, maxX: MIN_WORLD_SIZE / 2, maxY: MIN_WORLD_SIZE / 2 };
    }
    return { minX, minY, maxX, maxY };
}

function spreadGraph(graph: Graph) {
    const bounds = getGraphBounds(graph);
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const height = Math.max(bounds.maxY - bounds.minY, 1);
    const diameter = Math.max(MIN_WORLD_SIZE, Math.sqrt(graph.order || 1) * 420);
    const scale = diameter / Math.max(width, height);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    graph.updateEachNodeAttributes((_, attrs) => ({
        ...attrs,
        x: ((attrs.x as number) - centerX) * scale,
        y: ((attrs.y as number) - centerY) * scale,
    }));
}

function fitCameraToGraph(renderer: Sigma, graph: Graph) {
    const container = renderer.getContainer();
    const bounds = getGraphBounds(graph);
    const availableWidth = Math.max(container.clientWidth - GRAPH_PADDING * 2, 1);
    const availableHeight = Math.max(container.clientHeight - GRAPH_PADDING * 2, 1);
    const graphWidth = Math.max(bounds.maxX - bounds.minX, 1);
    const graphHeight = Math.max(bounds.maxY - bounds.minY, 1);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const ratio = Math.max(graphWidth / availableWidth, graphHeight / availableHeight, 0.01);

    renderer.getCamera().setState({ x: centerX, y: centerY, ratio, angle: 0 });
}

// Custom label renderer — clean text below each node, no white background box
function drawNodeLabel(
    context: CanvasRenderingContext2D,
    data: { x: number; y: number; size: number; label?: string; color?: string; hidden?: boolean },
    settings: { labelFont?: string; labelSize?: number; labelWeight?: string; labelColor?: { color?: string } }
): void {
    if (!data.label || data.hidden) return;

    const size = settings.labelSize ?? 11;
    const font = settings.labelFont ?? "Cinzel, 'Palatino Linotype', serif";
    const weight = settings.labelWeight ?? "400";
    const color = settings.labelColor?.color ?? "#d4b483";

    context.save();
    context.font = `${weight} ${size}px ${font}`;
    context.textAlign = "center";
    context.textBaseline = "top";

    const x = data.x;
    const y = data.y + data.size + 4;

    // Subtle dark halo so text is legible against any node/background
    context.shadowColor = "rgba(0, 0, 0, 0.95)";
    context.shadowBlur = 8;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.fillStyle = color;
    context.fillText(data.label, x, y);

    // Second pass at 0 shadow for crispness on top
    context.shadowBlur = 0;
    context.fillStyle = color;
    context.fillText(data.label, x, y);

    context.restore();
}

// ─── Star field canvas overlay ────────────────────────────────────────────────
function StarField({ height }: { height: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Scatter tiny ambient stars
        const stars = Array.from({ length: 80 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 0.8 + 0.2,
            a: Math.random() * 0.4 + 0.1,
        }));

        stars.forEach(({ x, y, r, a }) => {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 190, 130, ${a})`;
            ctx.fill();
        });
    }, [height]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ height }}
        />
    );
}

export default function SigmaGraph({
    entities,
    edges,
    onSelectEntity,
    minSimilarity = 0,
    height = 700,
}: SigmaGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const [hoveredSummary, setHoveredSummary] = useState<{ name: string; connections: number } | null>(null);

    useEffect(() => {
        if (!containerRef.current || entities.length === 0) return;

        const graph = buildGraphologyGraph(entities, edges, minSimilarity);

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
            spreadGraph(graph);
        }

        const renderer = new Sigma(graph, containerRef.current, {
            renderEdgeLabels: false,
            defaultEdgeColor: "#2d1c08",
            defaultNodeColor: "#c8882a",
            labelFont: "Cinzel, 'Palatino Linotype', serif",
            labelSize: 11,
            labelWeight: "400",
            labelColor: { color: "#d4b483" },
            labelRenderedSizeThreshold: 5,
            minCameraRatio: 0.02,
            maxCameraRatio: 20,
            // @ts-expect-error — Sigma v3 accepts custom draw functions here
            defaultDrawNodeLabel: drawNodeLabel,
            // @ts-expect-error — override hover label renderer to eliminate white background box
            defaultDrawNodeHover: drawNodeLabel,
        });

        sigmaRef.current = renderer;
        fitCameraToGraph(renderer, graph);

        const resizeObserver = new ResizeObserver(() => fitCameraToGraph(renderer, graph));
        resizeObserver.observe(containerRef.current);

        let hoveredNode: string | null = null;
        let neighbors = new Set<string>();

        renderer.on("enterNode", ({ node }) => {
            hoveredNode = node;
            neighbors = new Set(graph.neighbors(node));
            const attrs = graph.getNodeAttributes(node);
            setHoveredSummary({
                name: typeof attrs.label === "string" ? attrs.label : "Unknown",
                connections: neighbors.size,
            });

            renderer.setSetting("nodeReducer", (n, data) => {
                if (n === hoveredNode) {
                    return {
                        ...data,
                        zIndex: 10,
                        size: (data.size ?? 6) * 2,
                        color: "#f5e6b0",
                        // Suppress Sigma label — the HTML tooltip card shows the name
                        label: "",
                        forceLabel: false,
                    };
                }
                if (neighbors.has(n)) {
                    return {
                        ...data,
                        zIndex: 5,
                        size: (data.size ?? 6) * 1.15,
                        color: data.color ?? "#c8882a",
                        forceLabel: true,
                    };
                }
                return { ...data, color: "#110c06", label: "", forceLabel: false };
            });

            renderer.setSetting("edgeReducer", (edge, data) => {
                if (graph.hasExtremity(edge, node)) {
                    return { ...data, color: "#c8a050", size: 1.5, zIndex: 10 };
                }
                return { ...data, hidden: true };
            });
        });

        renderer.on("leaveNode", () => {
            hoveredNode = null;
            neighbors.clear();
            setHoveredSummary(null);
            renderer.setSetting("nodeReducer", null);
            renderer.setSetting("edgeReducer", null);
            renderer.refresh();
        });

        renderer.on("clickNode", ({ node }) => {
            const attrs = graph.getNodeAttributes(node);
            if (attrs.originalData) {
                onSelectEntity(attrs.originalData as GraphEntity);
            }
        });

        return () => {
            resizeObserver.disconnect();
            renderer.kill();
            sigmaRef.current = null;
        };
    }, [entities, edges, minSimilarity, onSelectEntity]);

    if (entities.length === 0) {
        return (
            <div
                className="flex items-center justify-center transition-all duration-500"
                style={{ minHeight: 600, background: "#060402", borderRadius: 12, border: "1px solid rgba(120,80,20,0.2)" }}
            >
                <div className="text-center p-10" style={{ maxWidth: 360 }}>
                    {/* Alchemical sigil placeholder */}
                    <div className="mx-auto mb-6" style={{ width: 56, height: 56, position: "relative" }}>
                        <div style={{
                            position: "absolute", inset: 0, borderRadius: "50%",
                            border: "1px solid rgba(180,130,40,0.3)",
                        }} />
                        <div style={{
                            position: "absolute", inset: 10, borderRadius: "50%",
                            border: "1px solid rgba(180,130,40,0.15)",
                        }} />
                        <div style={{
                            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                            width: 1, height: 36, background: "rgba(180,130,40,0.25)",
                        }} />
                        <div style={{
                            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(90deg)",
                            width: 1, height: 36, background: "rgba(180,130,40,0.25)",
                        }} />
                    </div>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: "#c8a060", marginBottom: 8, letterSpacing: "0.12em" }}>
                        No Resonance Detected
                    </p>
                    <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "rgba(180,130,40,0.4)", lineHeight: 1.7, fontStyle: "italic" }}>
                        Adjust your filters or expand the search volume to reveal hidden correspondences.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative group/graph overflow-hidden"
            style={{
                borderRadius: 12,
                border: "1px solid rgba(120,80,20,0.25)",
                background: "#070503",
            }}
        >
            {/* Deep ambient glow at canvas center */}
            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(100,55,10,0.22) 0%, rgba(40,20,5,0.10) 45%, transparent 75%)",
                }}
            />

            {/* Ambient star field */}
            <StarField height={height} />

            {/* Corner bracket ornaments */}
            {(["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((pos, i) => (
                <div
                    key={i}
                    className={`absolute ${pos} pointer-events-none z-10`}
                    style={{
                        width: 18, height: 18,
                        borderTop: i < 2 ? "1px solid rgba(160,110,30,0.35)" : "none",
                        borderBottom: i >= 2 ? "1px solid rgba(160,110,30,0.35)" : "none",
                        borderLeft: i % 2 === 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
                        borderRight: i % 2 !== 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
                        margin: 8,
                    }}
                />
            ))}

            {/* Sigma canvas */}
            <div
                ref={containerRef}
                className="w-full relative z-20"
                style={{ height }}
            />

            {/* Node hover strip — left-anchored, no hard box */}
            {hoveredSummary && (
                <div
                    className="absolute top-5 left-0 z-30 pointer-events-none"
                    style={{ display: "flex", alignItems: "stretch" }}
                >
                    {/* Gold accent line */}
                    <div style={{
                        width: 2,
                        background: "linear-gradient(to bottom, transparent, rgba(200,160,60,0.8) 20%, rgba(200,160,60,0.8) 80%, transparent)",
                        flexShrink: 0,
                    }} />
                    {/* Text content */}
                    <div style={{
                        padding: "10px 16px 10px 14px",
                        background: "linear-gradient(to right, rgba(6,4,2,0.82), rgba(6,4,2,0))",
                        backdropFilter: "blur(10px)",
                    }}>
                        <p style={{
                            fontFamily: "Cinzel, serif",
                            fontSize: 8,
                            letterSpacing: "0.36em",
                            color: "rgba(160,110,30,0.7)",
                            textTransform: "uppercase",
                            marginBottom: 5,
                            whiteSpace: "nowrap",
                        }}>
                            Correspondence
                        </p>
                        <p style={{
                            fontFamily: "Cinzel, serif",
                            fontSize: 17,
                            color: "#e8d090",
                            fontWeight: 400,
                            whiteSpace: "nowrap",
                            lineHeight: 1.2,
                        }}>
                            {hoveredSummary.name}
                        </p>
                        <p style={{
                            fontFamily: "Georgia, serif",
                            fontSize: 11,
                            color: "rgba(160,120,50,0.55)",
                            marginTop: 4,
                            fontStyle: "italic",
                            whiteSpace: "nowrap",
                        }}>
                            {hoveredSummary.connections}{" "}
                            {hoveredSummary.connections === 1 ? "direct correspondence" : "direct correspondences"}
                        </p>
                    </div>
                </div>
            )}

            {/* Interaction hints */}
            <div className="absolute bottom-4 right-4 z-20 flex gap-2 pointer-events-none opacity-0 group-hover/graph:opacity-100 transition-opacity duration-700">
                {["Scroll · Zoom", "Drag · Pan", "Click · Open"].map((hint) => (
                    <div
                        key={hint}
                        style={{
                            background: "rgba(6,4,2,0.6)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(120,80,20,0.2)",
                            borderRadius: 2,
                            padding: "3px 10px",
                            fontFamily: "'Cinzel', serif",
                            fontSize: 9,
                            letterSpacing: "0.2em",
                            color: "rgba(180,130,50,0.5)",
                        }}
                    >
                        {hint}
                    </div>
                ))}
            </div>
        </div>
    );
}
