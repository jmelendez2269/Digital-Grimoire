"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface ConvergenceConcept {
  id: string;
  slug: string;
  name: string;
  tradition: string;
  tradition_ref?: { id: string; slug: string; label: string; color?: string; icon?: string };
  era?: string;
  short_definition?: string;
  primary_sources?: string[];
  tags?: string[];
}

interface ConvergenceRelationship {
  id: string;
  source_id: string;
  target_id: string;
  similarity: number;
  source_citation?: string;
  notes?: string;
}

interface ConvergenceGraphProps {
  concepts: ConvergenceConcept[];
  relationships: ConvergenceRelationship[];
  onSelectConcept: (concept: ConvergenceConcept) => void;
  minSimilarity: number;
}

// Color scheme for different traditions
const TRADITION_COLORS: Record<string, string> = {
  Buddhist: "#8B5CF6", // Purple
  Christian: "#3B82F6", // Blue
  Taoist: "#10B981", // Green
  Hindu: "#F59E0B", // Amber
  Islamic: "#EF4444", // Red
  Jewish: "#6366F1", // Indigo
  Quantum: "#06B6D4", // Cyan
  Philosophy: "#EC4899", // Pink
  Hermetic: "#F97316", // Orange
  Other: "#6B7280", // Gray
};

const DEFAULT_COLOR = "#6B7280";

export default function ConvergenceGraph({
  concepts,
  relationships,
  onSelectConcept,
  minSimilarity,
}: ConvergenceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  useEffect(() => {
    if (!svgRef.current || concepts.length === 0) return;

    // Update dimensions based on container
    const container = svgRef.current.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width - 32, height: Math.max(600, rect.height - 32) });
    }
  }, [concepts]);

  useEffect(() => {
    if (!svgRef.current || concepts.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = dimensions.width;
    const height = dimensions.height;

    // Filter relationships by similarity threshold
    const filteredRelationships = relationships.filter(
      (r) => r.similarity >= minSimilarity
    );

    // Create a map of concept IDs to concepts
    const conceptMap = new Map(concepts.map((c) => [c.id, c]));

    // Filter relationships to only include concepts we have
    const validRelationships = filteredRelationships.filter(
      (r) => conceptMap.has(r.source_id) && conceptMap.has(r.target_id)
    );

    // Create nodes and links for D3
    const nodes = concepts.map((concept) => ({
      id: concept.id,
      concept,
      x: Math.random() * width,
      y: Math.random() * height,
    }));

    const links = validRelationships.map((rel) => ({
      source: rel.source_id,
      target: rel.target_id,
      similarity: rel.similarity,
      relationship: rel,
    }));

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => 150 - d.similarity * 100) // Closer for higher similarity
          .strength((d: any) => d.similarity * 0.5)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25));

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
      .attr("stroke-opacity", (d) => 0.3 + d.similarity * 0.4)
      .attr("stroke-width", (d) => 1 + d.similarity * 2)
      .attr("stroke-dasharray", (d) => (d.similarity > 0.8 ? "0" : "5,5"));

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
        onSelectConcept(d.concept);
      });

    // Add circles for nodes
    node
      .append("circle")
      .attr("r", 12)
      .attr("fill", (d) =>
        d.concept.tradition_ref?.color ||
        TRADITION_COLORS[d.concept.tradition] ||
        DEFAULT_COLOR
      )
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer");

    // Add labels
    node
      .append("text")
      .attr("dx", 15)
      .attr("dy", 4)
      .text((d) => d.concept.name)
      .attr("font-size", "11px")
      .attr("fill", "#E5E7EB")
      .style("pointer-events", "none")
      .style("user-select", "none");

    // Add hover effects
    node
      .on("mouseenter", function (event, d) {
        d3.select(this).select("circle").attr("r", 16);
        link
          .attr("stroke-opacity", (l) =>
            l.source === d.id || l.target === d.id ? 0.8 : 0.1
          );
      })
      .on("mouseleave", function (event, d) {
        d3.select(this).select("circle").attr("r", 12);
        link.attr("stroke-opacity", (l) => 0.3 + (l as any).similarity * 0.4);
      });

    // Update positions on simulation tick
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
  }, [concepts, relationships, minSimilarity, dimensions, onSelectConcept]);

  if (concepts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] text-amber-100/60">
        <div className="text-center">
          <p className="text-lg mb-2">No concepts found</p>
          <p className="text-sm">Try adjusting your filters or adding concepts to the database.</p>
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
        {/* SVG content is rendered by D3 */}
      </svg>
    </div>
  );
}
