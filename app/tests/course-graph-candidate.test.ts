import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCourseGraphCandidateBundle,
  canonicalizeCourseGraphCandidateBundle,
  sanitizeCourseGraphCandidateForLearners,
  selectCourseGraphSavedView,
  validateCourseGraphCandidateBundle,
} from "../src/lib/graph/course-graph-candidate";
import {
  FD01_PATTERN_TEST_FALLBACK,
  FD01_PATTERN_TEST_VIEW,
  isFd01GraphPreviewEnabled,
} from "../src/lib/graph/course-graph-public";
import type { CourseGraphCandidateBundle } from "../src/lib/graph/course-graph-candidate";

const repoRoot = new URL("../../", import.meta.url);
const candidateMarkdown = readFileSync(
  new URL("docs/planning/pre_course_graph_candidate.md", repoRoot),
  "utf8",
);
const fd01Manifest = canonicalizeCourseGraphCandidateBundle(JSON.parse(
  readFileSync(
    new URL(
      "../Parallax_mission_control/docs/courses/fd01-graph/manifest.v1.json",
      repoRoot,
    ),
    "utf8",
  ),
) as CourseGraphCandidateBundle);

function makeLearnerReadyFd01Bundle() {
  const learnerReady = structuredClone(fd01Manifest);
  learnerReady.package.release_state = "learner_ready";
  learnerReady.package.source_status = "ready";
  learnerReady.review.source_readiness = "ready";
  learnerReady.review.learner_ready = true;
  learnerReady.review.review_state = "approved";
  for (const entity of learnerReady.entities) {
    entity.review_state = "approved";
  }
  for (const edge of learnerReady.edges) {
    edge.review_state = "approved";
  }
  for (const claim of learnerReady.claims) {
    claim.review_state = "approved";
  }

  const selected = selectCourseGraphSavedView(
    learnerReady,
    FD01_PATTERN_TEST_VIEW,
  );
  const mappedIdentityIds = new Set(
    learnerReady.identity_map.map((identity) => identity.candidate_stable_id),
  );
  for (const entity of selected.bundle.entities) {
    if (mappedIdentityIds.has(entity.stable_id)) continue;
    learnerReady.identity_map.push({
      candidate_stable_id: entity.stable_id,
      identity_state: entity.identity_state,
      canonical_refs: entity.canonical_refs,
      aliases: entity.aliases,
      notes: "Test fixture identity review for the selected learner view.",
    });
  }
  const candidateIds = [
    ...selected.bundle.entities.map((entity) => entity.stable_id),
    ...selected.bundle.edges.map((edge) => edge.stable_id),
    ...selected.bundle.claims.map((claim) => claim.claim_id),
  ].sort();
  learnerReady.review_decisions = candidateIds.map(
    (candidateId, index) => ({
      decision_id: `decision:human-test:${String(index + 1).padStart(2, "0")}`,
      candidate_id: candidateId,
      decision: "approved",
      reviewer: "human-test-reviewer",
      decided_on: "2026-07-30",
      reason: "Test fixture for explicit human approval coverage.",
      replacement_id: null,
      merge_target_id: null,
    }),
  );

  return canonicalizeCourseGraphCandidateBundle(learnerReady);
}

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

test("FD01 manifest covers the full course while preserving the exact six-edge saved view", () => {
  const report = validateCourseGraphCandidateBundle(fd01Manifest);
  const assignmentEdges = fd01Manifest.edges.filter((edge) =>
    ["uses_primary_work", "uses_companion_work"].includes(edge.predicate),
  );
  const assignedWorks = new Set(
    assignmentEdges.map((edge) => edge.target_stable_id),
  );
  const primaryWorks = new Set(
    assignmentEdges
      .filter((edge) => edge.predicate === "uses_primary_work")
      .map((edge) => edge.target_stable_id),
  );
  const companionOnlyWorks = new Set(
    assignmentEdges
      .filter(
        (edge) =>
          edge.predicate === "uses_companion_work" &&
          !primaryWorks.has(edge.target_stable_id),
      )
      .map((edge) => edge.target_stable_id),
  );

  assert.equal(report.entityCounts.lesson, 6);
  assert.equal(report.entityCounts.work, 15);
  assert.equal(report.entityCounts.artifact, 6);
  assert.equal(assignedWorks.size, 14);
  assert.equal(primaryWorks.size, 10);
  assert.equal(companionOnlyWorks.size, 4);
  assert.equal(
    assignmentEdges.some(
      (edge) =>
        edge.target_stable_id ===
        "work:dialogues-concerning-natural-religion",
    ),
    false,
  );
  assert.equal(
    fd01Manifest.edges.filter((edge) => edge.metadata.return_choice).length,
    3,
  );

  const selected = selectCourseGraphSavedView(
    fd01Manifest,
    FD01_PATTERN_TEST_VIEW,
  );
  assert.deepEqual(
    selected.bundle.edges.map((edge) => edge.stable_id),
    [
      "edge:fd01-ac3958f164f1:01-w03-berens-primary",
      "edge:fd01-ac3958f164f1:02-w03-jung-primary",
      "edge:fd01-ac3958f164f1:03-w03-nietzsche-primary",
      "edge:fd01-ac3958f164f1:04-w03-nield-companion",
      "edge:fd01-ac3958f164f1:05-perseus-zarathustra-juxtaposition",
      "edge:fd01-ac3958f164f1:06-nield-pattern-critique",
    ],
  );
  assert.deepEqual(
    selected.bundle.edges.map((edge) => edge.scope),
    [null, null, null, null, "course_context", "course_context"],
  );
  assert.deepEqual(
    selected.bundle.edges.map((edge) => edge.confidence),
    [
      "established",
      "established",
      "established",
      "established",
      "established",
      "interpretive",
    ],
  );
});

test("manifest canonicalization is deterministic and ordering violations fail validation", () => {
  const once = canonicalizeCourseGraphCandidateBundle(fd01Manifest);
  const twice = canonicalizeCourseGraphCandidateBundle(once);
  assert.deepEqual(twice, once);

  const shuffled = structuredClone(once);
  [shuffled.entities[0], shuffled.entities[1]] = [
    shuffled.entities[1],
    shuffled.entities[0],
  ];
  assert.throws(
    () => validateCourseGraphCandidateBundle(shuffled),
    /Entities must be sorted by stable_id/,
  );
});

test("FD01 critical identity boundaries remain explicit", () => {
  const identityById = new Map(
    fd01Manifest.identity_map.map((entry) => [
      entry.candidate_stable_id,
      entry,
    ]),
  );

  assert.equal(
    identityById.get("work:the-age-of-fable")?.identity_state,
    "merge_candidate",
  );
  assert.equal(
    identityById.get("work:dialogues-concerning-natural-religion")
      ?.identity_state,
    "excluded",
  );
  assert.equal(
    identityById.get("person:zarathustra-historical")?.identity_state,
    "excluded",
  );
  assert.equal(
    identityById.get("tradition:sufism")?.identity_state,
    "unresolved",
  );
  assert.match(
    JSON.stringify(fd01Manifest.rejected_candidates),
    /specialist or tradition-connected reviewer/i,
  );
});

test("learner sanitizer requires an approved source-ready package and resolved identities", () => {
  assert.throws(
    () =>
      sanitizeCourseGraphCandidateForLearners(
        fd01Manifest,
        fd01Manifest.bundle_slug,
        FD01_PATTERN_TEST_VIEW,
      ),
    /not learner_ready/,
  );

  const candidateReview = structuredClone(fd01Manifest);
  candidateReview.package.release_state = "learner_ready";
  candidateReview.package.source_status = "ready";
  candidateReview.review.source_readiness = "ready";
  candidateReview.review.learner_ready = true;
  assert.throws(
    () => validateCourseGraphCandidateBundle(candidateReview),
    /approved package review/,
  );

  const learnerReady = structuredClone(candidateReview);
  learnerReady.review.review_state = "approved";
  for (const entity of learnerReady.entities) {
    entity.review_state = "approved";
  }
  for (const edge of learnerReady.edges) {
    edge.review_state = "approved";
  }
  for (const claim of learnerReady.claims) {
    claim.review_state = "approved";
  }
  assert.throws(
    () => validateCourseGraphCandidateBundle(learnerReady),
    /lacks a human approval decision/,
  );

  const humanApproved = makeLearnerReadyFd01Bundle();
  validateCourseGraphCandidateBundle(humanApproved);

  const publicView = sanitizeCourseGraphCandidateForLearners(
    humanApproved,
    humanApproved.bundle_slug,
    FD01_PATTERN_TEST_VIEW,
  );
  assert.equal(publicView.edges.length, 6);
  assert.deepEqual(
    publicView.selected_view?.edge_ids,
    FD01_PATTERN_TEST_FALLBACK.selected_view.edge_ids,
  );
  assert.ok(publicView.edges.every((edge) => edge.evidence_ids.length > 0));
  assert.ok(
    publicView.citations.every(
      (citation) => citation.evidence_class && citation.citation,
    ),
  );
  assert.equal(publicView.reviewed_non_edges.length, 1);
  assert.equal("bundle_slug" in publicView, false);
  assert.doesNotMatch(
    JSON.stringify(publicView),
    /ac3958f164f1|source_sha256|source_path|extractor/,
  );

  const unresolved = structuredClone(humanApproved);
  const berens = unresolved.entities.find(
    (entity) =>
      entity.stable_id ===
      "work:myths-and-legends-of-ancient-greece-and-rome",
  );
  assert.ok(berens);
  berens.identity_state = "unresolved";
  assert.throws(
    () =>
      sanitizeCourseGraphCandidateForLearners(
        unresolved,
        unresolved.bundle_slug,
        FD01_PATTERN_TEST_VIEW,
      ),
    /unresolved or unapproved record/,
  );
});

test("static FD01 fallback is a learner-safe projection of the same saved view", () => {
  const learnerReady = makeLearnerReadyFd01Bundle();

  const generatedProjection = sanitizeCourseGraphCandidateForLearners(
    learnerReady,
    learnerReady.bundle_slug,
    FD01_PATTERN_TEST_VIEW,
  );
  assert.deepEqual(FD01_PATTERN_TEST_FALLBACK, generatedProjection);
  assert.doesNotMatch(
    JSON.stringify(FD01_PATTERN_TEST_FALLBACK),
    /ac3958f164f1|bundle_slug|source_sha256|source_path|reviewer|extractor/,
  );
});

test("predicate direction and stronger historical claims require supported evidence", () => {
  const reversedAuthorship = buildCourseGraphCandidateBundle(candidateMarkdown);
  const authoredBy = reversedAuthorship.edges.find(
    (edge) => edge.predicate === "authored_by",
  );
  assert.ok(authoredBy);
  [authoredBy.source_stable_id, authoredBy.target_stable_id] = [
    authoredBy.target_stable_id,
    authoredBy.source_stable_id,
  ];
  assert.throws(
    () =>
      validateCourseGraphCandidateBundle(
        canonicalizeCourseGraphCandidateBundle(reversedAuthorship),
      ),
    /Predicate direction or endpoint kind mismatch/,
  );

  const unsupportedInfluence = buildCourseGraphCandidateBundle(candidateMarkdown);
  const juxtaposition = unsupportedInfluence.edges.find(
    (edge) => edge.predicate === "editorially_juxtaposed_with",
  );
  assert.ok(juxtaposition);
  juxtaposition.predicate = "influenced_by";
  assert.throws(
    () =>
      validateCourseGraphCandidateBundle(
        canonicalizeCourseGraphCandidateBundle(unsupportedInfluence),
      ),
    /influenced_by lacks its required evidence basis/,
  );
});

test("identity review cannot drift from the entity record", () => {
  const drifted = structuredClone(fd01Manifest);
  const berensIdentity = drifted.identity_map.find(
    (identity) =>
      identity.candidate_stable_id ===
      "work:myths-and-legends-of-ancient-greece-and-rome",
  );
  assert.ok(berensIdentity);
  berensIdentity.identity_state = "unresolved";
  assert.throws(
    () =>
      validateCourseGraphCandidateBundle(
        canonicalizeCourseGraphCandidateBundle(drifted),
      ),
    /Identity state disagrees with entity/,
  );
});

test("learner citations reject private URL schemes and include reviewed non-edge evidence", () => {
  const unsafe = structuredClone(fd01Manifest);
  unsafe.evidence[0].source_url = "file:///C:/internal/course-notes.md";
  assert.throws(
    () =>
      validateCourseGraphCandidateBundle(
        canonicalizeCourseGraphCandidateBundle(unsafe),
      ),
    /unsafe source URL/,
  );

  const missingFileHash = structuredClone(fd01Manifest);
  missingFileHash.evidence[0].source_sha256 = null;
  assert.throws(
    () =>
      validateCourseGraphCandidateBundle(
        canonicalizeCourseGraphCandidateBundle(missingFileHash),
      ),
    /needs a source SHA-256/,
  );

  const learnerReady = makeLearnerReadyFd01Bundle();
  const nonEdgeClaim = learnerReady.claims.find(
    (claim) => claim.claim_key === "does_not_settle",
  );
  assert.ok(nonEdgeClaim);
  nonEdgeClaim.evidence_keys = ["E-FD01-014"];
  const publicView = sanitizeCourseGraphCandidateForLearners(
    learnerReady,
    learnerReady.bundle_slug,
    FD01_PATTERN_TEST_VIEW,
  );
  assert.ok(
    publicView.citations.some(
      (citation) => citation.evidence_key === "E-FD01-014",
    ),
  );
});

test("FD01 public preview feature flag fails closed", () => {
  assert.equal(isFd01GraphPreviewEnabled(undefined), false);
  assert.equal(isFd01GraphPreviewEnabled(""), false);
  assert.equal(isFd01GraphPreviewEnabled("false"), false);
  assert.equal(isFd01GraphPreviewEnabled("TRUE"), false);
  assert.equal(isFd01GraphPreviewEnabled("true"), true);
});
