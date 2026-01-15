"use client";

import { useMemo } from "react";

interface Entity {
  id: string;
  slug?: string;
  name: string;
  category: string;
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

export default function GraphView({
  entities,
  edges,
  onSelectEntity,
}: {
  entities: Entity[];
  edges: Edge[];
  onSelectEntity: (e: Entity) => void;
}) {
  const placeholderLayout = useMemo(() => {
    const width = 900;
    const height = 540;
    // Increase limit to show more entities (up to 100)
    const nodes = entities.slice(0, 100).map((e, i) => ({
      ...e,
      x: (Math.sin(i) * 0.4 + 0.5) * width,
      y: (Math.cos(i * 1.3) * 0.4 + 0.5) * height,
    }));
    const byId = new Map(nodes.map((n) => [n.id, n] as const));
    // Increase limit to show more edges (up to 300)
    const links = edges
      .filter((_, i) => i < 300)
      .map((edge) => ({
        source: byId.get(edge.source_id),
        target: byId.get(edge.target_id),
        weight: edge.weight,
      }))
      .filter((l) => l.source && l.target) as Array<{
        source: { x: number; y: number };
        target: { x: number; y: number };
        weight: number;
      }>;
    return { width, height, nodes, links, byId };
  }, [entities, edges]);

  return (
    <div className="w-full overflow-hidden rounded-lg">
      <svg
        role="img"
        aria-label="Knowledge graph"
        width="100%"
        viewBox={`0 0 ${placeholderLayout.width} ${placeholderLayout.height}`}
        className="bg-zinc-950/60 rounded-lg"
      >
        <g>
          {placeholderLayout.links.map((l, idx) => (
            <line
              key={idx}
              x1={l.source.x}
              y1={l.source.y}
              x2={l.target.x}
              y2={l.target.y}
              stroke="#6b7280"
              strokeOpacity={0.3 + Math.min(0.5, l.weight)}
              strokeWidth={1 + l.weight}
            />
          ))}
        </g>
        <g>
          {placeholderLayout.nodes.map((n) => {
            // Find the full entity data from the original entities array
            const fullEntity = entities.find(e => e.id === n.id) || n;
            return (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                <circle
                  r={10}
                  className="cursor-pointer"
                  fill="#b48f4a"
                  fillOpacity={0.8}
                  onClick={() => onSelectEntity(fullEntity)}
                />
                <text
                  x={12}
                  y={4}
                  fontSize={11}
                  fill="#e5e7eb"
                  className="select-none"
                >
                  {n.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}


