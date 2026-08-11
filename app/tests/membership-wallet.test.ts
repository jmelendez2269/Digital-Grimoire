import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { getCreditWalletForUser } from "../src/lib/membership/membership-wallet.server";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USER_ID = "11111111-1111-4111-8111-111111111111";

function projection(overrides: Record<string, unknown> = {}) {
  return {
    status: "current",
    availableCredits: 8,
    reservedCredits: 2,
    totalCredits: 10,
    grant: {
      planCode: "reader",
      grantedCredits: 10,
      validFrom: "2026-08-01T00:00:00.000Z",
      expiresAt: "2026-09-01T00:00:00.000Z",
      resetsAt: "2026-09-01T00:00:00.000Z",
      sourceKey: "must-not-leak",
    },
    pending: [
      {
        actionCode: "working.generate",
        credits: 2,
        createdAt: "2026-08-11T12:00:00.000Z",
        expiresAt: "2026-08-11T12:10:00.000Z",
        requestFingerprint: "must-not-leak",
      },
    ],
    history: [
      {
        kind: "credit_reserved",
        credits: 2,
        availableAfter: 8,
        reservedAfter: 2,
        actionCode: "working.generate",
        occurredAt: "2026-08-11T12:00:00.000Z",
        eventKey: "must-not-leak",
      },
      {
        kind: "monthly_grant",
        credits: 10,
        availableAfter: 10,
        reservedAfter: 0,
        actionCode: null,
        occurredAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    asOf: "2026-08-11T12:01:00.000Z",
    stripeCustomerId: "must-not-leak",
    userId: USER_ID,
    ...overrides,
  };
}

test("wallet loader scopes the service projection to the authenticated user", async () => {
  const calls: unknown[][] = [];
  const wallet = await getCreditWalletForUser(USER_ID, {
    now: () => new Date("2026-08-11T12:01:00.000Z"),
    loadWallet: async (...args) => {
      calls.push(args);
      return projection();
    },
  });

  assert.deepEqual(calls, [
    [USER_ID, "2026-08-11T12:01:00.000Z", 20],
  ]);
  assert.deepEqual(wallet, {
    status: "current",
    availableCredits: 8,
    reservedCredits: 2,
    totalCredits: 10,
    grant: {
      planCode: "reader",
      grantedCredits: 10,
      validFrom: "2026-08-01T00:00:00.000Z",
      expiresAt: "2026-09-01T00:00:00.000Z",
      resetsAt: "2026-09-01T00:00:00.000Z",
    },
    pending: [
      {
        actionCode: "working.generate",
        credits: 2,
        createdAt: "2026-08-11T12:00:00.000Z",
        expiresAt: "2026-08-11T12:10:00.000Z",
      },
    ],
    history: [
      {
        kind: "credit_reserved",
        credits: 2,
        availableAfter: 8,
        reservedAfter: 2,
        actionCode: "working.generate",
        occurredAt: "2026-08-11T12:00:00.000Z",
      },
      {
        kind: "monthly_grant",
        credits: 10,
        availableAfter: 10,
        reservedAfter: 0,
        actionCode: null,
        occurredAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    asOf: "2026-08-11T12:01:00.000Z",
  });
  assert.doesNotMatch(JSON.stringify(wallet), /must-not-leak|userId|stripe/i);
});

test("invalid identity and time stop before privileged loading", async () => {
  let calls = 0;
  const loadWallet = async () => {
    calls += 1;
    return projection();
  };

  await assert.rejects(
    getCreditWalletForUser("not-a-user", { loadWallet }),
    /CREDIT_WALLET_INVALID_USER/,
  );
  await assert.rejects(
    getCreditWalletForUser(USER_ID, {
      loadWallet,
      now: () => new Date("invalid"),
    }),
    /CREDIT_WALLET_INVALID_TIME/,
  );
  assert.equal(calls, 0);
});

test("malformed, inconsistent, and overlong projections fail closed", async () => {
  for (const value of [
    null,
    projection({ totalCredits: 999 }),
    projection({ reservedCredits: 3 }),
    projection({ status: "internal-error-detail" }),
    projection({ history: Array.from({ length: 21 }, () => projection().history[0]) }),
    projection({ grant: { ...projection().grant, planCode: "premium" } }),
    projection({ pending: [{ ...projection().pending[0], actionCode: "BAD ACTION" }] }),
  ]) {
    await assert.rejects(
      getCreditWalletForUser(USER_ID, {
        loadWallet: async () => value,
      }),
      /CREDIT_WALLET_INVALID_PROJECTION/,
    );
  }
});

test("the API derives scope only from auth and the database function is service-only", () => {
  const route = readFileSync(
    resolve(appRoot, "src/app/api/membership/wallet/route.ts"),
    "utf8",
  );
  const server = readFileSync(
    resolve(appRoot, "src/lib/membership/membership-wallet.server.ts"),
    "utf8",
  );
  const migration = readFileSync(
    resolve(
      appRoot,
      "../supabase/migrations/20260812030000_lean_l3_04_safe_wallet.sql",
    ),
    "utf8",
  );

  assert.match(server, /^import ["']server-only["'];/);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /getCreditWalletForUser\(user\.id\)/);
  assert.doesNotMatch(route, /searchParams|request\.json|userId\s*:/);
  assert.doesNotMatch(route, /stripe_|request_fingerprint|event_fingerprint/);
  assert.match(server, /\.rpc\("get_credit_wallet_v1"/);
  assert.match(migration, /revoke all on function public\.get_credit_wallet_v1/);
  assert.match(migration, /to service_role/);
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.get_credit_wallet_v1[\s\S]*?to (?:anon|authenticated)/,
  );
});
