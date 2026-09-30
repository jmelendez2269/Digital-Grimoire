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

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

function extractQuestionToolTitles(homeSource: string): string[] {
  const block =
    homeSource.match(/const questionTools = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
  return [...block.matchAll(/title: "([^"]+)"/g)].map((match) => match[1]);
}

test("public correspondence graph loads through one service-backed bundle route", () => {
  const route = readSource("src/app/api/graph/correspondence/route.ts");
  const loader = readSource("src/lib/graph/correspondence-graph.server.ts");
  const graphPage = readSource("src/app/graph/page.tsx");

  assert.match(route, /loadPublicCorrespondenceGraph/);
  assert.match(route, /s-maxage=300/);
  assert.match(route, /maxDuration = 60/);
  assert.match(route, /Correspondence graph is temporarily unavailable/);
  assert.doesNotMatch(route, /getErrorMessage\(err/);
  assert.match(loader, /createServiceClient/);
  assert.doesNotMatch(loader, /count:\s*["']exact["']/);
  assert.doesNotMatch(loader, /Promise\.all\([\s\S]*offsets\.map/);
  assert.match(graphPage, /fetchCorrespondenceGraphBundle/);
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

test("correspondence bundle payload size stays in a reasonable range at prod scale", () => {
  const stagingPath = resolve(
    appRoot,
    "../graph-bundles/staging-to-live-graph-2026-05-10.json",
  );
  const exportJson = JSON.parse(readFileSync(stagingPath, "utf8")) as {
    correspondences: {
      entities: unknown[];
      relationships: unknown[];
    };
  };
  const payload = JSON.stringify({
    entities: exportJson.correspondences.entities,
    edges: exportJson.correspondences.relationships,
    entityCount: exportJson.correspondences.entities.length,
    edgeCount: exportJson.correspondences.relationships.length,
  });

  const edgeCount = exportJson.correspondences.relationships.length;
  assert.ok(edgeCount > 30_000, "expected prod-scale edge count in staging export fixture");
  assert.ok(
    payload.length < 16 * 1024 * 1024,
    `uncompressed JSON should stay under 16 MiB (got ${payload.length})`,
  );
});
