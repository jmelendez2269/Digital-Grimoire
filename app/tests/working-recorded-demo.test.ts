import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { RECORDED_WORKING_DEMO } from "../src/lib/working/recorded-demo";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8").replace(
    /\r\n/g,
    "\n"
  );
}

test("the public Working preview is a complete editorial recording", () => {
  const demo = RECORDED_WORKING_DEMO;

  assert.equal(
    demo.intention,
    "find steadiness before a difficult conversation"
  );
  assert.equal(demo.capturedAt, "2026-08-13T16:00:00.000Z");
  assert.match(demo.provenance, /not a member's working/i);
  assert.ok(demo.interpretation.length > 60);
  assert.ok(demo.ritual.length > 1_000);
  assert.equal(demo.palette.stats.totalReturned, 5);
  assert.equal(
    demo.palette.groups.flatMap((group) => group.items).length,
    demo.palette.stats.totalReturned
  );
});

test("the Working preview renders locally and never reads member data", () => {
  const fixture = readSource("src/lib/working/recorded-demo.ts");
  const page = readSource("src/app/explore/workings/page.tsx");

  for (const source of [fixture, page]) {
    assert.doesNotMatch(source, /fetch\(|createClient\(|createServiceClient\(/);
  }

  assert.match(page, /RECORDED_WORKING_DEMO/);
  assert.match(page, /No member data, database, or AI request is/);
  assert.match(page, /Your workings are yours\./);
  assert.match(page, /Create a private working/);
});

test("legacy community endpoints and database policy are closed", () => {
  const feed = readSource("src/app/api/working/community/route.ts");
  const detail = readSource("src/app/api/working/community/[id]/route.ts");
  const sharing = readSource("src/app/api/working/[id]/share/route.ts");
  const migration = readFileSync(
    resolve(
      repoRoot,
      "supabase/migrations/20260813150000_make_workings_owner_private.sql"
    ),
    "utf8"
  );

  for (const source of [feed, detail, sharing]) {
    assert.match(source, /status: 410/);
    assert.doesNotMatch(source, /createServiceClient|from\("workings"\)/);
  }

  assert.match(
    migration,
    /drop policy if exists "workings: public select shared"/
  );
});
