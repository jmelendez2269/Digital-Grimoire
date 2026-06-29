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
  degree: number;
  isAnchor: boolean;
  category?: string;
  originalData: GraphEntity;
  fx?: number; fy?: number; fz?: number;
  x?: number;  y?: number;  z?: number;
}

interface FGLink3D {
  source: string | FGNode3D;
  target: string | FGNode3D;
  edgeType: string;
  linkColor: string;
}

// ─── texture helpers ────────────────────────────────────────────────────────

const glowCache = new Map<string, THREE.CanvasTexture>();

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 200, g: 136, b: 42 };
}

function getGlowTexture(hex: string): THREE.CanvasTexture {
  if (glowCache.has(hex)) return glowCache.get(hex)!;
  const { r, g, b } = hexToRgb(hex);
  const sz = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = sz;
  const ctx = canvas.getContext("2d")!;
  const c = sz / 2;

  // Tight star glow: bright pinpoint centre, fast falloff, faint outer halo
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,    "rgba(255,255,255,1)");
  grad.addColorStop(0.06, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.18, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.38, `rgba(${r},${g},${b},0.45)`);
  grad.addColorStop(0.65, `rgba(${r},${g},${b},0.10)`);
  grad.addColorStop(1,    "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, sz, sz);

  const tex = new THREE.CanvasTexture(canvas);
  glowCache.set(hex, tex);
  return tex;
}

// Canvas-based text sprite for labels (anchor + major hub nodes)
function makeTextSprite(text: string, hexColor: string, pixelSize: number): THREE.Sprite {
  const { r, g, b } = hexToRgb(hexColor);
  const fontSize = pixelSize;
  const padding  = 12;

  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d")!;
  ctx.font = `400 ${fontSize}px Cinzel, 'Palatino Linotype', serif`;
  const tw = ctx.measureText(text).width;
  canvas.width  = Math.ceil(tw + padding * 2);
  canvas.height = Math.ceil(fontSize + padding);

  ctx.font = `400 ${fontSize}px Cinzel, 'Palatino Linotype', serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor  = "rgba(0,0,0,0.95)";
  ctx.shadowBlur   = 10;
  ctx.fillStyle    = `rgba(${r},${g},${b},0.92)`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  ctx.shadowColor  = `rgba(${r},${g},${b},0.5)`;
  ctx.shadowBlur   = 6;
  ctx.fillStyle    = "rgba(255,255,255,0.88)";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(aspect * 60, 60, 1);
  sprite.position.set(0, -85, 0); // sit below the glow sprite
  return sprite;
}

function stableJitter(seed: number, salt: number) {
  const v = Math.sin((seed + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return (v - Math.floor(v)) - 0.5;
}

// ─── component ──────────────────────────────────────────────────────────────

export default function ConstellationGraph3D({
  entities,
  edges,
  onSelectEntity,
  minSimilarity = 0,
  height = 700,
  layoutDensity = "expanded",
  layoutEngine = "clusters",
}: ConstellationGraph3DProps) {
  const fgRef        = useRef<ForceGraphMethods | undefined>(undefined);
  const activeIdRef  = useRef<string | null>(null);
  const neighborRef  = useRef<Set<string>>(new Set());
  const groupMapRef  = useRef<Map<string, THREE.Group>>(new Map());
  const twinkleRef   = useRef<Map<string, { phase: number; speed: number }>>(new Map());
  const rafRef       = useRef<number>(0);

  // ── build graph data ────────────────────────────────────────────────────
  const { nodes, links, neighborMap } = useMemo(() => {
    if (entities.length === 0) {
      return { nodes: [], links: [], neighborMap: new Map<string, Set<string>>() };
    }

    const graph = buildGraphologyGraph(entities, edges, minSimilarity, layoutDensity);

    // Assign Z bands per category (helix so no two large clusters share a plane)
    const catSet = new Set<string>();
    graph.forEachNode((_, a) => catSet.add((a.originalData as GraphEntity)?.category ?? "other"));
    const catList = [...catSet];
    const catZ    = new Map<string, number>();
    catList.forEach((cat, i) => {
      if (cat === "issue_intention_power") { catZ.set(cat, 0); return; }
      const t = i / Math.max(catList.length - 1, 1);
      catZ.set(cat, Math.sin(t * Math.PI * 2.8) * 350);
    });

    const fgNodes: FGNode3D[] = [];
    const fgLinks: FGLink3D[] = [];
    const nMap    = new Map<string, Set<string>>();
    const catIdx  = new Map<string, number>();

    graph.forEachNode((id) => {
      const a      = graph.getNodeAttributes(id);
      const entity = a.originalData as GraphEntity;
      const cat    = entity?.category ?? "other";
      const idx    = catIdx.get(cat) ?? 0;
      catIdx.set(cat, idx + 1);
      const deg    = (a.degree as number) ?? 0;

      const x = (a.x as number) ?? 0;
      const y = (a.y as number) ?? 0;
      const zBase   = catZ.get(cat) ?? 0;
      const z       = zBase + stableJitter(idx, 7) * 140;

      fgNodes.push({
        id, label: a.label as string, color: a.color as string,
        size:     Math.max((a.size as number) ?? 4, 3),
        degree:   deg,
        isAnchor: cat === "issue_intention_power" || deg >= 10,
        category: cat,
        originalData: entity,
        fx: layoutEngine === "clusters" ? x : undefined,
        fy: layoutEngine === "clusters" ? y : undefined,
        fz: layoutEngine === "clusters" ? z : undefined,
        x, y, z,
      });
      nMap.set(id, new Set());
    });

    graph.forEachEdge((_, a, src, tgt) => {
      const et  = (a.edgeType as string) ?? "corresponds_to";
      const lc  = et === "shares_correspondence_with" ? "#5eead4"
                : et === "associated_with"             ? "#60a5fa"
                :                                        "#fef08a";
      fgLinks.push({ source: src, target: tgt, edgeType: et, linkColor: lc });
      nMap.get(src)?.add(tgt);
      nMap.get(tgt)?.add(src);
    });

    return { nodes: fgNodes, links: fgLinks, neighborMap: nMap };
  }, [entities, edges, minSimilarity, layoutDensity, layoutEngine]);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  // ── node THREE objects ──────────────────────────────────────────────────
  const nodeThreeObject = useCallback((raw: object) => {
    const node  = raw as FGNode3D;
    const group = new THREE.Group();

    // Glow sprite — anchors are noticeably larger than leaf nodes
    const spriteScale = node.isAnchor
      ? node.size * 22
      : Math.max(node.size * 10, 18);
    const mat = new THREE.SpriteMaterial({
      map:         getGlowTexture(node.color),
      transparent: true,
      opacity:     node.isAnchor ? 1 : 0.82,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    const glowSprite = new THREE.Sprite(mat);
    glowSprite.scale.set(spriteScale, spriteScale, 1);
    glowSprite.name = "glow";
    group.add(glowSprite);

    // Text label for anchors and major hubs
    if (node.isAnchor && node.label) {
      group.add(makeTextSprite(node.label, node.color, 28));
    }

    groupMapRef.current.set(node.id, group);

    // Seed twinkle for mid-range nodes
    if (!node.isAnchor && node.degree >= 2) {
      twinkleRef.current.set(node.id, {
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      });
    }

    return group;
  }, []);

  // ── twinkle loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = performance.now() / 1000;
      twinkleRef.current.forEach(({ phase, speed }, id) => {
        const group = groupMapRef.current.get(id);
        if (!group) return;
        const glow  = group.getObjectByName("glow") as THREE.Sprite | undefined;
        if (!glow) return;
        const t    = Math.sin(now * speed + phase);  // -1..1
        const alpha = 0.55 + t * 0.28;               // 0.27..0.83
        const scale = 1 + t * 0.18;
        (glow.material as THREE.SpriteMaterial).opacity = alpha;
        const node = nodes.find(n => n.id === id);
        if (node) {
          const base = Math.max(node.size * 10, 18);
          glow.scale.set(base * scale, base * scale, 1);
        }
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [nodes]);

  // ── hover ───────────────────────────────────────────────────────────────
  const setGroupState = useCallback((id: string, state: "active" | "neighbor" | "hidden" | "rest") => {
    const group = groupMapRef.current.get(id);
    if (!group) return;
    const glow  = group.getObjectByName("glow") as THREE.Sprite | undefined;
    const node  = nodes.find(n => n.id === id);
    if (!glow || !node) return;
    const baseScale = node.isAnchor ? node.size * 22 : Math.max(node.size * 10, 18);
    switch (state) {
      case "active":
        glow.scale.set(baseScale * 2.8, baseScale * 2.8, 1);
        (glow.material as THREE.SpriteMaterial).opacity = 1;
        group.children.forEach(c => { if (c !== glow) (c as THREE.Sprite).material.opacity = 1; });
        break;
      case "neighbor":
        glow.scale.set(baseScale * 1.7, baseScale * 1.7, 1);
        (glow.material as THREE.SpriteMaterial).opacity = 0.95;
        break;
      case "hidden":
        (glow.material as THREE.SpriteMaterial).opacity = 0;
        group.children.forEach(c => { if (c !== glow) ((c as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 0; });
        break;
      case "rest":
        glow.scale.set(baseScale, baseScale, 1);
        (glow.material as THREE.SpriteMaterial).opacity = node.isAnchor ? 1 : 0.82;
        group.children.forEach(c => {
          if (c !== glow) ((c as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 1;
        });
        break;
    }
  }, [nodes]);

  const handleNodeHover = useCallback((raw: object | null) => {
    const prevId       = activeIdRef.current;
    const prevNeighbors = neighborRef.current;

    // Restore previous state
    if (prevId) {
      setGroupState(prevId, "rest");
      prevNeighbors.forEach(id => setGroupState(id, "rest"));
      groupMapRef.current.forEach((_, id) => {
        if (id !== prevId && !prevNeighbors.has(id)) setGroupState(id, "rest");
      });
    }

    const node   = raw as FGNode3D | null;
    const newId  = node?.id ?? null;
    const newNbr = newId ? (neighborMap.get(newId) ?? new Set<string>()) : new Set<string>();

    activeIdRef.current = newId;
    neighborRef.current = newNbr;

    if (newId) {
      setGroupState(newId, "active");
      newNbr.forEach(id => setGroupState(id, "neighbor"));
      groupMapRef.current.forEach((_, id) => {
        if (id !== newId && !newNbr.has(id)) setGroupState(id, "hidden");
      });
    }
  }, [neighborMap, setGroupState]);

  const handleNodeClick = useCallback((raw: object) => {
    const node = raw as FGNode3D;
    onSelectEntity(node.originalData);
    const x = node.x ?? 0, y = node.y ?? 0, z = node.z ?? 0;
    fgRef.current?.cameraPosition(
      { x: x + 80, y: y + 60, z: z + 200 },
      { x, y, z },
      800,
    );
  }, [onSelectEntity]);

  // Camera init: fit the whole graph, then angle for depth
  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;
    // Step 1: auto-fit so camera centers on the actual graph bounding box
    const t1 = setTimeout(() => fgRef.current?.zoomToFit(0, 80), 300);
    // Step 2: after fit, tilt the camera for a 3D galaxy perspective
    const t2 = setTimeout(() => {
      const pos = fgRef.current?.camera()?.position;
      if (!pos) return;
      fgRef.current?.cameraPosition(
        { x: pos.x * 0.9 + 280, y: pos.y * 0.9 + 220, z: pos.z * 1.1 },
        { x: 0, y: 0, z: 0 },
        900,
      );
    }, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [nodes]);

  // ── link helpers ─────────────────────────────────────────────────────────
  const getLinkColor = useCallback((raw: object) => {
    const l   = raw as FGLink3D;
    const aid = activeIdRef.current;
    if (!aid) return "rgba(200,160,60,0.06)";
    const sid = typeof l.source === "string" ? l.source : (l.source as FGNode3D).id;
    const tid = typeof l.target === "string" ? l.target : (l.target as FGNode3D).id;
    return sid === aid || tid === aid ? l.linkColor : "rgba(0,0,0,0)";
  }, []);

  const getLinkWidth = useCallback((raw: object) => {
    const l   = raw as FGLink3D;
    const aid = activeIdRef.current;
    if (!aid) return 0.2;
    const sid = typeof l.source === "string" ? l.source : (l.source as FGNode3D).id;
    const tid = typeof l.target === "string" ? l.target : (l.target as FGNode3D).id;
    return sid === aid || tid === aid ? 2 : 0;
  }, []);

  const getLinkParticles = useCallback((raw: object) => {
    const l   = raw as FGLink3D;
    const aid = activeIdRef.current;
    if (!aid) return 0;
    const sid = typeof l.source === "string" ? l.source : (l.source as FGNode3D).id;
    const tid = typeof l.target === "string" ? l.target : (l.target as FGNode3D).id;
    return sid === aid || tid === aid ? 4 : 0;
  }, []);

  const getLinkParticleColor = useCallback((raw: object) => (raw as FGLink3D).linkColor, []);

  if (entities.length === 0) {
    return (
      <div className="flex items-center justify-center"
        style={{ height, background: "#070503", borderRadius: 12, border: "1px solid rgba(120,80,20,0.2)" }}>
        <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, color: "#c8a060", letterSpacing: "0.12em" }}>
          No Resonance Detected
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden"
      style={{ borderRadius: 12, border: "1px solid rgba(120,80,20,0.25)", background: "#070503", height }}>

      {([0,1,2,3] as const).map((i) => (
        <div key={i}
          className={`absolute pointer-events-none ${i < 2 ? "top-0" : "bottom-0"} ${i % 2 === 0 ? "left-0" : "right-0"}`}
          style={{
            width: 18, height: 18, margin: 8,
            borderTop:    i < 2  ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderBottom: i >= 2 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderLeft:   i % 2 === 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderRight:  i % 2 !== 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
          }} />
      ))}

      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        height={height}
        backgroundColor="#070503"
        showNavInfo={false}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        nodeLabel={(n) => (n as FGNode3D).label}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkOpacity={1}
        linkDirectionalParticles={getLinkParticles}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleColor={getLinkParticleColor}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        cooldownTicks={layoutEngine === "clusters" ? 0 : 180}
        d3AlphaDecay={layoutEngine === "organic" ? 0.02 : 1}
        d3VelocityDecay={0.35}
        enableNodeDrag={false}
        enableNavigationControls
      />

      <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex gap-2">
        {["Drag / Orbit", "Scroll / Zoom", "Click / Open"].map((hint) => (
          <div key={hint} style={{
            background: "rgba(6,4,2,0.6)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(120,80,20,0.2)", borderRadius: 2,
            padding: "3px 10px", fontFamily: "'Cinzel', serif",
            fontSize: 9, letterSpacing: "0.2em", color: "rgba(180,130,50,0.5)",
          }}>{hint}</div>
        ))}
      </div>
    </div>
  );
}
