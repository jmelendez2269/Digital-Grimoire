import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCourseGraphCandidateBundle,
  validateCourseGraphCandidateBundle,
} from "../src/lib/graph/course-graph-candidate";

const repoRoot = new URL("../../", import.meta.url);
const candidateMarkdown = readFileSync(
  new URL("docs/planning/pre_course_graph_candidate.md", repoRoot),
  "utf8",
);

test("PRE course graph candidate builds into a lossless typed manifest", () => {
  const bundle = buildCourseGraphCandidateBundle(candidateMarkdown);
  const report = validateCourseGraphCandidateBundle(bundle);

  assert.equal(bundle.bundle_kind, "course_graph_candidate");
  assert.equal(bundle.version, 1);
  assert.equal(bundle.course.stable_id, "course:pre-how-to-hold-two-things-at-once");
  assert.equal(report.entities, 44);
  assert.equal(report.edges, 66);
  assert.equal(report.evidence, 27);
  assert.equal(report.blockedInferences, 7);
  assert.deepEqual(report.entityCounts, {
    course: 1,
    lesson: 0,
    work: 10,
    edition: 0,
    passage: 0,
    person: 9,
    tradition: 0,
    concept: 24,
    institution: 0,
    artifact: 0,
  });
  assert.equal(report.structuralEdges, 24);
  assert.equal(report.interpretiveEdges, 42);
});

test("PRE edge semantics preserve direction, evidence, scope, and connection summaries", () => {
  const bundle = buildCourseGraphCandidateBundle(candidateMarkdown);
  const entityIds = new Set(bundle.entities.map((entity) => entity.stable_id));
  const evidenceIds = new Set(bundle.evidence.map((evidence) => evidence.evidence_key));

  for (const edge of bundle.edges) {
    assert.ok(entityIds.has(edge.source_stable_id));
    assert.ok(entityIds.has(edge.target_stable_id));
    assert.notEqual(edge.source_stable_id, edge.target_stable_id);
    assert.ok(edge.connection_summary.length > 40);
    assert.ok(edge.evidence_keys.length > 0);
    assert.ok(edge.evidence_keys.every((key) => evidenceIds.has(key)));
    assert.equal(
      edge.scope,
      edge.edge_class === "interpretive" ? "course_context" : null,
    );
  }

  assert.equal(
    bundle.edges.filter((edge) => edge.confidence === "established").length,
    15,
  );
  assert.equal(
    bundle.edges.filter((edge) => edge.confidence === "speculative").length,
    9,
  );
  assert.equal(
    bundle.edges.filter((edge) => edge.confidence === "interpretive").length,
    42,
  );
});

test("PRE package preserves the deliberate Week 2 historical and doctrinal non-edges", () => {
  const bundle = buildCourseGraphCandidateBundle(candidateMarkdown);
  const forbidden = new Set([
    "historically_connected_to",
    "influenced_by",
    "derives_from",
    "doctrinally_related_to",
  ]);

  assert.equal(
    bundle.edges.filter(
      (edge) =>
        edge.source_stable_id.startsWith("work:") &&
        edge.target_stable_id.startsWith("work:") &&
        forbidden.has(edge.predicate),
    ).length,
    0,
  );
  assert.equal(
    bundle.edges.filter(
      (edge) =>
        edge.predicate === "editorially_juxtaposed_with" &&
        edge.source_stable_id.startsWith("work:") &&
        edge.target_stable_id.startsWith("work:"),
    ).length,
    5,
  );
});
