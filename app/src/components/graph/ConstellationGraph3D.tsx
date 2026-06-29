"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { ForceGraphMethods } from "react-force-graph-3d";
import { buildGraphologyGraph, GraphEntity, GraphEdge, GraphLayoutDensity } from "@/lib/graph/graphology-adapter";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

export type ConstellationLayoutEngine = "clusters" | "organic";

interface ConstellationGraph3DProps {
  entities: GraphEntity[];
  edges: GraphEdge[];
  onSelectEntity: (entity: GraphEntity) => void;
  minSimilarity?: number;
  height?: number;
  layoutDensity?: GraphLayoutDensity;
  layoutEngine?: ConstellationLayoutEngine;
}

interface FGNode3D {
  id: string;
  label: string;
  color: string;
  size: number;
  category?: string;
  originalData: GraphEntity;
  fx?: number;
  fy?: number;
  fz?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface FGLink3D {
  source: string | FGNode3D;
  target: string | FGNode3D;
  edgeType: string;
  linkColor: string;
}

// ---------- texture cache ----------
const glowTextureCache = new Map<string, THREE.CanvasTexture>();

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 200, g: 136, b: 42 };
}

function getGlowTexture(hexColor: string): THREE.CanvasTexture {
  const cached = glowTextureCache.get(hexColor);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const { r, g, b } = hexToRgb(hexColor);

  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,    "rgba(255,255,255,1)");
  grad.addColorStop(0.12, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.65)`);
  grad.addColorStop(0.65, `rgba(${r},${g},${b},0.18)`);
  grad.addColorStop(1,    "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  glowTextureCache.set(hexColor, texture);
  return texture;
}

function makeSprite(color: string, scale: number, opacity = 0.9): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending, // overlapping glows add together — no bloom pass needed
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

// Stable pseudo-random in [-0.5, 0.5]
function stableJitter(seed: number, salt: number) {
  const v = Math.sin((seed + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return (v - Math.floor(v)) - 0.5;
}

export default function ConstellationGraph3D({
  entities,
  edges,
  onSelectEntity,
  minSimilarity = 0,
  height = 700,
  layoutDensity = "expanded",
  layoutEngine = "clusters",
}: ConstellationGraph3DProps) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  // Ref-based hover state so nodeThreeObject / link callbacks never go stale
  const activeIdRef      = useRef<string | null>(null);
  const neighborSetRef   = useRef<Set<string>>(new Set());
  const spriteMapRef     = useRef<Map<string, THREE.Sprite>>(new Map());

  // Build graph data with Z dimension
  const { nodes, links, neighborMap } = useMemo(() => {
    if (entities.length === 0) return { nodes: [], links: [], neighborMap: new Map<string, Set<string>>() };

    const graph = buildGraphologyGraph(entities, edges, minSimilarity, layoutDensity);

    // Collect unique categories and assign each a Z band
    const categorySet = new Set<string>();
    graph.forEachNode((_, attrs) => {
      const cat = (attrs.originalData as GraphEntity)?.category ?? "other";
      categorySet.add(cat);
    });
    const categoryList = [...categorySet];
    const categoryZBase = new Map<string, number>();
    categoryList.forEach((cat, i) => {
      if (cat === "issue_intention_power") {
        categoryZBase.set(cat, 0);
        return;
      }
      // Helix pattern — categories spiral in Z so no two big clusters share a plane
      const t = i / Math.max(categoryList.length - 1, 1);
      categoryZBase.set(cat, Math.sin(t * Math.PI * 2.5) * 280);
    });

    const fgNodes: FGNode3D[] = [];
    const fgLinks: FGLink3D[] = [];
    const nMap = new Map<string, Set<string>>();
    const categoryNodeIndex = new Map<string, number>();

    graph.forEachNode((nodeId) => {
      const attrs  = graph.getNodeAttributes(nodeId);
      const entity = attrs.originalData as GraphEntity;
      const cat    = entity?.category ?? "other";
      const idx    = categoryNodeIndex.get(cat) ?? 0;
      categoryNodeIndex.set(cat, idx + 1);

      const x  = (attrs.x as number) ?? 0;
      const y  = (attrs.y as number) ?? 0;
      const zBase   = categoryZBase.get(cat) ?? 0;
      const zJitter = stableJitter(idx, 7) * 120;
      const z  = zBase + zJitter;

      fgNodes.push({
        id:           nodeId,
        label:        attrs.label as string,
        color:        attrs.color as string,
        size:         Math.max((attrs.size as number) ?? 4, 3),
        category:     cat,
        originalData: entity,
        fx: layoutEngine === "clusters" ? x  : undefined,
        fy: layoutEngine === "clusters" ? y  : undefined,
        fz: layoutEngine === "clusters" ? z  : undefined,
        x, y, z,
      });
      nMap.set(nodeId, new Set());
    });

    graph.forEachEdge((_, attrs, source, target) => {
      const edgeType = (attrs.edgeType as string) ?? "corresponds_to";
      const linkColor =
        edgeType === "shares_correspondence_with" ? "#5eead4"
        : edgeType === "associated_with"          ? "#60a5fa"
        :                                           "#fef08a";
      fgLinks.push({ source, target, edgeType, linkColor });
      nMap.get(source)?.add(target);
      nMap.get(target)?.add(source);
    });

    return { nodes: fgNodes, links: fgLinks, neighborMap: nMap };
  }, [entities, edges, minSimilarity, layoutDensity, layoutEngine]);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  // Create / cache a Sprite per node; update existing ones on hover
  const nodeThreeObject = useCallback((rawNode: object) => {
    const node   = rawNode as FGNode3D;
    const scale  = node.size * 2.2;
    const sprite = makeSprite(node.color, scale);
    spriteMapRef.current.set(node.id, sprite);
    return sprite;
  }, []);

  const updateSpriteAppearance = useCallback((id: string | null, isActive: boolean) => {
    if (!id) return;
    const sprite = spriteMapRef.current.get(id);
    if (!sprite) return;
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const baseScale = node.size * 2.2;
    if (isActive) {
      sprite.scale.set(baseScale * 2.2, baseScale * 2.2, 1);
      (sprite.material as THREE.SpriteMaterial).opacity = 1;
    } else {
      sprite.scale.set(baseScale, baseScale, 1);
      (sprite.material as THREE.SpriteMaterial).opacity = 0.9;
    }
  }, [nodes]);

  const updateNeighborAppearance = useCallback((neighborSet: Set<string>, highlight: boolean) => {
    neighborSet.forEach(nid => {
      const sprite = spriteMapRef.current.get(nid);
      const node   = nodes.find(n => n.id === nid);
      if (!sprite || !node) return;
      const baseScale = node.size * 2.2;
      sprite.scale.set(
        baseScale * (highlight ? 1.5 : 1),
        baseScale * (highlight ? 1.5 : 1),
        1,
      );
      (sprite.material as THREE.SpriteMaterial).opacity = highlight ? 1 : 0.9;
    });
    // Hide / show non-involved nodes
    spriteMapRef.current.forEach((sprite, nid) => {
      if (!highlight) {
        (sprite.material as THREE.SpriteMaterial).opacity = 0.9;
        return;
      }
      const aid = activeIdRef.current;
      if (nid === aid || neighborSet.has(nid)) return;
      (sprite.material as THREE.SpriteMaterial).opacity = 0;
    });
  }, [nodes]);

  const handleNodeHover = useCallback((rawNode: object | null) => {
    const prevId = activeIdRef.current;
    const prevNeighbors = neighborSetRef.current;

    // Restore previous
    if (prevId) updateSpriteAppearance(prevId, false);
    updateNeighborAppearance(prevNeighbors, false);

    const node = rawNode as FGNode3D | null;
    const newId = node?.id ?? null;
    const newNeighbors = newId ? (neighborMap.get(newId) ?? new Set<string>()) : new Set<string>();

    activeIdRef.current    = newId;
    neighborSetRef.current = newNeighbors;

    if (newId) updateSpriteAppearance(newId, true);
    updateNeighborAppearance(newNeighbors, newId !== null);
  }, [neighborMap, updateSpriteAppearance, updateNeighborAppearance]);

  const handleNodeClick = useCallback((rawNode: object) => {
    const node = rawNode as FGNode3D;
    onSelectEntity(node.originalData);

    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const z = node.z ?? 0;
    // Fly camera to the node
    const dist = 120;
    fgRef.current?.cameraPosition(
      { x: x + dist * 0.6, y: y + dist * 0.4, z: z + dist },
      { x, y, z },
      900,
    );
  }, [onSelectEntity]);

  // Fit camera on load
  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;
    const t = setTimeout(() => {
      fgRef.current?.zoomToFit(800, 100);
    }, 500);
    return () => clearTimeout(t);
  }, [nodes]);

  // Edge color / particle functions — read from ref so they stay stable
  const getLinkColor = useCallback((rawLink: object) => {
    const l = rawLink as FGLink3D;
    const aid = activeIdRef.current;
    if (!aid) return "rgba(180,130,40,0.08)";
    const sid = typeof l.source === "string" ? l.source : (l.source as FGNode3D).id;
    const tid = typeof l.target === "string" ? l.target : (l.target as FGNode3D).id;
    if (sid !== aid && tid !== aid) return "rgba(0,0,0,0)";
    return l.linkColor;
  }, []);

  const getLinkWidth = useCallback((rawLink: object) => {
    const l = rawLink as FGLink3D;
    const aid = activeIdRef.current;
    if (!aid) return 0.3;
    const sid = typeof l.source === "string" ? l.source : (l.source as FGNode3D).id;
    const tid = typeof l.target === "string" ? l.target : (l.target as FGNode3D).id;
    return sid === aid || tid === aid ? 1.8 : 0;
  }, []);

  const getLinkParticles = useCallback((rawLink: object) => {
    const l = rawLink as FGLink3D;
    const aid = activeIdRef.current;
    if (!aid) return 0;
    const sid = typeof l.source === "string" ? l.source : (l.source as FGNode3D).id;
    const tid = typeof l.target === "string" ? l.target : (l.target as FGNode3D).id;
    return sid === aid || tid === aid ? 4 : 0;
  }, []);

  const getLinkParticleColor = useCallback((rawLink: object) => {
    return (rawLink as FGLink3D).linkColor;
  }, []);

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
      className="relative overflow-hidden"
      style={{ borderRadius: 12, border: "1px solid rgba(120,80,20,0.25)", background: "#070503", height }}
    >
      {/* Corner markers */}
      {([0, 1, 2, 3] as const).map((i) => (
        <div
          key={i}
          className={`absolute pointer-events-none ${i < 2 ? "top-0" : "bottom-0"} ${i % 2 === 0 ? "left-0" : "right-0"}`}
          style={{
            width: 18, height: 18, margin: 8,
            borderTop:    i < 2  ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderBottom: i >= 2 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderLeft:   i % 2 === 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderRight:  i % 2 !== 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
          }}
        />
      ))}

      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={undefined}
        height={height}
        backgroundColor="#070503"
        showNavInfo={false}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        nodeLabel=""
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkOpacity={1}
        linkDirectionalParticles={getLinkParticles}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleColor={getLinkParticleColor}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        cooldownTicks={layoutEngine === "clusters" ? 0 : 180}
        d3AlphaDecay={layoutEngine === "organic" ? 0.02 : 1}
        d3VelocityDecay={0.35}
        enableNodeDrag={false}
        enableNavigationControls
      />

      {/* Hint bar */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex gap-2">
        {["Drag / Orbit", "Scroll / Zoom", "Click / Open"].map((hint) => (
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
