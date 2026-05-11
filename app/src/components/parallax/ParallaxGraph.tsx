"use client";

import SigmaGraph from "@/components/graph/SigmaGraph";
import { ParallaxConcept, ParallaxRelationship, CorrespondenceEntity } from "@/lib/types";
import { GraphEntity, GraphEdge } from "@/lib/graph/graphology-adapter";

console.log("[GraphDebug] ParallaxGraph.tsx module loaded");

interface ParallaxGraphProps {
  concepts: (ParallaxConcept | CorrespondenceEntity)[];
  relationships: (ParallaxRelationship | GraphEdge)[];
  onSelectConcept: (concept: ParallaxConcept | CorrespondenceEntity) => void;
  minSimilarity: number;
  layoutDensity?: "compact" | "balanced" | "expanded";
}

/**
 * ParallaxGraph — thin wrapper around SigmaGraph.
 * Keeps the same prop interface as before so /parallax-graph/page.tsx needs no changes.
 */
export default function ParallaxGraph({
  concepts,
  relationships,
  onSelectConcept,
  minSimilarity,
  layoutDensity = "expanded",
}: ParallaxGraphProps) {
  return (
    <SigmaGraph
      entities={concepts as unknown as GraphEntity[]}
      edges={relationships as unknown as GraphEdge[]}
      onSelectEntity={(entity) => onSelectConcept(entity as unknown as ParallaxConcept | CorrespondenceEntity)}
      minSimilarity={minSimilarity}
      height={600}
      layoutDensity={layoutDensity}
    />
  );
}
