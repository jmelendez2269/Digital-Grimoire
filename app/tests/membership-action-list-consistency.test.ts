import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, "src", relativePath), "utf-8");
}

test("tool-costs action lists stay synchronized across catalogs and parsers", () => {
  const catalogServer = readSource("lib/membership/membership-catalog.server.ts");
  const meteringCatalog = readSource("lib/membership/metering-catalog.server.ts");
  const walletPresentation = readSource("lib/membership/membership-wallet-presentation.ts");
  const toolCostsRoute = readSource("app/api/membership/tool-costs/route.ts");

  // Extract METERED_ACTION_CODES array
  const meteredCodesMatch = catalogServer.match(
    /export const METERED_ACTION_CODES = \[([\s\S]*?)\] as const;/
  );
  assert.ok(meteredCodesMatch, "METERED_ACTION_CODES not found");
  const meteredCodes = meteredCodesMatch[1]
    .split(",")
    .map((s) => s.trim().replace(/['"]/g, ""))
    .filter(Boolean);

  // Extract ACTION_DEFINITIONS entries
  const actionDefsMatch = catalogServer.match(
    /const ACTION_DEFINITIONS = Object\.freeze<readonly ActionDefinition\[\]>\(\[([\s\S]*?)\]\);/
  );
  assert.ok(actionDefsMatch, "ACTION_DEFINITIONS not found");
  const actionDefCodes = Array.from(
    actionDefsMatch[1].matchAll(/code: ["']([^"']+)["']/g),
    (m) => m[1]
  );

  // Extract wallet ACTION_CODES
  const walletCodesMatch = walletPresentation.match(
    /const ACTION_CODES = \[([\s\S]*?)\] as const;/
  );
  assert.ok(walletCodesMatch, "wallet ACTION_CODES not found");
  const walletCodes = walletCodesMatch[1]
    .split(",")
    .map((s) => s.trim().replace(/['"]/g, ""))
    .filter(Boolean);

  // Extract QUOTES array action codes from metering catalog
  const quotesMatch = meteringCatalog.match(
    /const QUOTES = Object\.freeze<readonly MeteringActionQuote\[\]>\(\[([\s\S]*?)\]\);/
  );
  assert.ok(quotesMatch, "QUOTES array not found");
  const quoteCodes = Array.from(
    quotesMatch[1].matchAll(/actionCode: ["']([^"']+)["']/g),
    (m) => m[1]
  );

  // Extract tool-costs COMMERCIAL_ACTIONS mapping
  const commercialActionsMatch = toolCostsRoute.match(
    /const COMMERCIAL_ACTIONS: Partial<[\s\S]*?> = \{([\s\S]*?)\};/
  );
  assert.ok(commercialActionsMatch, "COMMERCIAL_ACTIONS mapping not found");
  const toolCostsCodes = Array.from(
    commercialActionsMatch[1].matchAll(/["']([^"']+)["']:/g),
    (m) => m[1]
  );

  // The critical invariant: METERED_ACTION_CODES, ACTION_DEFINITIONS, wallet ACTION_CODES, 
  // and QUOTES must all have the same length and contain the same codes.
  // This prevents the tool-costs rejection bug where parseSafeToolCosts checks 
  // actions.length === ACTION_CODES.length
  assert.equal(
    meteredCodes.length,
    actionDefCodes.length,
    "METERED_ACTION_CODES and ACTION_DEFINITIONS must have the same length"
  );
  assert.equal(
    meteredCodes.length,
    walletCodes.length,
    "METERED_ACTION_CODES and wallet ACTION_CODES must have the same length"
  );
  assert.equal(
    meteredCodes.length,
    quoteCodes.length,
    "METERED_ACTION_CODES and QUOTES must have the same length"
  );

  // All lists must contain the same action codes in any order
  const meteredSet = new Set(meteredCodes);
  const actionDefSet = new Set(actionDefCodes);
  const walletSet = new Set(walletCodes);
  const quoteSet = new Set(quoteCodes);
  const toolCostsSet = new Set(toolCostsCodes);

  assert.deepEqual(
    [...meteredSet].sort(),
    [...actionDefSet].sort(),
    "METERED_ACTION_CODES and ACTION_DEFINITIONS must contain the same codes"
  );
  assert.deepEqual(
    [...meteredSet].sort(),
    [...walletSet].sort(),
    "METERED_ACTION_CODES and wallet ACTION_CODES must contain the same codes"
  );
  assert.deepEqual(
    [...meteredSet].sort(),
    [...quoteSet].sort(),
    "METERED_ACTION_CODES and QUOTES must contain the same codes"
  );

  // tool-costs mapping is a subset (not all actions have commercial mappings)
  // but every mapped action must be in METERED_ACTION_CODES
  for (const code of toolCostsCodes) {
    assert.ok(
      meteredSet.has(code),
      `tool-costs mapping contains "${code}" which is not in METERED_ACTION_CODES`
    );
  }

  // parseSafeToolCosts requires actions.length === ACTION_CODES.length
  // This is the critical invariant that prevents the tool-costs rejection bug
  const walletPresentationMatch = walletPresentation.match(
    /value\.actions\.length !== ACTION_CODES\.length/
  );
  assert.ok(
    walletPresentationMatch,
    "parseSafeToolCosts length check must be present"
  );
});
