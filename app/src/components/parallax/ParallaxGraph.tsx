"use client";

import SigmaGraph from "@/components/graph/SigmaGraph";
import {
  CorrespondenceEntity,
  CourseGraphEdge,
  CourseGraphEntity,
  ParallaxConcept,
  ParallaxRelationship,
} from "@/lib/types";
import { GraphEntity, GraphEdge } from "@/lib/graph/graphology-adapter";

interface ParallaxGraphProps {
  concepts: (ParallaxConcept | CorrespondenceEntity | CourseGraphEntity)[];
  relationships: (ParallaxRelationship | CourseGraphEdge | GraphEdge)[];
  onSelectConcept: (concept: ParallaxConcept | CorrespondenceEntity | CourseGraphEntity) => void;
  onClearSelection?: () => void;
  minSimilarity: number;
  layoutDensity?: "compact" | "balanced" | "expanded";
  layoutEngine?: "clusters" | "organic";
  focusedEntityId?: string | null;
}

/**
 * ParallaxGraph — thin wrapper around SigmaGraph.
 * Keeps the same prop interface as before so /parallax-graph/page.tsx needs no changes.
 */
export default function ParallaxGraph({
  concepts,
  relationships,
  onSelectConcept,
  onClearSelection,
  minSimilarity,
  layoutDensity = "expanded",
  layoutEngine = "clusters",
  focusedEntityId = null,
}: ParallaxGraphProps) {
  return (
    <SigmaGraph
      entities={concepts as unknown as GraphEntity[]}
      edges={relationships as unknown as GraphEdge[]}
      onSelectEntity={(entity) =>
        onSelectConcept(
          entity as unknown as ParallaxConcept | CorrespondenceEntity | CourseGraphEntity,
        )
      }
      onClearSelection={onClearSelection}
      minSimilarity={minSimilarity}
      height={600}
      layoutDensity={layoutDensity}
      layoutEngine={layoutEngine}
      focusedEntityId={focusedEntityId}
    />
  );
}
