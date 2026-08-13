import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  parseCanaryArguments,
  projectRefFromSupabaseUrl,
} from "../scripts/manage-lean-l5-05-canary";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = "ukguqtghfglirszsqqdj";

test("inspect requires exact production and project confirmation but not apply", () => {
  assert.deepEqual(
    parseCanaryArguments([
      "inspect",
      "--confirm-production",
      "--expected-project-ref",
      projectRef,
    ]),
    {
      action: "inspect",
      apply: false,
      confirmProduction: true,
      expectedProjectRef: projectRef,
      expectedUserFingerprint: null,
    },
  );
  assert.throws(() => parseCanaryArguments(["inspect"]));
});

test("identity mutations require apply and cleanup requires the exact fingerprint", () => {
  for (const action of ["setup-admin", "cleanup"]) {
    assert.throws(() =>
      parseCanaryArguments([
        action,
        "--confirm-production",
        "--expected-project-ref",
        projectRef,
      ]),
    );
  }

  assert.deepEqual(
    parseCanaryArguments([
      "cleanup",
      "--confirm-production",
      "--expected-project-ref",
      projectRef,
      "--expected-user-fingerprint",
      "abcdef123456",
      "--apply",
    ]),
    {
      action: "cleanup",
      apply: true,
      confirmProduction: true,
      expectedProjectRef: projectRef,
      expectedUserFingerprint: "abcdef123456",
    },
  );
});

test("Supabase target parser accepts only an exact hosted project URL", () => {
  assert.equal(
    projectRefFromSupabaseUrl(`https://${projectRef}.supabase.co`),
    projectRef,
  );
  assert.equal(
    projectRefFromSupabaseUrl(`http://${projectRef}.supabase.co`),
    null,
  );
  assert.equal(projectRefFromSupabaseUrl("https://example.com"), null);
  assert.equal(projectRefFromSupabaseUrl("not-a-url"), null);
});

test("helper has no broad user listing or Stripe customer/subscription mutation", () => {
  const source = readFileSync(
    resolve(appRoot, "scripts/manage-lean-l5-05-canary.ts"),
    "utf8",
  );

  assert.match(source, /\.eq\("email", email\)[\s\S]*?\.limit\(2\)/);
  assert.match(source, /fixture_marker/);
  assert.match(source, /email_confirmed_at/);
  assert.match(source, /profile\.role !== "user"/);
  assert.match(source, /expectedFingerprint/);
  assert.doesNotMatch(source, /listUsers\s*\(/);
  assert.doesNotMatch(source, /stripe\.(?:customers|subscriptions|refunds)/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*(?:email|password)/);
});
