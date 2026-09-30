import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CORE_STUDY_TOOLS, CORE_STUDY_TOOL_COUNT } from "../src/lib/platform/catalog";
import {
  formatInvestigationWaysHeading,
  studyToolCountAsWord,
} from "../src/lib/platform/investigation-copy";
import {
  expandPublicCorrespondenceGraph,
  projectLegacyPublicCorrespondenceGraph,
  projectPublicCorrespondenceGraph,
  PUBLIC_CORRESPONDENCE_GRAPH_SCHEMA,
} from "../src/lib/graph/correspondence-graph-public";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Vercel CDN cache eligibility for non-streaming function responses (docs: 10 MB). */
const VERCEL_CDN_MAX_CACHE_BYTES = 10 * 1024 * 1024;

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

function extractQuestionToolTitles(homeSource: string): string[] {
  const block =
    homeSource.match(/const questionTools = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
  return [...block.matchAll(/title: "([^"]+)"/g)].map((match) => match[1]);
}

function loadStagingCorrespondenceFixture() {
  const stagingPath = resolve(
    appRoot,
    "../graph-bundles/staging-to-live-graph-2026-05-10.json",
  );
  const exportJson = JSON.parse(readFileSync(stagingPath, "utf8")) as {
    correspondences: {
      entities: Array<Record<string, unknown>>;
      relationships: Array<Record<string, unknown>>;
    };
  };
  return exportJson.correspondences;
}

function scaleToProdCounts<T>(rows: T[], target: number): T[] {
  const out = [...rows];
  while (out.length < target) {
    out.push(...rows.slice(0, Math.min(rows.length, target - out.length)));
  }
  return out.slice(0, target);
}

function toDbLikeEntities(rows: Array<Record<string, unknown>>, count: number) {
  return scaleToProdCounts(rows, count).map((row, index) => ({
    id:
      typeof row.id === "string"
        ? row.id
        : `e0000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
    slug: row.slug,
    name: row.name,
    category: row.category,
    aliases: row.aliases,
    description: row.description,
    lenses: row.lenses,
    type: row.category
      ? { slug: row.category, label: row.category as string }
      : undefined,
  }));
}

function toDbLikeRelationships(rows: Array<Record<string, unknown>>, count: number) {
  return scaleToProdCounts(rows, count).map((row, index) => ({
    id:
      typeof row.id === "string"
        ? row.id
        : `a0000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
    source_id:
      typeof row.source_id === "string"
        ? row.source_id
        : `b0000000-0000-4000-8000-${(index % 900).toString(16).padStart(12, "0")}`,
    target_id:
      typeof row.target_id === "string"
        ? row.target_id
        : `c0000000-0000-4000-8000-${((index + 17) % 900).toString(16).padStart(12, "0")}`,
    type: row.type,
    weight: row.weight,
    confidence: row.confidence,
    source_citation: row.source_citation,
    notes: row.notes,
    relationship_type: row.relationship_type,
  }));
}

test("public correspondence graph loads through one service-backed bundle route", () => {
  const route = readSource("src/app/api/graph/correspondence/route.ts");
  const loader = readSource("src/lib/graph/correspondence-graph.server.ts");
  const graphPage = readSource("src/app/graph/page.tsx");

  assert.match(route, /unstable_cache/);
  assert.match(route, /s-maxage=\$\{CACHE_SECONDS\}|s-maxage=300/);
  assert.match(route, /maxDuration = 60/);
  assert.match(route, /Correspondence graph is temporarily unavailable/);
  assert.doesNotMatch(route, /getErrorMessage\(err/);
  assert.match(loader, /createServiceClient/);
  assert.doesNotMatch(loader, /description/);
  assert.doesNotMatch(loader, /source_citation/);
  assert.doesNotMatch(loader, /count:\s*["']exact["']/);
  assert.match(graphPage, /fetchCorrespondenceGraphBundle/);
  assert.match(graphPage, /expandPublicCorrespondenceGraph/);
  assert.match(graphPage, /\/api\/graph\/correspondence/);
  assert.doesNotMatch(graphPage, /fetchAllGraphPages/);
});

test("homepage study tool counts stay aligned with the platform catalog", () => {
  const home = readSource("src/components/home/PublicHomeView.tsx");
  const catalog = readSource("src/lib/platform/catalog.ts");
  const titles = extractQuestionToolTitles(home);

  assert.match(catalog, /"Research"/);
  assert.deepEqual(titles, [...CORE_STUDY_TOOLS]);
  assert.equal(titles.length, CORE_STUDY_TOOL_COUNT);
  assert.match(home, /formatPlatformSummary\(platformTotals\)/);
  assert.match(home, /formatInvestigationWaysHeading\(questionTools\.length\)/);
  assert.doesNotMatch(home, /throw new Error\("Homepage study tools/);
  assert.doesNotMatch(home, /5 study tools/);
});

test("investigation ways heading uses an English word for the tool count", () => {
  assert.equal(studyToolCountAsWord(6), "Six");
  assert.equal(formatInvestigationWaysHeading(6), "Six ways to investigate");
  assert.equal(
    formatInvestigationWaysHeading(CORE_STUDY_TOOL_COUNT),
    "Six ways to investigate",
  );
});

test("v2 correspondence bundle is under Vercel CDN cache size at prod scale", () => {
  const { entities, relationships } = loadStagingCorrespondenceFixture();
  const scaledEntities = toDbLikeEntities(entities, 1980);
  const scaledRelationships = toDbLikeRelationships(relationships, 32_256);

  const legacy = projectLegacyPublicCorrespondenceGraph(
    scaledEntities as Parameters<typeof projectLegacyPublicCorrespondenceGraph>[0],
    scaledRelationships as Parameters<typeof projectLegacyPublicCorrespondenceGraph>[1],
  );
  const legacyBytes = Buffer.byteLength(
    JSON.stringify({
      entities: legacy.entities,
      edges: legacy.edges,
      entityCount: scaledEntities.length,
      edgeCount: scaledRelationships.length,
    }),
    "utf8",
  );

  const v2 = projectPublicCorrespondenceGraph(scaledEntities, scaledRelationships);
  assert.equal(v2.schemaVersion, PUBLIC_CORRESPONDENCE_GRAPH_SCHEMA);
  const v2Bytes = Buffer.byteLength(JSON.stringify(v2), "utf8");

  // Prod (prismarium.xyz) measured ~19 MiB uncompressed with 1,980 / 32,256 rows — over
  // Vercel's 10 MiB CDN cache limit. This fixture's legacy shape is smaller but same fields.
  assert.ok(
    legacyBytes > v2Bytes,
    `v2 must be smaller than the legacy API shape (legacy ${legacyBytes}, v2 ${v2Bytes})`,
  );
  assert.ok(
    v2Bytes < VERCEL_CDN_MAX_CACHE_BYTES,
    `v2 payload must be CDN-cacheable under 10 MiB (got ${v2Bytes})`,
  );

  const expanded = expandPublicCorrespondenceGraph(v2);
  assert.equal(expanded.entities.length, 1980);
  assert.equal(expanded.relationships.length, 32_256);
  const relationshipIds = expanded.relationships.map((edge) => edge.id);
  assert.equal(
    new Set(relationshipIds).size,
    relationshipIds.length,
    "edge ids must be unique for React keys and graph logic",
  );
});
