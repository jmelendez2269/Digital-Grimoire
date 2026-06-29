"use client";

import dynamic from "next/dynamic";
import ParallaxLoader from "@/components/ui/ParallaxLoader";
import { ParallaxConcept, ParallaxRelationship, CorrespondenceEntity } from "@/lib/types";
import { GraphEntity, GraphEdge } from "@/lib/graph/graphology-adapter";

const ConstellationGraph = dynamic(
  () => import("@/components/graph/ConstellationGraph"),
  { ssr: false, loading: () => <ParallaxLoader /> },
);

const ConstellationGraph3D = dynamic(
  () => import("@/components/graph/ConstellationGraph3D"),
  { ssr: false, loading: () => <ParallaxLoader /> },
);

interface ParallaxGraphProps {
  concepts: (ParallaxConcept | CorrespondenceEntity)[];
  relationships: (ParallaxRelationship | GraphEdge)[];
  onSelectConcept: (concept: ParallaxConcept | CorrespondenceEntity) => void;
  minSimilarity: number;
  layoutDensity?: "compact" | "balanced" | "expanded";
  layoutEngine?: "clusters" | "organic";
  graphDimension?: "2d" | "3d";
}

export default function ParallaxGraph({
  concepts,
  relationships,
  onSelectConcept,
  minSimilarity,
  layoutDensity = "expanded",
  layoutEngine = "clusters",
  graphDimension = "2d",
}: ParallaxGraphProps) {
  const sharedProps = {
    entities: concepts as unknown as GraphEntity[],
    edges: relationships as unknown as GraphEdge[],
    onSelectEntity: (entity: GraphEntity) =>
      onSelectConcept(entity as unknown as ParallaxConcept | CorrespondenceEntity),
    minSimilarity,
    height: 700,
    layoutDensity,
    layoutEngine,
  };

  return graphDimension === "3d"
    ? <ConstellationGraph3D {...sharedProps} />
    : <ConstellationGraph {...sharedProps} />;
}
