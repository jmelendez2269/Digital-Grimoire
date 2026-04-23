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

export function buildGraphologyGraph(
  entities: GraphEntity[],
  edges: GraphEdge[],
  minSimilarity = 0
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

    const radius = 500;
    const nodes = graph.nodes();
    nodes.forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / nodes.length;
      graph.setNodeAttribute(node, "x", radius * Math.cos(angle));
      graph.setNodeAttribute(node, "y", radius * Math.sin(angle));
    });
  }

  return graph;
}
