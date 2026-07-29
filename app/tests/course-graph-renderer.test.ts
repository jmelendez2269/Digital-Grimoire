import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGraphologyGraph,
  resolveNodeColor,
  type GraphEdge,
  type GraphEntity,
} from "../src/lib/graph/graphology-adapter";

test("course graph renderer preserves directed parallel predicates", () => {
  const entities: GraphEntity[] = [
    {
      id: "course",
      name: "Course",
      entity_kind: "course",
      review_state: "candidate",
    },
    {
      id: "concept",
      name: "Responsible openness",
      entity_kind: "concept",
      review_state: "candidate",
    },
  ];
  const edges: GraphEdge[] = [
    {
      id: "explores",
      source_id: "course",
      target_id: "concept",
      predicate: "explores",
      epistemic_kind: "editorial",
      edge_class: "interpretive",
      weight: null,
    },
    {
      id: "contextualizes",
      source_id: "course",
      target_id: "concept",
      predicate: "contextualizes",
      epistemic_kind: "conceptual",
      edge_class: "interpretive",
      weight: null,
    },
  ];

  const graph = buildGraphologyGraph(entities, edges);

  assert.equal(graph.type, "directed");
  assert.equal(graph.multi, true);
  assert.equal(graph.size, 2);
  assert.equal(graph.isDirected("explores"), true);
  assert.equal(graph.isDirected("contextualizes"), true);
  assert.equal(graph.source("explores"), "course");
  assert.equal(graph.target("explores"), "concept");
  assert.equal(graph.getEdgeAttribute("explores", "type"), "arrow");
  assert.equal(graph.getEdgeAttribute("explores", "edgeType"), "explores");
});

test("course entity kinds use explicit, distinct renderer colors", () => {
  const courseColor = resolveNodeColor({
    id: "course",
    name: "Course",
    entity_kind: "course",
  });
  const conceptColor = resolveNodeColor({
    id: "concept",
    name: "Concept",
    entity_kind: "concept",
  });
  const workColor = resolveNodeColor({
    id: "work",
    name: "Work",
    entity_kind: "work",
  });
  const personColor = resolveNodeColor({
    id: "person",
    name: "Person",
    entity_kind: "person",
  });

  assert.equal(new Set([courseColor, conceptColor, workColor, personColor]).size, 4);
});
