"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

type GraphType = "correspondences" | "parallax";

interface Entity {
  id: string;
  name: string;
  [key: string]: any;
}

interface GraphVisualizationProps {
  entities: Entity[];
  relationships: any[];
  graphType: GraphType;
  onSelectEntity: (entity: any) => void;
}

// Color schemes
const CORRESPONDENCE_COLORS: Record<string, string> = {
  planet: "#8B5CF6", // Violet
  element: "#3B82F6", // Blue
  deity: "#F59E0B", // Amber
  tarot: "#10B981", // Emerald
  sephirah: "#EF4444", // Red
  path: "#6366F1", // Indigo
  metal: "#06B6D4", // Cyan
  herb: "#EC4899", // Pink
  color: "#F97316", // Orange
  sign: "#14B8A6", // Teal
  house: "#A855F7", // Purple
  angel: "#22C55E", // Green
  demon: "#DC2626", // Red
  stone: "#84CC16", // Lime
  note: "#6B7280", // Gray
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        const { width, height } = wrapperRef.current.getBoundingClientRect();
        setDimensions({ width, height: Math.max(600, height) });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update simulation when entities/dimensions change
  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;

    // --- Prepare Data ---
    const nodes = entities.map((entity) => ({
      id: entity.id,
      entity,
      // Random initial position but clustered towards center
      x: width / 2 + (Math.random() - 0.5) * 50,
      y: height / 2 + (Math.random() - 0.5) * 50,
      r: graphType === "correspondences" ? 5 : (entity.primary_sources?.length || 1) * 2 + 4 // Size based on importance
    }));

    const entityMap = new Map(entities.map((e) => [e.id, e]));
    const links = relationships
      .filter((rel) => entityMap.has(rel.source_id) && entityMap.has(rel.target_id))
      .map((rel) => ({
        source: rel.source_id,
        target: rel.target_id,
        weight: graphType === "correspondences" ? rel.weight : rel.similarity || 0.5,
      }));

    // --- Force Simulation (Obsidian-style) ---
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => {
            // Variable distance based on weight/similarity
            // High weight = closer
            const w = d.weight || 0.5;
            return 150 * (1 - w * 0.6); // Range: 60px to 150px
          })
          .strength((d: any) => Math.max(0.1, (d.weight || 0.5) * 0.7))
      )
      .force("charge", d3.forceManyBody().strength(-300).distanceMax(500)) // Repel nodes
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05)) // Gentle gravity
      .force("collide", d3.forceCollide().radius((d: any) => d.r + 10).iterations(2)) // Prevent overlap
      .velocityDecay(0.2); // Low friction for "floaty" feel

    simulationRef.current = simulation;

    // --- Rendering ---
    const g = svg.append("g");

    // Zoom Behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);

        // Semantic Zoom: Hide labels when zoomed out
        const k = event.transform.k;
        g.selectAll(".node-label")
          .style("opacity", (d: any) => {
            if (k < 0.5) return 0; // Hide completely if too far
            if (k < 1.0) return (k - 0.5) * 2; // Fade in
            return 1;
          })
          .style("font-size", `${10 / k}px`); // Scale text to remain readable but not huge

        g.selectAll(".node circle")
          .attr("r", (d: any) => d.r / Math.sqrt(k)); // Scale nodes slightly down on zoom in
      });

    svg.call(zoom as any)
      .call(zoom.transform as any, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));


    // Links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#4b5563") // zinc-600
      .attr("stroke-opacity", (d) => 0.2 + (d.weight || 0.5) * 0.3)
      .attr("stroke-width", (d) => (d.weight || 0.5) * 2);

    // Nodes Group
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
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

    // Node Circles
    node
      .append("circle")
      .attr("r", (d: any) => d.r)
      .attr("fill", (d: any) => {
        if (graphType === "correspondences") {
          const typeColor = d.entity.type?.color || d.entity.type_ref?.color;
          return typeColor || CORRESPONDENCE_COLORS[d.entity.category] || DEFAULT_COLOR;
        } else {
          const traditionColor = d.entity.tradition_ref?.color;
          return traditionColor || TRADITION_COLORS[d.entity.tradition] || DEFAULT_COLOR;
        }
      })
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5);

    // Node Labels
    node
      .append("text")
      .attr("class", "node-label")
      .attr("dx", (d: any) => d.r + 5)
      .attr("dy", 4)
      .text((d: any) => d.entity.name)
      .style("font-family", "var(--font-geist-mono)")
      .style("font-size", "10px")
      .style("fill", "#e5e7eb")
      .style("paint-order", "stroke")
      .style("stroke", "#000")
      .style("stroke-width", "3px")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)")
      .style("opacity", 1); // Controlled by zoom

    // Simulation Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [entities, relationships, graphType, dimensions, onSelectEntity]);

  if (entities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-amber-100/60 font-mono text-sm">
        // NO_SIGNAL_CHAMBER_EMPTY
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden bg-[#050505] rounded-xl border border-white/10 shadow-[inner_0_0_40px_rgba(0,0,0,0.8)]">
      {/* Graph HUD Overlay */}
      <div className="absolute top-4 right-4 pointer-events-none text-[10px] font-mono text-amber-500/30 flex flex-col items-end gap-1 select-none">
        <span>PHYSICS_ENGINE: ACTIVE</span>
        <span>NODES: {entities.length}</span>
        <span>LINKS: {relationships.length}</span>
        <span>SIMULATION_ALPHA: {simulationRef.current?.alpha().toFixed(3) || "0.000"}</span>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={dimensions.height}
        className="block cursor-grab active:cursor-grabbing"
      >
      </svg>
    </div>
  );
}
