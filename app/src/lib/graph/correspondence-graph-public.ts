import type { CorrespondenceEntity } from "@/lib/types";

export const PUBLIC_CORRESPONDENCE_GRAPH_SCHEMA = "correspondence-graph/v2";

/** Wire entity: everything the public /graph correspondences UI needs without dossier fields. */
export type PublicCorrespondenceEntityWire = {
  id: string;
  name: string;
  category: string | null;
  slug?: string;
  aliases?: string[];
  type?: {
    slug: string;
    label: string;
    color?: string;
    icon?: string;
  };
};

export type PublicCorrespondenceEdgeWire = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight?: number;
};

export type PublicCorrespondenceGraphWire = {
  schemaVersion: typeof PUBLIC_CORRESPONDENCE_GRAPH_SCHEMA;
  entityCount: number;
  edgeCount: number;
  entities: PublicCorrespondenceEntityWire[];
  edges: PublicCorrespondenceEdgeWire[];
};

export type PublicCorrespondenceRelationship = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight?: number;
  similarity?: number;
};

type RawEntityRow = {
  id: string;
  slug?: string | null;
  name: string;
  category?: string | null;
  aliases?: string[] | null;
  description?: string | null;
  lenses?: string[] | null;
  created_at?: string;
  updated_at?: string;
  type?: {
    id?: string;
    slug?: string;
    label?: string;
    color?: string | null;
    icon?: string | null;
  } | null;
};

type RawEdgeRow = {
  id?: string;
  source_id: string;
  target_id: string;
  type: string;
  weight?: number | null;
  confidence?: string | null;
  source_citation?: string | null;
  notes?: string | null;
  created_at?: string;
  relationship_type?: unknown;
};

/** Legacy full-fidelity projection (pre-v2 API shape). Used for size regression tests. */
export function projectLegacyPublicCorrespondenceGraph(
  entities: RawEntityRow[],
  edges: RawEdgeRow[],
): { entities: RawEntityRow[]; edges: RawEdgeRow[] } {
  return {
    entities: entities.map((entity) => ({
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      category: entity.category,
      aliases: entity.aliases,
      description: entity.description,
      lenses: entity.lenses,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      type: entity.type
        ? {
            id: entity.type.id,
            slug: entity.type.slug,
            label: entity.type.label,
            color: entity.type.color,
            icon: entity.type.icon,
          }
        : undefined,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source_id: edge.source_id,
      target_id: edge.target_id,
      type: edge.type,
      weight: edge.weight,
      confidence: edge.confidence,
      source_citation: edge.source_citation,
      notes: edge.notes,
      created_at: edge.created_at,
      relationship_type: edge.relationship_type,
    })),
  };
}

export function projectPublicCorrespondenceGraph(
  entities: RawEntityRow[],
  edges: RawEdgeRow[],
): PublicCorrespondenceGraphWire {
  return {
    schemaVersion: PUBLIC_CORRESPONDENCE_GRAPH_SCHEMA,
    entityCount: entities.length,
    edgeCount: edges.length,
    entities: entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      category: entity.category ?? null,
      ...(entity.slug ? { slug: entity.slug } : {}),
      ...(entity.aliases && entity.aliases.length > 0
        ? { aliases: entity.aliases }
        : {}),
      ...(entity.type?.slug || entity.type?.label
        ? {
            type: {
              slug: entity.type?.slug || entity.category || "unknown",
              label: entity.type?.label || entity.category || "Unknown",
              ...(entity.type?.color ? { color: entity.type.color } : {}),
              ...(entity.type?.icon ? { icon: entity.type.icon } : {}),
            },
          }
        : {}),
    })),
    edges: edges.map((edge) => {
      if (!edge.id) {
        throw new Error("PUBLIC_CORRESPONDENCE_GRAPH_EDGE_ID_REQUIRED");
      }
      return {
        id: edge.id,
        source_id: edge.source_id,
        target_id: edge.target_id,
        type: edge.type,
        ...(edge.weight != null ? { weight: edge.weight } : {}),
      };
    }),
  };
}

export function expandPublicCorrespondenceGraph(
  wire: PublicCorrespondenceGraphWire,
): {
  entities: CorrespondenceEntity[];
  relationships: PublicCorrespondenceRelationship[];
} {
  const entities: CorrespondenceEntity[] = wire.entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    category: entity.category,
    slug: entity.slug,
    aliases: entity.aliases,
    type: entity.type
      ? {
          id: entity.type.slug,
          slug: entity.type.slug,
          label: entity.type.label,
          color: entity.type.color,
          icon: entity.type.icon,
        }
      : undefined,
  }));

  const relationships: PublicCorrespondenceRelationship[] = wire.edges.map(
    (edge) => {
      const weight = edge.weight ?? 0.5;
      return {
        id: edge.id,
        source_id: edge.source_id,
        target_id: edge.target_id,
        type: edge.type,
        weight,
        similarity: weight,
      };
    },
  );

  return { entities, relationships };
}
