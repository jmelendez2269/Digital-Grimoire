"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sigma } from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type Graph from "graphology";
import { buildGraphologyGraph, GraphEntity, GraphEdge, GraphLayoutDensity } from "@/lib/graph/graphology-adapter";

interface SigmaGraphProps {
  entities: GraphEntity[];
  edges: GraphEdge[];
  onSelectEntity: (entity: GraphEntity) => void;
  minSimilarity?: number;
  height?: number;
  layoutDensity?: GraphLayoutDensity;
}

type LayoutSnapshot = Record<string, { x: number; y: number }>;
type GraphSummary = {
  isCorrespondenceGraph: boolean;
  leafCount: number;
  labeledHubCount: number;
  derivedEdgeCount: number;
  directEdgeCount: number;
  associativeEdgeCount: number;
  entityCount: number;
  edgeCount: number;
};

const LAYOUT_STORAGE_PREFIX = "digital-grimoire:sigma-layout:";
const LAYOUT_VERSION = "category-clusters-v3-expanded-default";
const MIN_LAYOUT_SPAN_BY_DENSITY: Record<GraphLayoutDensity, number> = {
  compact: 900,
  balanced: 1200,
  expanded: 1700,
};
const LABEL_RENDERED_SIZE_THRESHOLD = 3.2;
const DENSE_GRAPH_ENTITY_THRESHOLD = 220;
const DENSE_GRAPH_EDGE_THRESHOLD = 900;
const DENSE_LABEL_RENDERED_SIZE_THRESHOLD = 5.2;
const DENSE_LABEL_REVEAL_RATIO = 0.58;
const VERY_DENSE_LABEL_REVEAL_RATIO = 0.42;
const DENSE_OVERVIEW_RATIO = 1.15;
const VERY_DENSE_OVERVIEW_RATIO = 1.42;
const TWINKLE_TARGET_SPARSE = 5;
const TWINKLE_TARGET_DENSE = 7;
const TWINKLE_TARGET_VERY_DENSE = 9;
const TWINKLE_FADE_IN_MS = 900;
const TWINKLE_FADE_OUT_MS = 1100;
const TWINKLE_HOLD_MIN_MS = 1600;
const TWINKLE_HOLD_MAX_MS = 3200;
const TWINKLE_SPAWN_INTERVAL_MS = 420;
const TWINKLE_FRAME_INTERVAL_MS = 60;
const BACKGROUND_NODE_DIM_ALPHA = 0.35;
const BACKGROUND_EDGE_DIM_ALPHA = 0.14;
const IDLE_EDGE_ALPHA_SPARSE = 0;
const IDLE_EDGE_ALPHA_DENSE = 0;
const IDLE_EDGE_ALPHA_VERY_DENSE = 0;

type TwinkleEntry = { birth: number; lifespan: number };

function computeTwinkleAlpha(entry: TwinkleEntry | undefined, now: number) {
  if (!entry) return 0;
  const age = now - entry.birth;
  if (age < 0) return 0;
  const hold = Math.max(0, entry.lifespan - TWINKLE_FADE_IN_MS - TWINKLE_FADE_OUT_MS);
  let raw: number;
  if (age < TWINKLE_FADE_IN_MS) raw = age / TWINKLE_FADE_IN_MS;
  else if (age < TWINKLE_FADE_IN_MS + hold) raw = 1;
  else if (age < entry.lifespan) raw = Math.max(0, 1 - (age - TWINKLE_FADE_IN_MS - hold) / TWINKLE_FADE_OUT_MS);
  else raw = 0;
  return raw * raw * (3 - 2 * raw);
}
const layoutMemoryCache = new Map<string, LayoutSnapshot>();

function resetCamera(renderer: Sigma, duration = 250) {
  void renderer.getCamera().animatedReset({ duration });
}

function withAlpha(color: string | undefined, alpha: number) {
  if (!color) return `rgba(200, 136, 42, ${alpha})`;

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const normalizedHex =
      hex.length === 3
        ? hex
            .split("")
            .map((part) => `${part}${part}`)
            .join("")
        : hex;

    if (normalizedHex.length === 6) {
      const r = Number.parseInt(normalizedHex.slice(0, 2), 16);
      const g = Number.parseInt(normalizedHex.slice(2, 4), 16);
      const b = Number.parseInt(normalizedHex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const [r = "200", g = "136", b = "42"] = rgbMatch[1].split(",").map((part) => part.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const hslMatch = color.match(/^hsla?\(([^)]+)\)$/i);
  if (hslMatch) {
    const [h = "36", s = "65%", l = "47%"] = hslMatch[1].split(",").map((part) => part.trim());
    return `hsla(${h}, ${s}, ${l}, ${alpha})`;
  }

  return color;
}

function focusCameraOnNode(renderer: Sigma, graph: Graph, node: string, isDenseGraph: boolean) {
  const attrs = graph.getNodeAttributes(node);
  const targetX = typeof attrs.x === "number" ? attrs.x : 0;
  const targetY = typeof attrs.y === "number" ? attrs.y : 0;
  const currentRatio = renderer.getCamera().ratio;
  const isLeaf = Boolean(attrs.isLeaf);
  const targetRatio = isDenseGraph
    ? Math.max(currentRatio * (isLeaf ? 0.92 : 0.88), 0.18)
    : isLeaf
      ? Math.max(currentRatio * 0.72, 0.06)
      : Math.max(currentRatio * 0.82, 0.08);

  void renderer.getCamera().animate(
    {
      x: targetX,
      y: targetY,
      ratio: targetRatio,
    },
    { duration: 220 },
  );
}

function getGraphBounds(graph: Graph, minLayoutSpan: number) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  graph.forEachNode((node) => {
    const attrs = graph.getNodeAttributes(node);
    const x = typeof attrs.x === "number" ? attrs.x : 0;
    const y = typeof attrs.y === "number" ? attrs.y : 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return {
      minX: -minLayoutSpan / 2,
      minY: -minLayoutSpan / 2,
      maxX: minLayoutSpan / 2,
      maxY: minLayoutSpan / 2,
    };
  }

  return { minX, minY, maxX, maxY };
}

function normalizeGraphLayout(graph: Graph, minLayoutSpan: number) {
  const bounds = getGraphBounds(graph, minLayoutSpan);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.max(1, minLayoutSpan / Math.max(width, height));
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  graph.updateEachNodeAttributes((_, attrs) => ({
    ...attrs,
    x: ((typeof attrs.x === "number" ? attrs.x : 0) - centerX) * scale,
    y: ((typeof attrs.y === "number" ? attrs.y : 0) - centerY) * scale,
  }));
}

function snapshotLayout(graph: Graph): LayoutSnapshot {
  const snapshot: LayoutSnapshot = {};

  graph.forEachNode((node) => {
    const attrs = graph.getNodeAttributes(node);
    snapshot[node] = {
      x: typeof attrs.x === "number" ? attrs.x : 0,
      y: typeof attrs.y === "number" ? attrs.y : 0,
    };
  });

  return snapshot;
}

function applyLayoutSnapshot(graph: Graph, snapshot: LayoutSnapshot | null) {
  if (!snapshot) return false;

  let applied = 0;
  graph.forEachNode((node) => {
    const position = snapshot[node];
    if (!position) return;
    graph.mergeNodeAttributes(node, position);
    applied += 1;
  });

  return applied === graph.order;
}

function readStoredLayout(layoutKey: string) {
  const memoryLayout = layoutMemoryCache.get(layoutKey);
  if (memoryLayout) return memoryLayout;

  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(`${LAYOUT_STORAGE_PREFIX}${layoutKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LayoutSnapshot;
    layoutMemoryCache.set(layoutKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredLayout(layoutKey: string, snapshot: LayoutSnapshot) {
  layoutMemoryCache.set(layoutKey, snapshot);

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(`${LAYOUT_STORAGE_PREFIX}${layoutKey}`, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota/private mode failures and keep the in-memory cache.
  }
}

function buildLayoutKey(
  entities: GraphEntity[],
  edges: GraphEdge[],
  minSimilarity: number,
  layoutDensity: GraphLayoutDensity,
) {
  const nodePart = entities
    .map((entity) => entity.id)
    .sort()
    .join("|");

  const edgePart = edges
    .map((edge) => {
      const source = edge.source_id <= edge.target_id ? edge.source_id : edge.target_id;
      const target = edge.source_id <= edge.target_id ? edge.target_id : edge.source_id;
      const weight = edge.similarity ?? edge.weight ?? 0.5;
      return `${source}->${target}:${weight.toFixed(3)}`;
    })
    .sort()
    .join("|");

  return `${LAYOUT_VERSION}::${layoutDensity}::${minSimilarity.toFixed(3)}::${nodePart}::${edgePart}`;
}

function drawNodeLabel(
  context: CanvasRenderingContext2D,
  data: {
    x: number;
    y: number;
    size: number;
    label?: string;
    hidden?: boolean;
    labelColor?: string;
    labelWeight?: string;
  },
  settings: { labelFont?: string; labelSize?: number; labelWeight?: string; labelColor?: { color?: string } }
): void {
  if (!data.label || data.hidden) return;

  const size = settings.labelSize ?? 11;
  const font = settings.labelFont ?? "Cinzel, 'Palatino Linotype', serif";
  const weight = data.labelWeight ?? settings.labelWeight ?? "400";
  const color = data.labelColor ?? settings.labelColor?.color ?? "#d4b483";

  context.save();
  context.font = `${weight} ${size}px ${font}`;
  context.textAlign = "center";
  context.textBaseline = "top";

  const x = data.x;
  const y = data.y + data.size + 4;

  context.shadowColor = "rgba(0, 0, 0, 0.95)";
  context.shadowBlur = 8;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.fillStyle = color;
  context.fillText(data.label, x, y);

  context.shadowBlur = 0;
  context.fillStyle = color;
  context.fillText(data.label, x, y);

  context.restore();
}

function StarField({ height }: { height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

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
      className="absolute inset-0 z-0 h-full w-full pointer-events-none"
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
  layoutDensity = "expanded",
}: SigmaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [hoveredSummary, setHoveredSummary] = useState<{ name: string; connections: number } | null>(null);
  const [cameraRatio, setCameraRatio] = useState(1);
  const [exploredGraphKey, setExploredGraphKey] = useState<string | null>(null);
  const [viewportActions, setViewportActions] = useState<{
    fit: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
  }>({
    fit: () => undefined,
    zoomIn: () => undefined,
    zoomOut: () => undefined,
  });

  const graphSummary = useMemo<GraphSummary | null>(() => {
    if (entities.length === 0) return null;

    const isCorrespondenceGraph = entities.some(
      (entity) => typeof entity.category === "string" && entity.category.length > 0,
    );
    if (!isCorrespondenceGraph) {
      return {
        isCorrespondenceGraph: false,
        leafCount: 0,
        labeledHubCount: 0,
        derivedEdgeCount: 0,
        directEdgeCount: 0,
        associativeEdgeCount: 0,
        entityCount: entities.length,
        edgeCount: edges.length,
      };
    }

    const degreeByNodeId = new Map<string, number>();
    let derivedEdgeCount = 0;
    let directEdgeCount = 0;
    let associativeEdgeCount = 0;
    for (const entity of entities) {
      degreeByNodeId.set(entity.id, 0);
    }

    for (const edge of edges) {
      const weight = edge.similarity ?? edge.weight ?? 0.5;
      if (weight < minSimilarity) continue;
      if (!degreeByNodeId.has(edge.source_id) || !degreeByNodeId.has(edge.target_id)) continue;
      if (edge.source_id === edge.target_id) continue;
      const edgeType = edge.relationship_type?.slug ?? edge.type;
      if (edgeType === "shares_correspondence_with") derivedEdgeCount += 1;
      else if (edgeType === "associated_with") associativeEdgeCount += 1;
      else if (edgeType === "corresponds_to") directEdgeCount += 1;
      degreeByNodeId.set(edge.source_id, (degreeByNodeId.get(edge.source_id) || 0) + 1);
      degreeByNodeId.set(edge.target_id, (degreeByNodeId.get(edge.target_id) || 0) + 1);
    }

    let leafCount = 0;
    let labeledHubCount = 0;

    for (const entity of entities) {
      const degree = degreeByNodeId.get(entity.id) || 0;
      if (degree <= 1) leafCount += 1;
      if (degree >= 6 || entity.category === "issue_intention_power") labeledHubCount += 1;
    }

    return {
      isCorrespondenceGraph,
      leafCount,
      labeledHubCount,
      derivedEdgeCount,
      directEdgeCount,
      associativeEdgeCount,
      entityCount: entities.length,
      edgeCount: edges.length,
    };
  }, [edges, entities, minSimilarity]);

  const categorySummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entity of entities) {
      const label = entity.category?.trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 6);
  }, [entities]);

  const isDenseGraph =
    (graphSummary?.entityCount || 0) >= DENSE_GRAPH_ENTITY_THRESHOLD ||
    (graphSummary?.edgeCount || 0) >= DENSE_GRAPH_EDGE_THRESHOLD;
  const labelSizeThreshold = isDenseGraph ? DENSE_LABEL_RENDERED_SIZE_THRESHOLD : LABEL_RENDERED_SIZE_THRESHOLD;
  const isVeryDenseGraph =
    (graphSummary?.entityCount || 0) >= 1200 ||
    (graphSummary?.edgeCount || 0) >= 2200;
  const denseLabelRevealRatio = isVeryDenseGraph ? VERY_DENSE_LABEL_REVEAL_RATIO : DENSE_LABEL_REVEAL_RATIO;
  const denseOverviewRatio = isVeryDenseGraph ? VERY_DENSE_OVERVIEW_RATIO : DENSE_OVERVIEW_RATIO;
  const graphInteractionKey = useMemo(
    () => buildLayoutKey(entities, edges, minSimilarity, layoutDensity),
    [edges, entities, layoutDensity, minSimilarity],
  );
  const minLayoutSpan = MIN_LAYOUT_SPAN_BY_DENSITY[layoutDensity];

  useEffect(() => {
    if (!containerRef.current || entities.length === 0) return;

    const graph = buildGraphologyGraph(entities, edges, minSimilarity, layoutDensity);
    const layoutKey = graphInteractionKey;
    const cachedLayout = readStoredLayout(layoutKey);
    const reusedCachedLayout = applyLayoutSnapshot(graph, cachedLayout);

    if (graph.order > 0 && !reusedCachedLayout) {
      const correspondenceLayoutSettings =
        layoutDensity === "expanded"
          ? { gravity: 0.09, scalingRatio: 18, iterations: 260 }
          : layoutDensity === "compact"
            ? { gravity: 0.18, scalingRatio: 9.5, iterations: 220 }
            : { gravity: 0.12, scalingRatio: 13.5, iterations: 240 };
      forceAtlas2.assign(graph, {
        iterations: correspondenceLayoutSettings.iterations,
        settings: {
          gravity: graphSummary?.isCorrespondenceGraph ? correspondenceLayoutSettings.gravity : 0.08,
          scalingRatio: graphSummary?.isCorrespondenceGraph ? correspondenceLayoutSettings.scalingRatio : 8,
          strongGravityMode: false,
          barnesHutOptimize: graph.order > 300,
        },
      });
      normalizeGraphLayout(graph, minLayoutSpan);
      writeStoredLayout(layoutKey, snapshotLayout(graph));
    }

    const twinkleMap = new Map<string, TwinkleEntry>();
    const twinklePool = graph.nodes().filter((nodeId) => {
      const degree = graph.getNodeAttribute(nodeId, "degree") as number | undefined;
      const label = graph.getNodeAttribute(nodeId, "label") as string | undefined;
      return (degree ?? 0) >= 2 && typeof label === "string" && label.trim().length > 0;
    });
    const twinkleTarget = Math.min(
      twinklePool.length,
      isVeryDenseGraph ? TWINKLE_TARGET_VERY_DENSE : isDenseGraph ? TWINKLE_TARGET_DENSE : TWINKLE_TARGET_SPARSE,
    );

    const spawnTwinkle = (staggerFraction = 0) => {
      if (twinklePool.length === 0) return;
      const available = twinklePool.filter((nodeId) => !twinkleMap.has(nodeId));
      if (available.length === 0) return;
      const pick = available[Math.floor(Math.random() * available.length)];
      const lifespan =
        TWINKLE_FADE_IN_MS +
        TWINKLE_FADE_OUT_MS +
        TWINKLE_HOLD_MIN_MS +
        Math.random() * (TWINKLE_HOLD_MAX_MS - TWINKLE_HOLD_MIN_MS);
      twinkleMap.set(pick, {
        birth: performance.now() - staggerFraction * lifespan,
        lifespan,
      });
    };

    for (let index = 0; index < twinkleTarget; index += 1) {
      spawnTwinkle(Math.random() * 0.7);
    }

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeColor: "#7a5a24",
      defaultNodeColor: "#c8882a",
      labelFont: "Cinzel, 'Palatino Linotype', serif",
      labelSize: 11,
      labelWeight: "400",
      labelColor: { color: "#d4b483" },
      labelRenderedSizeThreshold: labelSizeThreshold,
      minCameraRatio: 0.02,
      maxCameraRatio: 20,
      // @ts-expect-error Sigma v3 accepts custom draw functions here
      defaultDrawNodeLabel: drawNodeLabel,
      // @ts-expect-error Sigma v3 accepts custom draw functions here
      defaultDrawNodeHover: drawNodeLabel,
    });

    sigmaRef.current = renderer;
    resetCamera(renderer, 0);
    if (isDenseGraph) {
      renderer.getCamera().setState({ ratio: denseOverviewRatio });
    }
    setCameraRatio(renderer.getCamera().ratio);
    setViewportActions({
      fit: () => resetCamera(renderer),
      zoomOut: () => {
        const camera = renderer.getCamera();
        void camera.animate({ ratio: Math.min(camera.ratio * 1.35, 20) }, { duration: 160 });
      },
      zoomIn: () => {
        const camera = renderer.getCamera();
        void camera.animate({ ratio: Math.max(camera.ratio / 1.35, 0.02) }, { duration: 160 });
      },
    });

    const resizeObserver = new ResizeObserver(() => {
      renderer.refresh();
    });
    resizeObserver.observe(containerRef.current);

    const camera = renderer.getCamera();
    const handleCameraUpdate = () => {
      setCameraRatio(camera.ratio);
    };
    camera.on("updated", handleCameraUpdate);

    let hoveredNode: string | null = null;
    let selectedNode: string | null = null;
    let neighbors = new Set<string>();

    const applyInteractionState = () => {
      const activeNode = hoveredNode ?? selectedNode;
      const activeNeighbors = activeNode ? new Set(graph.neighbors(activeNode)) : new Set<string>();

      renderer.setSetting("nodeReducer", (candidateNode, data) => {
        const degree = graph.getNodeAttribute(candidateNode, "degree") as number | undefined;
        const isLeaf = Boolean(graph.getNodeAttribute(candidateNode, "isLeaf"));
        const isAnchor = Boolean(graph.getNodeAttribute(candidateNode, "forceLabel"));
        const originalData = graph.getNodeAttribute(candidateNode, "originalData") as GraphEntity | undefined;
        const isCoreCorrespondenceAnchor = originalData?.category === "issue_intention_power";
        const twinkleAlpha = computeTwinkleAlpha(twinkleMap.get(candidateNode), performance.now());
        const isTwinkling = twinkleAlpha > 0.02;
        const cameraRatioNow = renderer.getCamera().ratio;
        const canRevealDenseLabels = isDenseGraph && cameraRatioNow <= denseLabelRevealRatio;
        const canRevealNodeLabelAtRest =
          !isDenseGraph ||
          isTwinkling ||
          (canRevealDenseLabels && ((degree ?? 0) >= (isVeryDenseGraph ? 8 : 6) || isCoreCorrespondenceAnchor));
        const baseSize = data.size ?? 6;
        const restingSize = isDenseGraph
          ? isLeaf
            ? Math.max(baseSize * (isVeryDenseGraph ? 0.58 : 0.68), 1.9)
            : Math.max(baseSize * (isVeryDenseGraph ? 0.9 : 0.96), 2.8)
          : baseSize;
        const restingColor = isDenseGraph
          ? isLeaf
            ? withAlpha(data.color, isVeryDenseGraph ? 0.16 : 0.24)
            : withAlpha(data.color, isVeryDenseGraph ? 0.72 : 0.86)
          : data.color;
        const reducedData = {
          ...data,
          size: isTwinkling ? restingSize * (1 + twinkleAlpha * 0.3) : restingSize,
          color: isTwinkling
            ? `rgba(245, 230, 176, ${(0.55 + twinkleAlpha * 0.45).toFixed(3)})`
            : restingColor,
          label: canRevealNodeLabelAtRest ? data.label : "",
          labelColor: isTwinkling
            ? `rgba(245, 230, 176, ${(0.35 + twinkleAlpha * 0.65).toFixed(3)})`
            : undefined,
          labelWeight: isTwinkling ? "600" : undefined,
          forceLabel: isTwinkling,
          zIndex: isTwinkling ? 5 : data.zIndex,
        };

        if (!activeNode) {
          return reducedData;
        }

        if (candidateNode === activeNode) {
          return {
            ...reducedData,
            zIndex: 12,
            size: baseSize * (hoveredNode ? 2 : 1.75),
            color: "#f5e6b0",
            forceLabel: true,
          };
        }

        if (activeNeighbors.has(candidateNode)) {
          return {
            ...reducedData,
            zIndex: 7,
            size: baseSize * (isDenseGraph ? 1.08 : 1.15),
            color: data.color ?? "#c8882a",
            forceLabel: !isDenseGraph || isAnchor || (degree ?? 0) >= 4,
            label: data.label,
          };
        }

        return {
          ...reducedData,
          size: Math.max(reducedData.size * (isDenseGraph ? (isVeryDenseGraph ? 0.5 : 0.65) : 0.82), 1.8),
          color: withAlpha(data.color, BACKGROUND_NODE_DIM_ALPHA),
          label: "",
          forceLabel: false,
        };
      });

      renderer.setSetting("edgeReducer", (edge, data) => {
        const edgeData = graph.getEdgeAttribute(edge, "originalData") as GraphEdge | undefined;
        const edgeType = edgeData?.relationship_type?.slug ?? edgeData?.type;
        const isDerived = edgeType === "shares_correspondence_with";

        if (!activeNode) {
          return {
            ...data,
            hidden: true,
          };
        }

        if (graph.hasExtremity(edge, activeNode)) {
          return {
            ...data,
            color: isDerived ? "rgba(94, 234, 212, 0.95)" : "#e0b85d",
            size: Math.max((data.size ?? 1.8) * (isDerived ? 1.9 : 1.65), isDerived ? 3.1 : 2.4),
            zIndex: 10,
          };
        }

        return {
          ...data,
          hidden: true,
        };
      });

      renderer.refresh();
    };

    applyInteractionState();

    let twinkleRafId = 0;
    let lastTwinkleFrame = 0;
    let lastTwinkleSpawn = performance.now();
    const runTwinkleTick = (time: number) => {
      if (time - lastTwinkleFrame >= TWINKLE_FRAME_INTERVAL_MS) {
        lastTwinkleFrame = time;
        const now = performance.now();
        for (const [nodeId, entry] of twinkleMap) {
          if (now - entry.birth >= entry.lifespan) twinkleMap.delete(nodeId);
        }
        if (twinkleMap.size < twinkleTarget && now - lastTwinkleSpawn >= TWINKLE_SPAWN_INTERVAL_MS) {
          spawnTwinkle();
          lastTwinkleSpawn = now;
        }
        if (twinklePool.length > 0) {
          renderer.refresh({ skipIndexation: true });
        }
      }
      twinkleRafId = requestAnimationFrame(runTwinkleTick);
    };
    if (twinklePool.length > 0) {
      twinkleRafId = requestAnimationFrame(runTwinkleTick);
    }

    renderer.on("enterNode", ({ node }) => {
      hoveredNode = node;
      if (isVeryDenseGraph) setExploredGraphKey(layoutKey);
      neighbors = new Set(graph.neighbors(node));
      const attrs = graph.getNodeAttributes(node);
      setHoveredSummary({
        name: typeof attrs.label === "string" ? attrs.label : "Unknown",
        connections: neighbors.size,
      });
      applyInteractionState();
    });

    renderer.on("leaveNode", () => {
      hoveredNode = null;
      neighbors.clear();
      setHoveredSummary(null);
      applyInteractionState();
    });

    renderer.on("clickNode", ({ node }) => {
      selectedNode = node;
      setExploredGraphKey(layoutKey);
      applyInteractionState();
      focusCameraOnNode(renderer, graph, node, isDenseGraph);
      const attrs = graph.getNodeAttributes(node);
      if (attrs.originalData) {
        onSelectEntity(attrs.originalData as GraphEntity);
      }
    });

    renderer.on("clickStage", () => {
      selectedNode = null;
      if (isVeryDenseGraph) setExploredGraphKey(layoutKey);
      applyInteractionState();
    });

    return () => {
      if (twinkleRafId) cancelAnimationFrame(twinkleRafId);
      resizeObserver.disconnect();
      camera.removeListener("updated", handleCameraUpdate);
      setViewportActions({
        fit: () => undefined,
        zoomIn: () => undefined,
        zoomOut: () => undefined,
      });
      renderer.kill();
      sigmaRef.current = null;
    };
  }, [
    denseLabelRevealRatio,
    denseOverviewRatio,
    edges,
    entities,
    graphSummary?.isCorrespondenceGraph,
    graphInteractionKey,
    layoutDensity,
    isDenseGraph,
    isVeryDenseGraph,
    labelSizeThreshold,
    minLayoutSpan,
    minSimilarity,
    onSelectEntity,
  ]);

  if (entities.length === 0) {
    return (
      <div
        className="flex items-center justify-center transition-all duration-500"
        style={{
          minHeight: 600,
          background: "#060402",
          borderRadius: 12,
          border: "1px solid rgba(120,80,20,0.2)",
        }}
      >
        <div className="p-10 text-center" style={{ maxWidth: 360 }}>
          <div className="mx-auto mb-6" style={{ width: 56, height: 56, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid rgba(180,130,40,0.3)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 10,
                borderRadius: "50%",
                border: "1px solid rgba(180,130,40,0.15)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: 1,
                height: 36,
                background: "rgba(180,130,40,0.25)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%) rotate(90deg)",
                width: 1,
                height: 36,
                background: "rgba(180,130,40,0.25)",
              }}
            />
          </div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 15,
              color: "#c8a060",
              marginBottom: 8,
              letterSpacing: "0.12em",
            }}
          >
            No Resonance Detected
          </p>
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 12,
              color: "rgba(180,130,40,0.4)",
              lineHeight: 1.7,
              fontStyle: "italic",
            }}
          >
            Adjust your filters or expand the search volume to reveal hidden correspondences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden group/graph"
      style={{
        borderRadius: 12,
        border: "1px solid rgba(120,80,20,0.25)",
        background: "#070503",
      }}
    >
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(100,55,10,0.22) 0%, rgba(40,20,5,0.10) 45%, transparent 75%)",
        }}
      />

      <StarField height={height} />

      {graphSummary?.isCorrespondenceGraph && categorySummary.length > 0 && (
        <div className="pointer-events-none absolute left-4 top-24 z-20 max-w-[320px] rounded-2xl border border-amber-900/25 bg-black/35 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.28em] text-amber-500/55">Category Constellations</p>
          <p className="mt-2 text-xs leading-5 text-amber-100/70">
            Related correspondences gather in readable neighborhoods so the archive can be scanned region by region instead of as one knot.
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-amber-100/45">
            Spacing: {layoutDensity}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categorySummary.map(([category, count]) => (
              <span
                key={category}
                className="rounded-full border border-amber-800/30 bg-amber-950/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-100/70"
              >
                {category.replaceAll("_", " ")} · {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {(["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((pos, index) => (
        <div
          key={index}
          className={`absolute ${pos} z-10 pointer-events-none`}
          style={{
            width: 18,
            height: 18,
            borderTop: index < 2 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderBottom: index >= 2 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderLeft: index % 2 === 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
            borderRight: index % 2 !== 0 ? "1px solid rgba(160,110,30,0.35)" : "none",
            margin: 8,
          }}
        />
      ))}

      <div ref={containerRef} className="relative z-20 w-full" style={{ height }} />

      <div className="absolute left-4 top-4 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-amber-900/30 bg-black/55 px-2 py-2 backdrop-blur-md">
          {[
            { label: "Fit", onClick: viewportActions.fit },
            { label: "-", onClick: viewportActions.zoomOut },
            { label: "+", onClick: viewportActions.zoomIn },
          ].map((control) => (
            <button
              key={control.label}
              type="button"
              onClick={control.onClick}
              className="pointer-events-auto rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-amber-100/75 transition-colors hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-100"
            >
              {control.label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-md">
          Zoom {(1 / Math.max(cameraRatio, 0.0001)).toFixed(1)}x
        </div>
      </div>

      {graphSummary?.isCorrespondenceGraph && (
        <div className="pointer-events-none absolute top-4 right-4 z-20 max-w-xs rounded-lg border border-amber-800/30 bg-black/45 px-4 py-3 text-[11px] leading-5 text-amber-100/70 backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">
            Reading the Archive
          </p>
          <p className="mt-2">
            Unlabeled dots are still loaded nodes. Connections stay hidden until hover or selection.
          </p>
          <p className="mt-1">
            {graphSummary.leafCount} leaf nodes are present, and {graphSummary.labeledHubCount} anchors stay labeled to hold the structure together.
          </p>
          {isDenseGraph && (
            <p className="mt-1 text-amber-100/55">
              {isVeryDenseGraph
                ? "Archive mode is intentionally quiet at this scale. Zoom, hover, or search to pull one thread forward."
                : "Dense mode is active, so labels stay hidden a little longer until you zoom in."}
            </p>
          )}
          <div className="mt-3 space-y-1.5 border-t border-amber-900/30 pt-3 text-[10px] leading-4 text-amber-100/65">
            <div className="flex items-center gap-2">
              <span className="inline-block h-[2px] w-5 rounded-full bg-amber-300/80" />
              <span>{graphSummary.directEdgeCount} direct correspondences</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-[2px] w-5 rounded-full bg-sky-300/70" />
              <span>{graphSummary.associativeEdgeCount} associative links</span>
            </div>
            {graphSummary.derivedEdgeCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-block h-[2px] w-5 rounded-full bg-teal-300/90 shadow-[0_0_10px_rgba(94,234,212,0.35)]" />
                <span>{graphSummary.derivedEdgeCount} semantic overlap links</span>
              </div>
            )}
          </div>
        </div>
      )}

      {graphSummary?.isCorrespondenceGraph && isVeryDenseGraph && exploredGraphKey !== graphInteractionKey && !hoveredSummary && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-amber-700/25 bg-black/55 px-4 py-3 text-center text-[11px] leading-5 text-amber-100/68 backdrop-blur-md">
          Start with a shimmer of structure, not every name at once. A few brighter beacons are scattered through the archive to give you places to begin.
        </div>
      )}

      {hoveredSummary && (
        <div
          className="pointer-events-none absolute top-5 left-0 z-30"
          style={{ display: "flex", alignItems: "stretch" }}
        >
          <div
            style={{
              width: 2,
              background:
                "linear-gradient(to bottom, transparent, rgba(200,160,60,0.8) 20%, rgba(200,160,60,0.8) 80%, transparent)",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              padding: "10px 16px 10px 14px",
              background: "linear-gradient(to right, rgba(6,4,2,0.82), rgba(6,4,2,0))",
              backdropFilter: "blur(10px)",
            }}
          >
            <p
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: 8,
                letterSpacing: "0.36em",
                color: "rgba(160,110,30,0.7)",
                textTransform: "uppercase",
                marginBottom: 5,
                whiteSpace: "nowrap",
              }}
            >
              Correspondence
            </p>
            <p
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: 17,
                color: "#e8d090",
                fontWeight: 400,
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {hoveredSummary.name}
            </p>
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 11,
                color: "rgba(160,120,50,0.55)",
                marginTop: 4,
                fontStyle: "italic",
                whiteSpace: "nowrap",
              }}
            >
              {hoveredSummary.connections}{" "}
              {hoveredSummary.connections === 1 ? "direct correspondence" : "direct correspondences"}
            </p>
          </div>
        </div>
      )}

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
