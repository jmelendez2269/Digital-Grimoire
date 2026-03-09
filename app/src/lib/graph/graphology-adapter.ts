import Graph from "graphology";

// ─── Colour maps (mirrored from existing components) ─────────────────────────

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

const DEFAULT_NODE_COLOR = "#22D3EE";

// ─── Types for incoming API data ──────────────────────────────────────────────

export interface GraphEntity {
    id: string;
    name: string;
    category?: string;
    type?: { color?: string; label?: string } | string;
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
    relationship_type?: { color?: string; label?: string };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function resolveNodeColor(entity: GraphEntity): string {
    // Correspondence entity — use type colour first
    if (entity.type && typeof entity.type === "object" && entity.type.color) {
        return entity.type.color;
    }
    // Parallax concept — use tradition → colour map
    if (entity.tradition_ref?.color) return entity.tradition_ref.color;
    if (entity.tradition) {
        return TRADITION_COLORS[entity.tradition] ?? DEFAULT_NODE_COLOR;
    }
    // Correspondence category fallback
    if (entity.category) {
        return TRADITION_COLORS[entity.category] ?? DEFAULT_NODE_COLOR;
    }
    return DEFAULT_NODE_COLOR;
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

/**
 * Converts raw Supabase API entity/edge arrays into a Graphology MultiGraph
 * ready for Sigma.js to render.
 *
 * @param entities  Array of entities from /api/graph/entities or /api/concepts
 * @param edges     Array of edges from /api/graph/edges or /api/concepts/relationships
 * @param minSimilarity  Only include edges at or above this threshold (0–1)
 */
export function buildGraphologyGraph(
    entities: GraphEntity[],
    edges: GraphEdge[],
    minSimilarity = 0
): Graph {
    const graph = new Graph({ multi: false, type: "undirected" });

    // ── Nodes ──────────────────────────────────────────────────────────────────
    entities.forEach((entity) => {
        if (graph.hasNode(entity.id)) return; // guard duplicates

        graph.addNode(entity.id, {
            label: entity.name,
            // Random initial positions — ForceAtlas2 will settle them
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            size: 6,
            color: resolveNodeColor(entity),
            // Carry the original data for click handlers / modals
            originalData: entity,
        });
    });

    // Build a set of known node IDs for fast lookup
    const nodeSet = new Set(entities.map((e) => e.id));

    // ── Edges ──────────────────────────────────────────────────────────────────
    edges.forEach((edge) => {
        const weight = edge.similarity ?? edge.weight ?? 0.5;

        // Filter by similarity threshold
        if (weight < minSimilarity) return;

        // Skip edges whose endpoints are not in our node set
        if (!nodeSet.has(edge.source_id) || !nodeSet.has(edge.target_id)) return;

        // Sigma doesn't support self-loops in force layout well
        if (edge.source_id === edge.target_id) return;

        // Graphology throws if the same undirected edge already exists
        if (graph.hasEdge(edge.source_id, edge.target_id)) return;

        graph.addEdge(edge.source_id, edge.target_id, {
            size: 0.5 + weight * 2,
            color: "#4B5563",
            originalData: edge,
        });
    });

    return graph;
}
