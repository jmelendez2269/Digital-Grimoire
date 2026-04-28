import Graph from "graphology";

const TRADITION_COLORS: Record<string, string> = {
  Buddhist: "#B48F4A",
  Christian: "#22D3EE",
  Taoist: "#10B981",
  Hindu: "#F97316",
  Islamic: "#EF4444",
  Jewish: "#6366F1",
  Quantum: "#A855F7",
  Philosophy: "#EC4899",
  Hermetic: "#F59E0B",
  Other: "#6B7280",
};

const CORRESPONDENCE_ANCHOR_COLOR = "#f5d084";
const CORRESPONDENCE_NODE_COLOR = "#c8882a";

const DEFAULT_NODE_COLOR = "#22D3EE";
const DEFAULT_EDGE_COLOR = "rgba(168, 120, 36, 0.16)";
const EDGE_TYPE_COLORS: Record<string, string> = {
  corresponds_to: "rgba(232, 176, 72, 0.18)",
  associated_with: "rgba(79, 185, 255, 0.14)",
  refines: "rgba(158, 110, 255, 0.18)",
  shares_correspondence_with: "rgba(45, 212, 191, 0.22)",
};

export interface GraphEntity {
  id: string;
  name: string;
  category?: string | null;
  type?: { slug?: string; color?: string; label?: string } | string;
  tradition?: string;
  tradition_ref?: { color?: string; label?: string };
  slug?: string;
  aliases?: string[];
  description?: string;
  lenses?: string[];
  short_definition?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  type?: string;
  weight?: number;
  similarity?: number;
  relationship_type?: { slug?: string; color?: string; label?: string };
}

export type GraphLayoutDensity = "compact" | "balanced" | "expanded";

function normalizeCategoryKey(value?: string | null) {
  return value?.trim().toLowerCase().replace(/[\s/-]+/g, "_") ?? "";
}

function resolveCorrespondenceSlug(entity: GraphEntity) {
  if (entity.category) return normalizeCategoryKey(entity.category);
  if (entity.type && typeof entity.type === "object" && entity.type.slug) {
    return normalizeCategoryKey(entity.type.slug);
  }
  if (typeof entity.type === "string") return normalizeCategoryKey(entity.type);
  return "";
}

function isCorrespondenceEntity(entity: GraphEntity) {
  if (typeof entity.category === "string" && entity.category.length > 0) return true;
  if (entity.type && typeof entity.type === "object" && entity.type.slug) return true;
  return false;
}

export function resolveNodeColor(entity: GraphEntity): string {
  // Correspondence archive uses a unified warm palette so the web reads as one
  // resonant fabric instead of a scatter of unrelated categories. Anchors
  // (issues / intentions / powers) are slightly brighter to hold the eye.
  if (isCorrespondenceEntity(entity)) {
    const slug = resolveCorrespondenceSlug(entity);
    if (slug === "issue_intention_power" || slug.includes("intention") || slug.includes("power")) {
      return CORRESPONDENCE_ANCHOR_COLOR;
    }
    return CORRESPONDENCE_NODE_COLOR;
  }

  if (entity.tradition_ref?.color) return entity.tradition_ref.color;
  if (entity.tradition) {
    return TRADITION_COLORS[entity.tradition] ?? DEFAULT_NODE_COLOR;
  }
  if (entity.type && typeof entity.type === "object" && entity.type.color) {
    return entity.type.color;
  }
  return DEFAULT_NODE_COLOR;
}

function resolveEdgeType(edge: GraphEdge) {
  return edge.relationship_type?.slug ?? edge.type ?? "untyped";
}

function resolveEdgeColor(edge: GraphEdge) {
  const edgeType = resolveEdgeType(edge);
  return edge.relationship_type?.color ?? EDGE_TYPE_COLORS[edgeType] ?? DEFAULT_EDGE_COLOR;
}

function getCorrespondenceClusterLayout(density: GraphLayoutDensity) {
  switch (density) {
    case "compact":
      return { radius: 400, nodeSpread: 104, coreSpread: 76 };
    case "expanded":
      return { radius: 640, nodeSpread: 156, coreSpread: 112 };
    case "balanced":
    default:
      return { radius: 500, nodeSpread: 128, coreSpread: 92 };
  }
}

function positionCorrespondenceClusters(graph: Graph, density: GraphLayoutDensity) {
  const layout = getCorrespondenceClusterLayout(density);
  const groupedNodeIds = new Map<string, string[]>();

  graph.forEachNode((node) => {
    const originalData = graph.getNodeAttribute(node, "originalData") as GraphEntity | undefined;
    const categoryKey = normalizeCategoryKey(originalData?.category) || "other";
    const group = groupedNodeIds.get(categoryKey) || [];
    group.push(node);
    groupedNodeIds.set(categoryKey, group);
  });

  const categories = [...groupedNodeIds.entries()].sort((left, right) => {
    if (left[0] === "issue_intention_power") return -1;
    if (right[0] === "issue_intention_power") return 1;
    const sizeDelta = right[1].length - left[1].length;
    if (sizeDelta !== 0) return sizeDelta;
    return left[0].localeCompare(right[0]);
  });

  const orbitingCategories = categories.filter(([category]) => category !== "issue_intention_power");
  const clusterCenterByCategory = new Map<string, { x: number; y: number }>();
  clusterCenterByCategory.set("issue_intention_power", { x: 0, y: 0 });

  orbitingCategories.forEach(([category], index) => {
    const angle = (index * 2 * Math.PI) / Math.max(orbitingCategories.length, 1);
    clusterCenterByCategory.set(category, {
      x: Math.cos(angle) * layout.radius,
      y: Math.sin(angle) * layout.radius,
    });
  });

  categories.forEach(([category, nodeIds]) => {
    const center = clusterCenterByCategory.get(category) || { x: 0, y: 0 };
    const spread = category === "issue_intention_power" ? layout.coreSpread : layout.nodeSpread;

    nodeIds
      .sort((left, right) => {
        const leftDegree = graph.getNodeAttribute(left, "degree") as number | undefined;
        const rightDegree = graph.getNodeAttribute(right, "degree") as number | undefined;
        return (rightDegree ?? 0) - (leftDegree ?? 0);
      })
      .forEach((nodeId, index) => {
        if (index === 0) {
          graph.mergeNodeAttributes(nodeId, {
            x: center.x,
            y: center.y,
            clusterKey: category,
            clusterCenterX: center.x,
            clusterCenterY: center.y,
          });
          return;
        }

        const angle = index * 2.399963229728653;
        const radius = Math.sqrt(index) * spread;
        graph.mergeNodeAttributes(nodeId, {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
          clusterKey: category,
          clusterCenterX: center.x,
          clusterCenterY: center.y,
        });
      });
  });
}

export function buildGraphologyGraph(
  entities: GraphEntity[],
  edges: GraphEdge[],
  minSimilarity = 0,
  layoutDensity: GraphLayoutDensity = "balanced",
): Graph {
  const graph = new Graph({ multi: false, type: "undirected" });

  entities.forEach((entity) => {
    if (graph.hasNode(entity.id)) return;

    graph.addNode(entity.id, {
      label: entity.name,
      x: 0,
      y: 0,
      size: 4.8,
      color: resolveNodeColor(entity),
      forceLabel: false,
      originalData: entity,
    });
  });

  const nodeSet = new Set(entities.map((entity) => entity.id));

  edges.forEach((edge) => {
    const weight = edge.similarity ?? edge.weight ?? 0.5;

    if (weight < minSimilarity) return;
    if (!nodeSet.has(edge.source_id) || !nodeSet.has(edge.target_id)) return;
    if (edge.source_id === edge.target_id) return;
    if (graph.hasEdge(edge.source_id, edge.target_id)) return;

    graph.addEdge(edge.source_id, edge.target_id, {
      size:
        resolveEdgeType(edge) === "shares_correspondence_with"
          ? 1.5 + weight * 1.9
          : 1.1 + weight * 1.4,
      color: resolveEdgeColor(edge),
      edgeType: resolveEdgeType(edge),
      isDerived: resolveEdgeType(edge) === "shares_correspondence_with",
      originalData: edge,
    });
  });

  if (graph.order > 0) {
    graph.forEachNode((node) => {
      const degree = graph.degree(node);
      const originalData = graph.getNodeAttribute(node, "originalData") as GraphEntity | undefined;
      const category = normalizeCategoryKey(originalData?.category);
      const isAnchorCategory = category === "issue_intention_power";
      const forceLabel = degree >= 6 || isAnchorCategory;
      const size = isAnchorCategory
        ? 8.8 + Math.min(degree, 12) * 0.55
        : 4.8 + Math.min(degree, 12) * 0.7;

      graph.mergeNodeAttributes(node, {
        size,
        degree,
        isLeaf: degree <= 1,
        forceLabel,
      });
    });

    const isCorrespondenceArchive = entities.some((entity) => typeof entity.category === "string" && entity.category.length > 0);

    if (isCorrespondenceArchive) {
      positionCorrespondenceClusters(graph, layoutDensity);
    } else {
      const radius = 500;
      const nodes = graph.nodes();
      nodes.forEach((node, index) => {
        const angle = (index * 2 * Math.PI) / nodes.length;
        graph.setNodeAttribute(node, "x", radius * Math.cos(angle));
        graph.setNodeAttribute(node, "y", radius * Math.sin(angle));
      });
    }
  }

  return graph;
}
