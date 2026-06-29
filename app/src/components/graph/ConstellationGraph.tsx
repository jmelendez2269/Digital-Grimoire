"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { buildGraphologyGraph, GraphEntity, GraphEdge, GraphLayoutDensity } from "@/lib/graph/graphology-adapter";

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
  globalScale: number,
  isHovered: boolean,
  isNeighbor: boolean,
  hasActive: boolean,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const r = node.size ?? 4;
  const { r: cr, g: cg, b: cb } = hexToRgb(node.color);

  // Non-connected nodes disappear when something is active
  if (hasActive && !isHovered && !isNeighbor) return;

  ctx.save();

  if (isHovered) {
    // Outer corona
    const corona = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 5);
    corona.addColorStop(0, `rgba(${cr},${cg},${cb},0.30)`);
    corona.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.12)`);
    corona.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath();
    ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fillStyle = corona;
    ctx.fill();

    // Inner glow ring
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.55)`;
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();
  } else if (isNeighbor) {
    const halo = ctx.createRadialGradient(x, y, r, x, y, r * 3);
    halo.addColorStop(0, `rgba(${cr},${cg},${cb},0.20)`);
    halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();
  }

  // Core radial glow
  const alpha = isHovered ? 1 : isNeighbor ? 0.9 : 0.75;
  const core = ctx.createRadialGradient(x, y, 0, x, y, r * 1.5);
  core.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
  core.addColorStop(0.4, `rgba(${cr},${cg},${cb},${alpha})`);
  core.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();

  // Solid center pinpoint
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${isHovered ? 1 : 0.9})`;
  ctx.fill();

  // Labels only appear on interaction — at rest the graph reads as a pure
  // constellation of glowing dots. Labels reveal when you hover or zoom in
  // far enough that the node fills meaningful screen real-estate.
  const screenRadius = r * globalScale;
  const showLabel = isHovered || isNeighbor || (!hasActive && screenRadius >= 18);
  if (showLabel && node.label) {
    const px = isHovered ? 13 : 11;
    const fontSize = px / globalScale;
    const labelY = y + r * 1.6 + 4 / globalScale;

    ctx.font = `${isHovered ? "600" : "400"} ${fontSize}px Cinzel, 'Palatino Linotype', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Shadow pass
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur = 10 / globalScale;
    ctx.fillStyle = isHovered ? "#ffffff" : `rgba(${cr},${cg},${cb},0.92)`;
    ctx.fillText(node.label, x, labelY);

    // Glow pass
    ctx.shadowColor = isHovered ? `rgba(${cr},${cg},${cb},0.6)` : "rgba(0,0,0,0)";
    ctx.shadowBlur = isHovered ? 8 / globalScale : 0;
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
    if (!canvas || !width || !height) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = width;
    canvas.height = height;
    const stars = Array.from({ length: 140 }, () => ({
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

  // Refs for hover/selected so paint callbacks never go stale between renders
  const activeIdRef = useRef<string | null>(null);
  const neighborSetRef = useRef<Set<string>>(new Set());

  // Keep a local state copy just to trigger re-registration of callbacks
  // when the active node changes (fgRef.current?.refresh() isn't always enough)
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    obs.observe(el);
    setWidth(el.offsetWidth);
    return () => obs.disconnect();
  }, []);

  const { nodes, links, neighborMap } = useMemo(() => {
    if (entities.length === 0) return { nodes: [], links: [], neighborMap: new Map<string, Set<string>>() };

    const graph = buildGraphologyGraph(entities, edges, minSimilarity, layoutDensity);
    const fgNodes: FGNode[] = [];
    const fgLinks: FGLink[] = [];
    const nMap = new Map<string, Set<string>>();

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
        fx: layoutEngine === "clusters" ? x : undefined,
        fy: layoutEngine === "clusters" ? y : undefined,
        x,
        y,
      });
      nMap.set(nodeId, new Set());
    });

    graph.forEachEdge((_, attrs, source, target) => {
      fgLinks.push({
        source,
        target,
        color: attrs.color as string,
        width: (attrs.size as number) ?? 1.5,
        edgeType: attrs.edgeType as string,
      });
      nMap.get(source)?.add(target);
      nMap.get(target)?.add(source);
    });

    return { nodes: fgNodes, links: fgLinks, neighborMap: nMap };
  }, [entities, edges, minSimilarity, layoutDensity, layoutEngine]);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  // Stable paint callbacks — read from refs, never recreated on hover change
  const paintNode = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as FGNode;
      const aid = activeIdRef.current;
      const isHovered = n.id === aid;
      const isNeighbor = aid ? neighborSetRef.current.has(n.id) : false;
      drawGlowNode(ctx, n, globalScale, isHovered, isNeighbor, aid !== null);
    },
    [], // no deps — reads from refs
  );

  const paintLink = useCallback(
    (link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const l = link as FGLink;
      const aid = activeIdRef.current;
      if (!aid) return;

      const sourceId = typeof l.source === "string" ? l.source : (l.source as FGNode).id;
      const targetId = typeof l.target === "string" ? l.target : (l.target as FGNode).id;
      if (sourceId !== aid && targetId !== aid) return;

      const sourceNode = typeof l.source === "object" ? (l.source as FGNode) : null;
      const targetNode = typeof l.target === "object" ? (l.target as FGNode) : null;
      if (!sourceNode || !targetNode) return;

      const sx = sourceNode.x ?? 0;
      const sy = sourceNode.y ?? 0;
      const tx = targetNode.x ?? 0;
      const ty = targetNode.y ?? 0;

      const isDerived = l.edgeType === "shares_correspondence_with";
      const isAssociative = l.edgeType === "associated_with";
      const edgeColor = isDerived
        ? "rgba(94,234,212,0.9)"
        : isAssociative
          ? "rgba(96,165,250,0.85)"
          : "rgba(255,240,160,0.9)";

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = Math.max(l.width * 1.6, 2 / globalScale);
      ctx.shadowColor = edgeColor;
      ctx.shadowBlur = 6 / globalScale;
      ctx.stroke();
      ctx.restore();
    },
    [],
  );

  const handleNodeHover = useCallback(
    (node: NodeObject | null) => {
      const id = node ? (node as FGNode).id : null;
      activeIdRef.current = id;
      neighborSetRef.current = id ? (neighborMap.get(id) ?? new Set()) : new Set();
      setActiveId(id); // triggers re-render so ForceGraph picks up new paint callbacks
    },
    [neighborMap],
  );

  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const n = node as FGNode;
      onSelectEntity(n.originalData);
      if (fgRef.current) {
        fgRef.current.centerAt(n.x ?? 0, n.y ?? 0, 400);
        fgRef.current.zoom(3.5, 400);
      }
    },
    [onSelectEntity],
  );

  const handleBackgroundClick = useCallback(() => {
    activeIdRef.current = null;
    neighborSetRef.current = new Set();
    setActiveId(null);
    fgRef.current?.zoomToFit(400, 40);
  }, []);

  // Fit on first load — generous padding so nodes aren't flush with the edge
  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;
    const t = setTimeout(() => fgRef.current?.zoomToFit(800, 80), 350);
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

  // Suppress "activeId" lint warning — it's used only to trigger re-render
  void activeId;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden group/graph"
      style={{ borderRadius: 12, border: "1px solid rgba(120,80,20,0.25)", background: "#070503", height }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(60,30,5,0.35) 0%, rgba(10,5,2,0.15) 50%, transparent 80%)",
        }}
      />

      <StarField width={width} height={height} />

      {/* Corner markers */}
      {([0, 1, 2, 3] as const).map((i) => (
        <div
          key={i}
          className={`absolute pointer-events-none ${i < 2 ? "top-0" : "bottom-0"} ${i % 2 === 0 ? "left-0" : "right-0"}`}
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
          // Disable all built-in rendering — we own the canvas entirely
          nodeLabel=""
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => "replace"}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => "replace"}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          cooldownTicks={layoutEngine === "clusters" ? 0 : 120}
          d3AlphaDecay={layoutEngine === "organic" ? 0.03 : 1}
          d3VelocityDecay={0.4}
          nodeRelSize={1}
          enableZoomInteraction
          enablePanInteraction
          minZoom={0.05}
          maxZoom={14}
        />
      </div>

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
