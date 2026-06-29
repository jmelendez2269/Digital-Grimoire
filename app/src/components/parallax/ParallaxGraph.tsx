"use client";

import dynamic from "next/dynamic";
import ParallaxLoader from "@/components/ui/ParallaxLoader";
import { ParallaxConcept, ParallaxRelationship, CorrespondenceEntity } from "@/lib/types";
import { GraphEntity, GraphEdge } from "@/lib/graph/graphology-adapter";

const ConstellationGraph = dynamic(
  () => import("@/components/graph/ConstellationGraph"),
  { ssr: false, loading: () => <ParallaxLoader /> },
);

interface ParallaxGraphProps {
  concepts: (ParallaxConcept | CorrespondenceEntity)[];
  relationships: (ParallaxRelationship | GraphEdge)[];
  onSelectConcept: (concept: ParallaxConcept | CorrespondenceEntity) => void;
  minSimilarity: number;
  layoutDensity?: "compact" | "balanced" | "expanded";
  layoutEngine?: "clusters" | "organic";
}

export default function ParallaxGraph({
  concepts,
  relationships,
  onSelectConcept,
  minSimilarity,
  layoutDensity = "expanded",
  layoutEngine = "clusters",
}: ParallaxGraphProps) {
  return (
    <ConstellationGraph
      entities={concepts as unknown as GraphEntity[]}
      edges={relationships as unknown as GraphEdge[]}
      onSelectEntity={(entity) => onSelectConcept(entity as unknown as ParallaxConcept | CorrespondenceEntity)}
      minSimilarity={minSimilarity}
      height={700}
      layoutDensity={layoutDensity}
      layoutEngine={layoutEngine}
    />
  );
}
