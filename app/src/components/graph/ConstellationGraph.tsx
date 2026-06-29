"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { buildGraphologyGraph, GraphEntity, GraphEdge, GraphLayoutDensity } from "@/lib/graph/graphology-adapter";

// Loaded client-side only — the lib references window
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export type ConstellationLayoutEngine = "clusters" | "organic";

interface ConstellationGraphProps {
  entities: GraphEntity[];
  edges: GraphEdge[];
  onSelectEntity: (entity: GraphEntity) => void;
  minSimilarity?: number;
  height?: number;
  layoutDensity?: GraphLayoutDensity;
  layoutEngine?: ConstellationLayoutEngine;
}

interface FGNode extends NodeObject {
  id: string;
  label: string;
  color: string;
  size: number;
  category?: string;
  originalData: GraphEntity;
  // pre-computed cluster positions
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
}

interface FGLink extends LinkObject {
  source: string | FGNode;
  target: string | FGNode;
  color: string;
  width: number;
  edgeType: string;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 200, g: 136, b: 42 };
}

function drawGlowNode(
  ctx: CanvasRenderingContext2D,
  node: FGNode,
  isHovered: boolean,
  isNeighbor: boolean,
  hasActive: boolean,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const r = node.size ?? 4;
  const { r: cr, g: cg, b: cb } = hexToRgb(node.color);

  if (hasActive && !isHovered && !isNeighbor) return; // hidden

  ctx.save();

  if (isHovered) {
    // Outer corona
    const corona = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4.5);
    corona.addColorStop(0, `rgba(${cr},${cg},${cb},0.28)`);
    corona.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.10)`);
    corona.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath();
    ctx.arc(x, y, r * 4.5, 0, Math.PI * 2);
    ctx.fillStyle = corona;
    ctx.fill();

    // Inner glow ring
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (isNeighbor) {
    // Soft halo for neighbors
    const halo = ctx.createRadialGradient(x, y, r, x, y, r * 3);
    halo.addColorStop(0, `rgba(${cr},${cg},${cb},0.18)`);
    halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();
  }

  // Core glow (all visible nodes)
  const core = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
  const alpha = isHovered ? 1 : isNeighbor ? 0.9 : 0.75;
  core.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
  core.addColorStop(0.35, `rgba(${cr},${cg},${cb},${alpha})`);
  core.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();

  // Solid center
  ctx.beginPath();
  ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${isHovered ? 1 : 0.85})`;
  ctx.fill();

  // Label — shown for hovered node, its neighbors, or large-degree anchors at rest
  const showLabel = isHovered || isNeighbor || (!hasActive && r >= 8);
  if (showLabel && node.label) {
    const labelY = y + r * 1.8 + 4;
    const fontSize = isHovered ? 13 : 10;
    ctx.font = `${isHovered ? "600" : "400"} ${fontSize}px Cinzel, 'Palatino Linotype', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Glow shadow
    ctx.shadowColor = isHovered ? `rgba(${cr},${cg},${cb},0.7)` : "rgba(0,0,0,0.9)";
    ctx.shadowBlur = isHovered ? 12 : 8;
    ctx.fillStyle = isHovered ? "#ffffff" : `rgba(${cr},${cg},${cb},0.9)`;
    ctx.fillText(node.label, x, labelY);

    // Crisp pass
    ctx.shadowBlur = 0;
    ctx.fillText(node.label, x, labelY);
  }

  ctx.restore();
}

function StarField({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = width;
    canvas.height = height;
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 0.9 + 0.15,
      a: Math.random() * 0.35 + 0.05,
    }));
    stars.forEach(({ x, y, r, a }) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 190, 130, ${a})`;
      ctx.fill();
    });
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
}

export default function ConstellationGraph({
  entities,
  edges,
  onSelectEntity,
  minSimilarity = 0,
  height = 700,
  layoutDensity = "expanded",
  layoutEngine = "clusters",
}: ConstellationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [width, setWidth] = useState(900);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    obs.observe(el);
    setWidth(el.offsetWidth);
    return () => obs.disconnect();
  }, []);

  // Build positions from graphology adapter (same cluster layout)
  const { nodes, links, neighborMap } = useMemo(() => {
    if (entities.length === 0) return { nodes: [], links: [], neighborMap: new Map<string, Set<string>>() };

    const graph = buildGraphologyGraph(entities, edges, minSimilarity, layoutDensity);
    const fgNodes: FGNode[] = [];
    const fgLinks: FGLink[] = [];
    const neighborMap = new Map<string, Set<string>>();

    graph.forEachNode((nodeId) => {
      const attrs = graph.getNodeAttributes(nodeId);
      const x = (attrs.x as number) ?? 0;
      const y = (attrs.y as number) ?? 0;
      fgNodes.push({
        id: nodeId,
        label: attrs.label as string,
        color: attrs.color as string,
        size: Math.max((attrs.size as number) ?? 4, 3),
        category: (attrs.originalData as GraphEntity)?.category ?? undefined,
        originalData: attrs.originalData as GraphEntity,
        // Pin positions for cluster mode; unpin for organic
        fx: layoutEngine === "clusters" ? x : undefined,
        fy: layoutEngine === "clusters" ? y : undefined,
        x,
        y,
      });
      neighborMap.set(nodeId, new Set());
    });

    graph.forEachEdge((_, attrs, source, target) => {
      fgLinks.push({
        source,
        target,
        color: attrs.color as string,
        width: attrs.size as number,
        edgeType: attrs.edgeType as string,
      });
      neighborMap.get(source)?.add(target);
      neighborMap.get(target)?.add(source);
    });

    return { nodes: fgNodes, links: fgLinks, neighborMap };
  }, [entities, edges, minSimilarity, layoutDensity, layoutEngine]);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  const activeId = hoveredId ?? selectedId;
  const activeNeighbors = activeId ? (neighborMap.get(activeId) ?? new Set<string>()) : new Set<string>();

  const paintNode = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D) => {
      const n = node as FGNode;
      const isHovered = n.id === activeId;
      const isNeighbor = activeId ? activeNeighbors.has(n.id) : false;
      drawGlowNode(ctx, n, isHovered, isNeighbor, activeId !== null);
    },
    [activeId, activeNeighbors],
  );

  const paintLink = useCallback(
    (link: LinkObject, ctx: CanvasRenderingContext2D) => {
      const l = link as FGLink;
      const sourceId = typeof l.source === "string" ? l.source : (l.source as FGNode).id;
      const targetId = typeof l.target === "string" ? l.target : (l.target as FGNode).id;
      const isActive = activeId && (sourceId === activeId || targetId === activeId);
      if (!isActive) return; // don't draw at rest

      const sourceNode = typeof l.source === "object" ? l.source as FGNode : null;
      const targetNode = typeof l.target === "object" ? l.target as FGNode : null;
      if (!sourceNode || !targetNode) return;

      const sx = sourceNode.x ?? 0;
      const sy = sourceNode.y ?? 0;
      const tx = targetNode.x ?? 0;
      const ty = targetNode.y ?? 0;

      const isDerived = l.edgeType === "shares_correspondence_with";
      const isAssociative = l.edgeType === "associated_with";
      const edgeColor = isDerived
        ? "rgba(94, 234, 212, 0.9)"
        : isAssociative
          ? "rgba(96, 165, 250, 0.8)"
          : "rgba(255, 240, 160, 0.85)";

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = Math.max(l.width * 1.5, 2);
      ctx.shadowColor = edgeColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    },
    [activeId],
  );

  const handleNodeHover = useCallback((node: NodeObject | null) => {
    setHoveredId(node ? (node as FGNode).id : null);
  }, []);

  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const n = node as FGNode;
      setSelectedId((prev) => (prev === n.id ? null : n.id));
      onSelectEntity(n.originalData);
      // Zoom toward clicked node
      if (fgRef.current) {
        fgRef.current.centerAt(n.x ?? 0, n.y ?? 0, 400);
        fgRef.current.zoom(3.5, 400);
      }
    },
    [onSelectEntity],
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedId(null);
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 40);
    }
  }, []);

  // Fit to view on load
  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;
    const t = setTimeout(() => fgRef.current?.zoomToFit(600, 40), 300);
    return () => clearTimeout(t);
  }, [nodes]);

  if (entities.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height, background: "#070503", borderRadius: 12, border: "1px solid rgba(120,80,20,0.2)" }}
      >
        <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, color: "#c8a060", letterSpacing: "0.12em" }}>
          No Resonance Detected
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ borderRadius: 12, border: "1px solid rgba(120,80,20,0.25)", background: "#070503", height }}
    >
      {/* Deep space gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(60,30,5,0.35) 0%, rgba(10,5,2,0.15) 50%, transparent 80%)",
        }}
      />

      <StarField width={width} height={height} />

      {/* Corner markers */}
      {(["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} pointer-events-none`}
          style={{
            width: 18, height: 18, margin: 8,
            borderTop: i < 2 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderBottom: i >= 2 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderLeft: i % 2 === 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderRight: i % 2 !== 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
          }}
        />
      ))}

      <div className="relative z-10" style={{ height }}>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={width}
          height={height}
          backgroundColor="transparent"
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => "replace"}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => "replace"}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          // In cluster mode pins hold positions; in organic the sim runs
          cooldownTicks={layoutEngine === "clusters" ? 0 : 120}
          d3AlphaDecay={layoutEngine === "organic" ? 0.03 : 1}
          d3VelocityDecay={0.4}
          nodeRelSize={1}
          enableZoomInteraction
          enablePanInteraction
          minZoom={0.1}
          maxZoom={12}
        />
      </div>

      {/* Hint bar */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex gap-2 opacity-0 transition-opacity duration-700 group-hover/graph:opacity-100">
        {["Scroll / Zoom", "Drag / Pan", "Click / Open"].map((hint) => (
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
