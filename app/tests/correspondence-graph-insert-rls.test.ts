import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260921122000_correspondence_graph_insert_admin_only.sql",
);

test("correspondence graph insert migration tightens RLS to admins only", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(
    sql,
    /drop policy if exists "Authenticated users can create correspondences"/,
  );
  assert.match(
    sql,
    /drop policy if exists "Authenticated users can create correspondence relationships"/,
  );
  assert.doesNotMatch(sql, /with check \(true\)/i);
  assert.doesNotMatch(sql, /for select/i, "must not alter SELECT policies");

  assert.match(sql, /create policy "Admins can insert correspondences"/);
  assert.match(
    sql,
    /create policy "Admins can insert correspondence relationships"/,
  );
  assert.equal((sql.match(/for insert/gi) || []).length, 2);
  assert.equal((sql.match(/users\.role = 'admin'/g) || []).length, 2);
  assert.equal((sql.match(/users\.id = auth\.uid\(\)/g) || []).length, 2);

  const entitiesRoute = readFileSync(
    resolve(repoRoot, "app/src/app/api/graph/entities/route.ts"),
    "utf8",
  );
  const edgesRoute = readFileSync(
    resolve(repoRoot, "app/src/app/api/graph/edges/route.ts"),
    "utf8",
  );
  assert.match(entitiesRoute, /isAdmin\(\)/);
  assert.match(entitiesRoute, /createServiceClient\(\)/);
  assert.match(edgesRoute, /isAdmin\(\)/);
  assert.match(edgesRoute, /createServiceClient\(\)/);
});
