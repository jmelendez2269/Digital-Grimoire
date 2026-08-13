import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { GET } from "../src/app/api/membership/tool-costs/route";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string) {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

test("tool cost route composes server catalog, independent commercial gate, and metering policy without mutations", () => {
  const source = read("src/app/api/membership/tool-costs/route.ts");
  assert.match(source, /getSafeMembershipCatalog\(\)/);
  assert.match(source, /isCommercialActionEnabled\(commercialAction\)/);
  assert.match(source, /resolveMeteringActionPolicy\(action\.code\)/);
  assert.match(source, /action\.launchEnabled/);
  assert.match(source, /policy\.mode !== "off"/);
  assert.match(source, /Cache-Control[\s\S]*no-store/);
  assert.doesNotMatch(source, /request\.json|searchParams|insert\(|update\(|delete\(|rpc\(/);
});

test("tool cost projection is exact, customer-safe, no-store, and closed by default", async () => {
  const response = await GET();
  const body = await response.json() as {
    toolCosts: {
      version: number;
      actions: Array<{
        actionCode: string;
        customerLabel: string;
        creditCost: number | null;
        enabled: boolean;
      }>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.toolCosts.version, 1);
  assert.deepEqual(
    body.toolCosts.actions.map(({ actionCode, creditCost, enabled }) => ({
      actionCode,
      creditCost,
      enabled,
    })),
    [
      { actionCode: "working.generate", creditCost: 1, enabled: false },
      { actionCode: "seven_lenses.expand", creditCost: 1, enabled: false },
      { actionCode: "seven_lenses.standard", creditCost: 2, enabled: false },
      { actionCode: "seven_lenses.long", creditCost: 3, enabled: false },
      { actionCode: "deep_search.fresh", creditCost: 3, enabled: false },
      { actionCode: "image.generate", creditCost: null, enabled: false },
    ],
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /stripe|provider|mode|killed|launchEnabled|configurationValid/i,
  );
});

test("profile and all metered tools consume the shared wallet state without importing server modules", () => {
  const profile = read("src/app/profile/page.tsx");
  const working = read("src/app/workbench/the-working/page.tsx");
  const lenses = read("src/app/seven-lenses/page.tsx");
  const expansion = read("src/components/parallax/ExpandableLensCard.tsx");
  const provider = read("src/components/membership/CreditWalletProvider.tsx");

  assert.match(profile, /tab=credits/);
  assert.match(profile, /<CreditWalletTab/);
  assert.match(working, /useToolCreditState\("working\.generate"\)/);
  assert.match(lenses, /seven_lenses\.standard/);
  assert.match(lenses, /seven_lenses\.long/);
  assert.match(expansion, /useToolCreditState\('seven_lenses\.expand'\)/);
  assert.match(provider, /fetch\("\/api\/membership\/wallet"/);
  assert.match(provider, /fetch\("\/api\/membership\/tool-costs"/);
  for (const source of [profile, working, lenses, expansion, provider]) {
    assert.doesNotMatch(source, /membership-wallet\.server|metering-catalog\.server|createServiceClient/);
  }
});

test("tool clients preserve input and distinguish reservation, commit, return, retry, reconciliation, and UTC capacity pause", () => {
  const working = read("src/app/workbench/the-working/page.tsx");
  const lenses = read("src/app/seven-lenses/page.tsx");
  const expansion = read("src/components/parallax/ExpandableLensCard.tsx");
  const status = read("src/components/membership/ToolCreditStatus.tsx");
  const routes = [
    read("src/app/api/working/generate/route.ts"),
    read("src/app/api/parallax/query/route.ts"),
    read("src/app/api/parallax/lens/[lensId]/route.ts"),
  ];

  assert.doesNotMatch(working, /setIntention\(""\)/);
  assert.doesNotMatch(lenses, /setQuery\(""\)/);
  assert.match(working, /setRunState\("reserved"\)/);
  assert.match(working, /setRunState\("committed"\)/);
  assert.match(status, /runState === "returned"/);
  assert.match(status, /runState === "retry"/);
  assert.match(status, /runState === "reconcile"/);
  assert.match(status, /runState === "capacity_paused"/);
  assert.match(status, /Paid-member generation and non-generative reading, search, Graph, Journal/);
  assert.match(status, /required[\s\S]*available/);
  assert.match(expansion, /The saved parent analysis remains available if expansion fails/);
  for (const route of routes) {
    assert.match(route, /nextUtcMonthBoundary\(\)/);
    assert.match(route, /READER_AI_CAPACITY_PAUSED/);
  }
});
