"use client";

import SigmaGraph from "@/components/graph/SigmaGraph";
import { GraphEntity, GraphEdge } from "@/lib/graph/graphology-adapter";

interface Entity {
  id: string;
  slug?: string;
  name: string;
  category: string;
  type?: string | { color?: string; label?: string };
  aliases?: string[];
  description?: string;
  lenses?: string[];
}

interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
}

/**
 * GraphView — thin wrapper around SigmaGraph.
 * Keeps the same prop interface as before so /graph/page.tsx needs no changes.
 */
export default function GraphView({
  entities,
  edges,
  onSelectEntity,
}: {
  entities: Entity[];
  edges: Edge[];
  onSelectEntity: (e: Entity) => void;
}) {
  return (
    <SigmaGraph
      entities={entities as unknown as GraphEntity[]}
      edges={edges as unknown as GraphEdge[]}
      onSelectEntity={(entity) => onSelectEntity(entity as unknown as Entity)}
      minSimilarity={0}
      height={540}
    />
  );
}
