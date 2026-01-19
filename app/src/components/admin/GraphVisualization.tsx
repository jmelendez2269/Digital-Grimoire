"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

type GraphType = "correspondences" | "convergence";

interface Entity {
  id: string;
  name: string;
  [key: string]: any;
}

interface GraphVisualizationProps {
  entities: Entity[];
  relationships: any[];
  graphType: GraphType;
  onSelectEntity: (entity: Entity) => void;
}

// Color schemes
const CORRESPONDENCE_COLORS: Record<string, string> = {
  planet: "#8B5CF6",
  element: "#3B82F6",
  deity: "#F59E0B",
  tarot: "#10B981",
  sephirah: "#EF4444",
  path: "#6366F1",
  metal: "#06B6D4",
  herb: "#EC4899",
  color: "#F97316",
  sign: "#14B8A6",
  house: "#A855F7",
  angel: "#22C55E",
  demon: "#DC2626",
  stone: "#84CC16",
  note: "#6B7280",
  other: "#6B7280",
};

const TRADITION_COLORS: Record<string, string> = {
  Buddhist: "#8B5CF6",
  Christian: "#3B82F6",
  Taoist: "#10B981",
  Hindu: "#F59E0B",
  Islamic: "#EF4444",
  Jewish: "#6366F1",
  Quantum: "#06B6D4",
  Philosophy: "#EC4899",
  Hermetic: "#F97316",
  Other: "#6B7280",
};

const DEFAULT_COLOR = "#6B7280";

export default function GraphVisualization({
  entities,
  relationships,
  graphType,
  onSelectEntity,
}: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return;

    // Update dimensions
    const container = svgRef.current.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width - 32, height: Math.max(600, rect.height - 32) });
    }
  }, [entities]);

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    // Create nodes
    const nodes = entities.map((entity) => ({
      id: entity.id,
      entity,
      x: Math.random() * width,
      y: Math.random() * height,
    }));

    // Create links
    const entityMap = new Map(entities.map((e) => [e.id, e]));
    const links = relationships
      .filter((rel) => entityMap.has(rel.source_id) && entityMap.has(rel.target_id))
      .map((rel) => ({
        source: rel.source_id,
        target: rel.target_id,
        relationship: rel,
        weight: graphType === "correspondences" ? rel.weight : rel.similarity,
      }));

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => {
            // Closer for higher weight/similarity
            const weight = d.weight || 0.5;
            return 200 - weight * 100;
          })
          .strength((d: any) => (d.weight || 0.5) * 0.5)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create SVG elements
    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Draw links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#6B7280")
      .attr("stroke-opacity", (d) => 0.3 + (d.weight || 0.5) * 0.4)
      .attr("stroke-width", (d) => 1 + (d.weight || 0.5) * 2);

    // Draw nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag<SVGGElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectEntity(d.entity);
      });

    // Add circles
    node
      .append("circle")
      .attr("r", 15)
      .attr("fill", (d) => {
        if (graphType === "correspondences") {
          const typeColor = d.entity.type?.color || d.entity.type_ref?.color;
          return typeColor || CORRESPONDENCE_COLORS[d.entity.category] || DEFAULT_COLOR;
        } else {
          const traditionColor = d.entity.tradition_ref?.color;
          return traditionColor || TRADITION_COLORS[d.entity.tradition] || DEFAULT_COLOR;
        }
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer");

    // Add labels
    node
      .append("text")
      .attr("dx", 18)
      .attr("dy", 4)
      .text((d) => d.entity.name)
      .attr("font-size", "12px")
      .attr("fill", "#E5E7EB")
      .style("pointer-events", "none")
      .style("user-select", "none");

    // Hover effects
    node
      .on("mouseenter", function (event, d) {
        d3.select(this).select("circle").attr("r", 18);
        link.attr("stroke-opacity", (l: any) =>
          l.source === d.id || l.target === d.id ? 0.8 : 0.1
        );
      })
      .on("mouseleave", function (event, d) {
        d3.select(this).select("circle").attr("r", 15);
        link.attr("stroke-opacity", (l: any) => 0.3 + (l.weight || 0.5) * 0.4);
      });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [entities, relationships, graphType, dimensions, onSelectEntity]);

  if (entities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] text-amber-100/60">
        <div className="text-center">
          <p className="text-lg mb-2">No entities to display</p>
          <p className="text-sm">Create some entities to see them in the graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        width="100%"
        height={dimensions.height}
        className="bg-zinc-950/60 rounded-lg"
        style={{ minHeight: "600px" }}
      >
        {/* SVG content rendered by D3 */}
      </svg>
    </div>
  );
}
