"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sigma } from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type Graph from "graphology";
import { ArrowLeft, ArrowRight, Maximize2, Minus, Plus } from "lucide-react";
import { buildGraphologyGraph, GraphEntity, GraphEdge, GraphLayoutDensity } from "@/lib/graph/graphology-adapter";

export type GraphLayoutEngine = "clusters" | "organic";

interface SigmaGraphProps {
  entities: GraphEntity[];
  edges: GraphEdge[];
  onSelectEntity: (entity: GraphEntity) => void;
  onClearSelection?: () => void;
  minSimilarity?: number;
  height?: number;
  layoutDensity?: GraphLayoutDensity;
  layoutEngine?: GraphLayoutEngine;
  focusedEntityId?: string | null;
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
const LAYOUT_VERSION = "category-clusters-v5-directed-edges";
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
const FOCUSED_NEIGHBOR_LABEL_LIMIT = 12;

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
  const displayData = renderer.getNodeDisplayData(node);
  const targetX = displayData?.x ?? 0.5;
  const targetY = displayData?.y ?? 0.5;
  const camera = renderer.getCamera();
  const currentRatio = camera.ratio;
  const currentAngle = camera.getState().angle;
  const isLeaf = Boolean(graph.getNodeAttribute(node, "isLeaf"));

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
      angle: Number.isFinite(currentAngle) ? currentAngle : 0,
    },
    { duration: 220 },
  );
}

function focusCameraOnNeighborhood(renderer: Sigma, graph: Graph, node: string) {
  const neighborhood = [node, ...graph.neighbors(node)];
  const points = neighborhood
    .map((nodeId) => renderer.getNodeDisplayData(nodeId))
    .filter(
      (point): point is NonNullable<typeof point> =>
        Boolean(point) &&
        Number.isFinite(point?.x) &&
        Number.isFinite(point?.y),
    );

  if (points.length === 0) {
    focusCameraOnNode(renderer, graph, node, false);
    return;
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const dimensions = renderer.getDimensions();
  const aspectRatio = Math.max(dimensions.width / Math.max(dimensions.height, 1), 1);
  const paddedSpan = Math.max(
    (maxX - minX) * 0.92,
    (maxY - minY) * 0.92 * aspectRatio,
  );

  void renderer.getCamera().animate(
    {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      ratio: Math.min(Math.max(paddedSpan, 0.28), 0.68),
      angle: Number.isFinite(renderer.getCamera().getState().angle)
        ? renderer.getCamera().getState().angle
        : 0,
    },
    { duration: 220 },
  );
}

function deterministicFraction(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function buildOrganicSpotlightPositions(
  graph: Graph,
  centerNodeId: string,
  centerX: number,
  centerY: number,
) {
  const neighborStrength = new Map<string, number>();
  for (const edge of graph.edges(centerNodeId)) {
    const source = graph.source(edge);
    const target = graph.target(edge);
    const neighborId = source === centerNodeId ? target : source;
    const edgeData = graph.getEdgeAttribute(edge, "originalData") as GraphEdge | undefined;
    const strength = edgeData?.similarity ?? edgeData?.weight ?? 0.5;
    neighborStrength.set(
      neighborId,
      Math.max(neighborStrength.get(neighborId) || 0, strength),
    );
  }
  const neighbors = graph.neighbors(centerNodeId).sort((left, right) => {
    const strengthDelta = (neighborStrength.get(right) || 0) - (neighborStrength.get(left) || 0);
    if (strengthDelta !== 0) return strengthDelta;
    const leftLabel = String(graph.getNodeAttribute(left, "label") || left);
    const rightLabel = String(graph.getNodeAttribute(right, "label") || right);
    return leftLabel.localeCompare(rightLabel);
  });
  const originalDistances = neighbors.map((nodeId) => {
    const attributes = graph.getNodeAttributes(nodeId);
    const x = typeof attributes.x === "number" ? attributes.x : centerX;
    const y = typeof attributes.y === "number" ? attributes.y : centerY;
    return Math.hypot(x - centerX, y - centerY);
  });
  const minimumOriginalDistance = Math.min(...originalDistances, 0);
  const maximumOriginalDistance = Math.max(...originalDistances, 1);
  const originalDistanceSpan = Math.max(maximumOriginalDistance - minimumOriginalDistance, 1);
  const radialSpan = Math.min(1_100, 320 + Math.sqrt(neighbors.length) * 70);
  const neighborGeometry = neighbors.map((nodeId) => {
    const attributes = graph.getNodeAttributes(nodeId);
    const originalX = typeof attributes.x === "number" ? attributes.x : centerX;
    const originalY = typeof attributes.y === "number" ? attributes.y : centerY;
    const dx = originalX - centerX;
    const dy = originalY - centerY;
    const originalDistance = Math.hypot(dx, dy);
    const fallbackAngle = deterministicFraction(nodeId) * Math.PI * 2;
    return {
      nodeId,
      attributes,
      originalDistance,
      originalAngle: originalDistance > 0.001 ? Math.atan2(dy, dx) : fallbackAngle,
    };
  });
  const adjustedAngles = new Map(
    neighborGeometry.map(({ nodeId, originalAngle }) => [nodeId, originalAngle] as const),
  );
  const labeledGeometry = neighborGeometry.slice(0, FOCUSED_NEIGHBOR_LABEL_LIMIT);
  const normalizeAngle = (angle: number) =>
    Math.atan2(Math.sin(angle), Math.cos(angle));

  // Separate only labeled directions that would visually collide. Existing
  // wide gaps remain wide, so the result keeps its original, irregular shape.
  for (let iteration = 0; iteration < 90; iteration += 1) {
    for (let leftIndex = 0; leftIndex < labeledGeometry.length; leftIndex += 1) {
      const left = labeledGeometry[leftIndex];
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < labeledGeometry.length;
        rightIndex += 1
      ) {
        const right = labeledGeometry[rightIndex];
        const leftAngle = adjustedAngles.get(left.nodeId) ?? left.originalAngle;
        const rightAngle = adjustedAngles.get(right.nodeId) ?? right.originalAngle;
        const delta = normalizeAngle(rightAngle - leftAngle);
        const minimumAngularGap = 0.36;
        if (Math.abs(delta) >= minimumAngularGap) continue;

        const direction =
          Math.abs(delta) > 0.001
            ? Math.sign(delta)
            : deterministicFraction(`${left.nodeId}:${right.nodeId}`) > 0.5
              ? 1
              : -1;
        const push = (minimumAngularGap - Math.abs(delta)) * 0.54;
        adjustedAngles.set(left.nodeId, leftAngle - direction * push);
        adjustedAngles.set(right.nodeId, rightAngle + direction * push);
      }
    }

    const angularSpring = 0.018 * (1 - iteration / 90);
    for (const item of labeledGeometry) {
      const angle = adjustedAngles.get(item.nodeId) ?? item.originalAngle;
      adjustedAngles.set(
        item.nodeId,
        angle + normalizeAngle(item.originalAngle - angle) * angularSpring,
      );
    }
  }

  const points = neighborGeometry.map((geometry, index) => {
    const { nodeId, attributes, originalDistance } = geometry;
    const angle = adjustedAngles.get(nodeId) ?? geometry.originalAngle;
    const normalizedDistance = (originalDistance - minimumOriginalDistance) / originalDistanceSpan;
    const organicJitter = (deterministicFraction(`${centerNodeId}:${nodeId}`) - 0.5) * 200;
    const isLabeled = index < FOCUSED_NEIGHBOR_LABEL_LIMIT;
    const targetRadius = Math.max(
      400,
      400 + normalizedDistance * radialSpan + organicJitter + (isLabeled ? 220 : 0),
    );
    const anchorX = centerX + Math.cos(angle) * targetRadius;
    const anchorY = centerY + Math.sin(angle) * targetRadius;
    const labelLength = String(attributes.label || nodeId).length;

    return {
      nodeId,
      x: anchorX,
      y: anchorY,
      anchorX,
      anchorY,
      collisionRadius: isLabeled
        ? Math.min(Math.max(labelLength * 9 + 145, 220), 380)
        : 145,
    };
  });

  // Resolve only genuine collisions. A light spring toward each node's
  // original polar position keeps the constellation irregular and recognizable.
  for (let iteration = 0; iteration < 110; iteration += 1) {
    for (let leftIndex = 0; leftIndex < points.length; leftIndex += 1) {
      const left = points[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < points.length; rightIndex += 1) {
        const right = points[rightIndex];
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        let distance = Math.hypot(dx, dy);
        const minimumDistance = left.collisionRadius + right.collisionRadius;
        if (distance >= minimumDistance) continue;

        if (distance < 0.001) {
          const fallbackAngle =
            deterministicFraction(`${left.nodeId}:${right.nodeId}`) * Math.PI * 2;
          dx = Math.cos(fallbackAngle);
          dy = Math.sin(fallbackAngle);
          distance = 1;
        }
        const push = (minimumDistance - distance) * 0.52;
        const unitX = dx / distance;
        const unitY = dy / distance;
        left.x -= unitX * push;
        left.y -= unitY * push;
        right.x += unitX * push;
        right.y += unitY * push;
      }
    }

    const springStrength = Math.max(0.008, 0.04 * (1 - iteration / 110));
    for (const point of points) {
      point.x += (point.anchorX - point.x) * springStrength;
      point.y += (point.anchorY - point.y) * springStrength;
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const distanceFromCenter = Math.max(Math.hypot(dx, dy), 0.001);
      if (distanceFromCenter < 420) {
        const centerPush = 420 - distanceFromCenter;
        point.x += (dx / distanceFromCenter) * centerPush;
        point.y += (dy / distanceFromCenter) * centerPush;
      }
    }
  }

  // Finish with collision-only passes so the spring cannot leave a final overlap.
  for (let iteration = 0; iteration < 24; iteration += 1) {
    for (let leftIndex = 0; leftIndex < points.length; leftIndex += 1) {
      const left = points[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < points.length; rightIndex += 1) {
        const right = points[rightIndex];
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const distance = Math.max(Math.hypot(dx, dy), 0.001);
        const minimumDistance = left.collisionRadius + right.collisionRadius;
        if (distance >= minimumDistance) continue;
        const push = (minimumDistance - distance) * 0.52;
        left.x -= (dx / distance) * push;
        left.y -= (dy / distance) * push;
        right.x += (dx / distance) * push;
        right.y += (dy / distance) * push;
      }
    }
  }

  const positions = new Map(
    points.map((point) => [point.nodeId, { x: point.x, y: point.y }] as const),
  );
  const outerRadius = Math.max(
    ...points.map((point) => Math.hypot(point.x - centerX, point.y - centerY)),
    0,
  );
  return { neighbors, positions, outerRadius };
}

function applyFocusedNeighborhoodLayout(graph: Graph, focusedEntityId: string) {
  if (!graph.hasNode(focusedEntityId)) return;
  const focusedAttributes = graph.getNodeAttributes(focusedEntityId);
  const focusedX = typeof focusedAttributes.x === "number" ? focusedAttributes.x : 0;
  const focusedY = typeof focusedAttributes.y === "number" ? focusedAttributes.y : 0;
  const { neighbors, positions, outerRadius: outerNeighborRadius } = buildOrganicSpotlightPositions(
    graph,
    focusedEntityId,
    focusedX,
    focusedY,
  );
  const visibleIds = new Set([focusedEntityId, ...neighbors]);
  const contextNodes = graph.nodes().filter((nodeId) => !visibleIds.has(nodeId));
  const contextVectors = contextNodes.map((nodeId, index) => {
    const attributes = graph.getNodeAttributes(nodeId);
    const x = typeof attributes.x === "number" ? attributes.x : 0;
    const y = typeof attributes.y === "number" ? attributes.y : 0;
    const dx = x - focusedX;
    const dy = y - focusedY;
    const radius = Math.hypot(dx, dy);
    const fallbackAngle = index * Math.PI * (3 - Math.sqrt(5));
    return {
      nodeId,
      angle: radius > 0.001 ? Math.atan2(dy, dx) : fallbackAngle,
      radius,
    };
  });
  const contextInnerRadius = Math.max(outerNeighborRadius + 180, 440);
  const contextOuterRadius = Math.max(contextInnerRadius * 1.35, contextInnerRadius + 260);
  const maxContextRadius = Math.max(...contextVectors.map((vector) => vector.radius), 1);

  graph.mergeNodeAttributes(focusedEntityId, { x: 0, y: 0, forceLabel: true });

  neighbors.forEach((nodeId) => {
    const position = positions.get(nodeId);
    if (!position) return;
    graph.mergeNodeAttributes(nodeId, {
      x: position.x - focusedX,
      y: position.y - focusedY,
      forceLabel: true,
    });
  });

  contextVectors.forEach(({ nodeId, angle, radius }) => {
    const normalizedRadius = Math.sqrt(Math.min(Math.max(radius / maxContextRadius, 0), 1));
    const contextRadius = contextInnerRadius + normalizedRadius * (contextOuterRadius - contextInnerRadius);
    graph.mergeNodeAttributes(nodeId, {
      x: Math.cos(angle) * contextRadius,
      y: Math.sin(angle) * contextRadius,
      forceLabel: false,
    });
  });
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
  layoutEngine: GraphLayoutEngine,
) {
  const nodePart = entities
    .map((entity) => entity.id)
    .sort()
    .join("|");

  const edgePart = edges
    .map((edge) => {
      const weight = edge.similarity ?? edge.weight ?? 0.5;
      const predicate = edge.predicate ?? edge.relationship_type?.slug ?? edge.type ?? "untyped";
      return `${edge.id}:${edge.source_id}->${edge.target_id}:${predicate}:${weight.toFixed(3)}`;
    })
    .sort()
    .join("|");

  return `${LAYOUT_VERSION}::${layoutEngine}::${layoutDensity}::${minSimilarity.toFixed(3)}::${nodePart}::${edgePart}`;
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
  onClearSelection,
  minSimilarity = 0,
  height = 700,
  layoutDensity = "expanded",
  layoutEngine = "clusters",
  focusedEntityId = null,
}: SigmaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const onSelectEntityRef = useRef(onSelectEntity);
  const onClearSelectionRef = useRef(onClearSelection);
  const [hoveredSummary, setHoveredSummary] = useState<{ name: string; connections: number } | null>(null);
  const [cameraRatio, setCameraRatio] = useState(1);
  const [exploredGraphKey, setExploredGraphKey] = useState<string | null>(null);
  const [viewportActions, setViewportActions] = useState<{
    fit: () => void;
    panLeft: () => void;
    panRight: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
  }>({
    fit: () => undefined,
    panLeft: () => undefined,
    panRight: () => undefined,
    zoomIn: () => undefined,
    zoomOut: () => undefined,
  });

  useEffect(() => {
    onSelectEntityRef.current = onSelectEntity;
  }, [onSelectEntity]);

  useEffect(() => {
    onClearSelectionRef.current = onClearSelection;
  }, [onClearSelection]);

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

  const focusedEntity = useMemo(
    () => (focusedEntityId ? entities.find((entity) => entity.id === focusedEntityId) || null : null),
    [entities, focusedEntityId],
  );
  const focusedConnectionCount = useMemo(() => {
    if (!focusedEntityId) return 0;
    const neighborIds = new Set<string>();

    for (const edge of edges) {
      if (edge.source_id === focusedEntityId) neighborIds.add(edge.target_id);
      else if (edge.target_id === focusedEntityId) neighborIds.add(edge.source_id);
    }

    return neighborIds.size;
  }, [edges, focusedEntityId]);
  const focusedContextNodeCount = focusedEntityId
    ? Math.max(entities.length - focusedConnectionCount - 1, 0)
    : 0;

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
    () => buildLayoutKey(entities, edges, minSimilarity, layoutDensity, layoutEngine),
    [edges, entities, layoutDensity, layoutEngine, minSimilarity],
  );
  const minLayoutSpan = MIN_LAYOUT_SPAN_BY_DENSITY[layoutDensity];

  useEffect(() => {
    if (!containerRef.current || entities.length === 0) return;

    const graph = buildGraphologyGraph(entities, edges, minSimilarity, layoutDensity);
    const layoutKey = graphInteractionKey;
    const cachedLayout = readStoredLayout(layoutKey);
    const reusedCachedLayout = applyLayoutSnapshot(graph, cachedLayout);

    if (graph.order > 0 && !reusedCachedLayout) {
      // The correspondence archive arrives from the adapter already laid out as
      // radial category clusters. "clusters" keeps that deterministic galaxy as
      // is; "organic" relaxes it with a *gentle* ForceAtlas2 pass that nudges
      // nodes apart without collapsing the clusters into one knot. Non-
      // correspondence graphs (Parallax) always use the standard force layout.
      const useDeterministicClusters =
        Boolean(graphSummary?.isCorrespondenceGraph) && layoutEngine === "clusters";

      if (!useDeterministicClusters) {
        const organicSettings =
          layoutDensity === "expanded"
            ? { gravity: 0.015, scalingRatio: 70, iterations: 90 }
            : layoutDensity === "compact"
              ? { gravity: 0.04, scalingRatio: 38, iterations: 90 }
              : { gravity: 0.025, scalingRatio: 52, iterations: 90 };
        forceAtlas2.assign(graph, {
          iterations: graphSummary?.isCorrespondenceGraph ? organicSettings.iterations : 260,
          settings: {
            gravity: graphSummary?.isCorrespondenceGraph ? organicSettings.gravity : 0.08,
            scalingRatio: graphSummary?.isCorrespondenceGraph ? organicSettings.scalingRatio : 8,
            // Spread leaf nodes out from their hubs instead of stacking them,
            // which is what produced the central knot before.
            outboundAttractionDistribution: graphSummary?.isCorrespondenceGraph,
            strongGravityMode: false,
            barnesHutOptimize: graph.order > 300,
          },
        });
      }

      normalizeGraphLayout(graph, minLayoutSpan);
      writeStoredLayout(layoutKey, snapshotLayout(graph));
    }

    if (focusedEntityId) applyFocusedNeighborhoodLayout(graph, focusedEntityId);

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
      enableCameraPanning: true,
      enableCameraZooming: true,
      enableCameraRotation: true,
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
      panLeft: () => {
        const camera = renderer.getCamera();
        void camera.animate({ x: camera.x - camera.ratio * 0.16 }, { duration: 160 });
      },
      panRight: () => {
        const camera = renderer.getCamera();
        void camera.animate({ x: camera.x + camera.ratio * 0.16 }, { duration: 160 });
      },
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
    let hoveredNode: string | null = null;
    let selectedNode: string | null = focusedEntityId && graph.hasNode(focusedEntityId) ? focusedEntityId : null;
    let neighbors = new Set<string>();
    const syncSelectedNodeViewportData = () => {
      if (!containerRef.current) return;
      if (!selectedNode) {
        delete containerRef.current.dataset.selectedNodeViewportX;
        delete containerRef.current.dataset.selectedNodeViewportY;
        return;
      }
      const selectedDisplayData = renderer.getNodeDisplayData(selectedNode);
      if (!selectedDisplayData) return;
      containerRef.current.dataset.selectedNodeGraphX = String(selectedDisplayData.x);
      containerRef.current.dataset.selectedNodeGraphY = String(selectedDisplayData.y);
      const viewportPosition = renderer.framedGraphToViewport(selectedDisplayData);
      containerRef.current.dataset.selectedNodeViewportX = String(viewportPosition.x);
      containerRef.current.dataset.selectedNodeViewportY = String(viewportPosition.y);
    };
    const handleCameraUpdate = () => {
      setCameraRatio(camera.ratio);
      if (containerRef.current) {
        const state = camera.getState();
        containerRef.current.dataset.cameraX = String(state.x);
        containerRef.current.dataset.cameraY = String(state.y);
        containerRef.current.dataset.cameraRatio = String(state.ratio);
        containerRef.current.dataset.cameraAngle = String(state.angle);
        syncSelectedNodeViewportData();
      }
    };
    camera.on("updated", handleCameraUpdate);
    renderer.on("afterRender", syncSelectedNodeViewportData);
    handleCameraUpdate();

    let rotationDrag: { startX: number; startAngle: number } | null = null;
    const graphContainer = containerRef.current;
    let hoverPositionSnapshot = new Map<string, { x: number; y: number }>();
    const restoreHoverPositions = () => {
      if (hoverPositionSnapshot.size === 0) return;
      graph.updateEachNodeAttributes((nodeId, attributes) => {
        const snapshot = hoverPositionSnapshot.get(nodeId);
        if (!snapshot) return attributes;
        return {
          ...attributes,
          x: snapshot.x,
          y: snapshot.y,
        };
      });
      hoverPositionSnapshot = new Map();
      graphContainer.dataset.hoverLayout = "restored";
    };
    const spreadHoverNeighborhood = (nodeId: string) => {
      restoreHoverPositions();
      const attributes = graph.getNodeAttributes(nodeId);
      const centerX = typeof attributes.x === "number" ? attributes.x : 0;
      const centerY = typeof attributes.y === "number" ? attributes.y : 0;
      const spotlightLayout = buildOrganicSpotlightPositions(graph, nodeId, centerX, centerY);

      for (const neighborId of spotlightLayout.neighbors) {
        const neighborAttributes = graph.getNodeAttributes(neighborId);
        hoverPositionSnapshot.set(neighborId, {
          x: typeof neighborAttributes.x === "number" ? neighborAttributes.x : 0,
          y: typeof neighborAttributes.y === "number" ? neighborAttributes.y : 0,
        });
      }

      graph.updateEachNodeAttributes((candidateNodeId, candidateAttributes) => {
        const position = spotlightLayout.positions.get(candidateNodeId);
        if (!position) return candidateAttributes;
        return {
          ...candidateAttributes,
          x: position.x,
          y: position.y,
        };
      });
      graphContainer.dataset.hoverLayout = "spread";
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();
    const handleRotationStart = (event: MouseEvent) => {
      if (event.button !== 2) return;
      rotationDrag = { startX: event.clientX, startAngle: camera.angle };
      event.preventDefault();
      event.stopPropagation();
    };
    const handleRotationMove = (event: MouseEvent) => {
      if (!rotationDrag) return;
      camera.setState({ angle: rotationDrag.startAngle + (event.clientX - rotationDrag.startX) * 0.006 });
      event.preventDefault();
    };
    const handleRotationEnd = (event: MouseEvent) => {
      if (event.button === 2) rotationDrag = null;
    };
    const handleTrackpadPan = (event: WheelEvent) => {
      const horizontalDelta = event.shiftKey ? event.deltaY : event.deltaX;
      const isHorizontalGesture = event.shiftKey || Math.abs(event.deltaX) > Math.max(2, Math.abs(event.deltaY) * 0.65);
      if (!isHorizontalGesture) return;
      const state = camera.getState();
      camera.setState({ x: state.x + horizontalDelta * state.ratio * 0.0014 });
      event.preventDefault();
      event.stopPropagation();
    };
    graphContainer.addEventListener("contextmenu", handleContextMenu);
    graphContainer.addEventListener("mousedown", handleRotationStart, true);
    graphContainer.addEventListener("wheel", handleTrackpadPan, { capture: true, passive: false });
    document.addEventListener("mousemove", handleRotationMove);
    document.addEventListener("mouseup", handleRotationEnd);

    // Hover temporarily isolates and fans out a node's neighborhood. The anchor
    // stays fixed under the pointer while genuine collisions are pushed apart.
    // Selection preserves that spotlight until the user explicitly clears it.
    const applyInteractionState = () => {
      const activeNode = hoveredNode ?? selectedNode;
      const activeNeighbors = activeNode ? new Set(graph.neighbors(activeNode)) : new Set<string>();
      const interactionMode = hoveredNode ? "hover" : selectedNode ? "locked" : "rest";
      const activeAttributes = activeNode ? graph.getNodeAttributes(activeNode) : null;
      const spotlightLayout = activeNode && activeAttributes
        ? buildOrganicSpotlightPositions(
            graph,
            activeNode,
            typeof activeAttributes.x === "number" ? activeAttributes.x : 0,
            typeof activeAttributes.y === "number" ? activeAttributes.y : 0,
          )
        : null;
      const activeLabeledNeighborIds = new Set(
        (spotlightLayout?.neighbors || []).slice(0, FOCUSED_NEIGHBOR_LABEL_LIMIT),
      );

      graphContainer.dataset.interactionMode = interactionMode;
      graphContainer.dataset.activeNodeId = activeNode || "";
      graphContainer.dataset.visibleNodeCount = String(activeNode ? activeNeighbors.size + 1 : graph.order);
      graphContainer.dataset.hiddenNodeCount = String(
        activeNode ? Math.max(graph.order - activeNeighbors.size - 1, 0) : 0,
      );

      renderer.setSetting("nodeReducer", (candidateNode, data) => {
        const degree = graph.getNodeAttribute(candidateNode, "degree") as number | undefined;
        const isLeaf = Boolean(graph.getNodeAttribute(candidateNode, "isLeaf"));
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

        if (!activeNode) return reducedData;

        if (candidateNode === activeNode) {
          return {
            ...reducedData,
            hidden: false,
            zIndex: 12,
            size: baseSize * (hoveredNode ? 2 : 2.25),
            color: "#fff1a8",
            forceLabel: true,
            highlighted: true,
          };
        }

        if (activeNeighbors.has(candidateNode)) {
          const showFocusedNeighborLabel = activeLabeledNeighborIds.has(candidateNode);
          return {
            ...reducedData,
            hidden: false,
            zIndex: 7,
            size: Math.min(baseSize * (isDenseGraph ? 1.08 : 1.15), isDenseGraph ? 13 : 16),
            color: data.color ?? "#c8882a",
            forceLabel: showFocusedNeighborLabel,
            label: showFocusedNeighborLabel ? data.label : "",
          };
        }

        return {
          ...reducedData,
          hidden: true,
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
          const hasManyFocusedConnections = activeNeighbors.size > 30;
          return {
            ...data,
            hidden: false,
            color: isDerived
              ? "rgba(94, 234, 212, 0.9)"
              : hasManyFocusedConnections
                ? "rgba(224, 184, 93, 0.82)"
                : "#e0b85d",
            size: hasManyFocusedConnections
              ? Math.max((data.size ?? 1.8) * 0.78, 1.2)
              : Math.max((data.size ?? 1.8) * (isDerived ? 1.9 : 1.65), isDerived ? 3.1 : 2.4),
            zIndex: 10,
          };
        }

        if (focusedEntityId && selectedNode === focusedEntityId) {
          return {
            ...data,
            hidden: true,
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

    if (selectedNode) {
      setExploredGraphKey(layoutKey);
      if (focusedEntityId) focusCameraOnNeighborhood(renderer, graph, selectedNode);
      else focusCameraOnNode(renderer, graph, selectedNode, isDenseGraph);
    }

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
      spreadHoverNeighborhood(node);
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
      restoreHoverPositions();
      hoveredNode = null;
      neighbors.clear();
      setHoveredSummary(null);
      applyInteractionState();
    });

    const selectNode = (node: string) => {
      selectedNode = node;
      setExploredGraphKey(layoutKey);
      applyInteractionState();
      handleCameraUpdate();
      focusCameraOnNode(renderer, graph, node, isDenseGraph);
      const attrs = graph.getNodeAttributes(node);
      if (attrs.originalData) {
        onSelectEntityRef.current(attrs.originalData as GraphEntity);
      }
    };

    renderer.on("clickNode", ({ node }) => {
      selectNode(node);
    });

    renderer.on("clickStage", ({ event }) => {
      let nearestNode: string | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      graph.forEachNode((node) => {
        const displayData = renderer.getNodeDisplayData(node);
        if (!displayData || displayData.hidden) return;
        const viewport = renderer.framedGraphToViewport(displayData);
        const distance = Math.hypot(viewport.x - event.x, viewport.y - event.y);
        const hitRadius = Math.max(18, renderer.scaleSize(displayData.size ?? 1) * 1.5);
        if (distance <= hitRadius && distance < nearestDistance) {
          nearestNode = node;
          nearestDistance = distance;
        }
      });

      if (nearestNode) {
        selectNode(nearestNode);
        return;
      }

      selectedNode = null;
      if (isVeryDenseGraph) setExploredGraphKey(layoutKey);
      applyInteractionState();
      onClearSelectionRef.current?.();
    });

    return () => {
      if (twinkleRafId) cancelAnimationFrame(twinkleRafId);
      resizeObserver.disconnect();
      camera.removeListener("updated", handleCameraUpdate);
      renderer.removeListener("afterRender", syncSelectedNodeViewportData);
      graphContainer.removeEventListener("contextmenu", handleContextMenu);
      graphContainer.removeEventListener("mousedown", handleRotationStart, true);
      graphContainer.removeEventListener("wheel", handleTrackpadPan, true);
      document.removeEventListener("mousemove", handleRotationMove);
      document.removeEventListener("mouseup", handleRotationEnd);
      setViewportActions({
        fit: () => undefined,
        panLeft: () => undefined,
        panRight: () => undefined,
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
    focusedEntityId,
    focusedConnectionCount,
    layoutDensity,
    layoutEngine,
    isDenseGraph,
    isVeryDenseGraph,
    labelSizeThreshold,
    minLayoutSpan,
    minSimilarity,
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

      {graphSummary?.isCorrespondenceGraph && !focusedEntityId && categorySummary.length > 0 && (
        <div className="pointer-events-none absolute left-4 top-24 z-20 max-w-[320px] rounded-2xl border border-amber-900/25 bg-black/35 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.28em] text-amber-500/55">Category Clusters</p>
          <p className="mt-2 text-xs leading-5 text-amber-100/70">
            Correspondences are grouped by the archive&apos;s category field. These are taxonomy clusters, not inferred communities.
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

      <div
        ref={containerRef}
        className="relative z-20 w-full cursor-grab active:cursor-grabbing"
        style={{ height }}
        data-focused-connection-count={focusedEntityId ? focusedConnectionCount : undefined}
        data-context-node-count={focusedEntityId ? focusedContextNodeCount : undefined}
      />

      {focusedEntity && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-400/45 bg-black/80 px-4 py-2 text-center shadow-[0_0_28px_rgba(245,190,70,0.22)] backdrop-blur-md" role="status" aria-live="polite">
          <p className="font-[family-name:var(--font-cinzel)] text-[9px] uppercase tracking-[0.24em] text-amber-400/70">Locked node</p>
          <p className="mt-0.5 font-[family-name:var(--font-cormorant)] text-lg leading-none text-amber-100">{focusedEntity.name}</p>
          <p className="mt-1 text-[10px] text-zinc-400">
            Showing {focusedConnectionCount} direct {focusedConnectionCount === 1 ? "connection" : "connections"}
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-zinc-500">← / → traverse · Esc unlock</p>
        </div>
      )}

      <div className="absolute left-4 top-4 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-amber-900/30 bg-black/55 px-2 py-2 backdrop-blur-md">
          {[
            { label: "Fit graph", shortLabel: "Fit", icon: Maximize2, onClick: viewportActions.fit },
            { label: "Pan left", shortLabel: "", icon: ArrowLeft, onClick: viewportActions.panLeft },
            { label: "Pan right", shortLabel: "", icon: ArrowRight, onClick: viewportActions.panRight },
            { label: "Zoom out", shortLabel: "", icon: Minus, onClick: viewportActions.zoomOut },
            { label: "Zoom in", shortLabel: "", icon: Plus, onClick: viewportActions.zoomIn },
          ].map((control) => (
            <button
              key={control.label}
              type="button"
              onClick={control.onClick}
              aria-label={control.label}
              title={control.label}
              className="pointer-events-auto flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 text-[10px] uppercase tracking-[0.14em] text-amber-100/75 transition-colors hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <control.icon className="h-3.5 w-3.5" />
              {control.shortLabel}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-md">
          Zoom {(1 / Math.max(cameraRatio, 0.0001)).toFixed(1)}x
        </div>
      </div>

      {graphSummary?.isCorrespondenceGraph && isVeryDenseGraph && exploredGraphKey !== graphInteractionKey && !hoveredSummary && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-amber-700/25 bg-black/55 px-4 py-3 text-center text-[11px] leading-5 text-amber-100/68 backdrop-blur-md">
          Start with a shimmer of structure, not every name at once. A few brighter beacons are scattered through the archive to give you places to begin.
        </div>
      )}

      {hoveredSummary && (
        <div
          className="pointer-events-none absolute right-0 top-5 z-30"
          style={{ display: "flex", alignItems: "stretch", flexDirection: "row-reverse" }}
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
              background: "linear-gradient(to left, rgba(6,4,2,0.82), rgba(6,4,2,0))",
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

      <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex gap-2 opacity-60 transition-opacity duration-300 group-hover/graph:opacity-100">
        {["Wheel / Zoom", "Drag or horizontal swipe / Pan", "Right-drag / Rotate", "Click / Open details"].map((hint) => (
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
