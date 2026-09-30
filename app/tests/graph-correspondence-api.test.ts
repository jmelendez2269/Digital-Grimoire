import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

test("public correspondence graph loads through one service-backed bundle route", () => {
  const route = readSource("src/app/api/graph/correspondence/route.ts");
  const loader = readSource("src/lib/graph/correspondence-graph.server.ts");
  const graphPage = readSource("src/app/graph/page.tsx");

  assert.match(route, /loadPublicCorrespondenceGraph/);
  assert.match(route, /s-maxage=300/);
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

  assert.match(catalog, /"Research"/);
  assert.match(home, /CORE_STUDY_TOOL_COUNT/);
  assert.match(home, /formatPlatformSummary\(platformTotals\)/);
  assert.match(home, /formatInvestigationWaysHeading\(questionTools\.length\)/);
  assert.doesNotMatch(home, /5 study tools/);
});
