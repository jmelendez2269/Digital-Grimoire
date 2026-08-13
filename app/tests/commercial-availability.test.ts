import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CHECKOUT_ALLOWED_PRICE_IDS_ENV,
  COMMERCIAL_ACTIONS,
  CONFIGURABLE_COMMERCIAL_ACTIONS,
  ENABLED_COMMERCIAL_ACTIONS_ENV,
  HARD_CLOSED_GENERATION_ACTIONS,
  isCheckoutPriceAllowed,
  isCommercialActionEnabled,
} from "../src/lib/commercial-availability-policy";
import {
  guardCheckoutOffer,
  guardCommercialAction,
} from "../src/lib/commercial-availability";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function postHandlerSource(relativePath: string): string {
  const source = readSource(relativePath);
  const start = source.indexOf("export async function POST");
  assert.notEqual(start, -1, `${relativePath} must export POST`);
  return source.slice(start);
}

function assertGuardPrecedes(
  relativePath: string,
  action: string,
  sideEffectMarkers: string[],
): void {
  const handler = postHandlerSource(relativePath);
  const guardIndex = Math.max(
    handler.indexOf(`guardCommercialAction(${JSON.stringify(action)})`),
    handler.indexOf(`guardCommercialAction('${action}')`),
  );
  assert.notEqual(guardIndex, -1, `${relativePath} must guard ${action}`);

  for (const marker of sideEffectMarkers) {
    const markerIndex = handler.indexOf(marker);
    assert.notEqual(markerIndex, -1, `${relativePath} must contain ${marker}`);
    assert.ok(
      guardIndex < markerIndex,
      `${relativePath} must guard ${action} before ${marker}`,
    );
  }
}

test("every commercial action is disabled when server configuration is absent", () => {
  for (const action of COMMERCIAL_ACTIONS) {
    assert.equal(isCommercialActionEnabled(action, {}), false, action);
  }
});

test("only exact action tokens enable a contained path", () => {
  const environment = {
    [ENABLED_COMMERCIAL_ACTIONS_ENV]:
      "checkout, working_generation,not_a_real_action",
  };

  assert.equal(isCommercialActionEnabled("checkout", environment), true);
  assert.equal(
    isCommercialActionEnabled("working_generation", environment),
    true,
  );
  assert.equal(
    isCommercialActionEnabled("seven_lenses_generation", environment),
    false,
  );
  assert.equal(
    isCommercialActionEnabled("checkout", {
      [ENABLED_COMMERCIAL_ACTIONS_ENV]: "*",
    }),
    false,
  );
});

test("unmetered generation actions cannot be reopened by configuration", () => {
  assert.deepEqual(
    new Set([
      ...CONFIGURABLE_COMMERCIAL_ACTIONS,
      ...HARD_CLOSED_GENERATION_ACTIONS,
    ]),
    new Set(COMMERCIAL_ACTIONS),
  );

  for (const action of HARD_CLOSED_GENERATION_ACTIONS) {
    assert.equal(
      isCommercialActionEnabled(action, {
        [ENABLED_COMMERCIAL_ACTIONS_ENV]: action,
      }),
      false,
      action,
    );
  }
});

test("Checkout requires action enablement and an exact server-only Price allowlist", () => {
  const enabled = {
    [ENABLED_COMMERCIAL_ACTIONS_ENV]: "checkout",
    [CHECKOUT_ALLOWED_PRICE_IDS_ENV]: "price_allowed123,price_other456",
    NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT: "price_legacy789",
  };

  assert.equal(isCheckoutPriceAllowed("price_allowed123", enabled), true);
  assert.equal(isCheckoutPriceAllowed("price_unknown000", enabled), false);
  assert.equal(isCheckoutPriceAllowed("price_legacy789", enabled), false);
  assert.equal(isCheckoutPriceAllowed("prod_not_a_price", enabled), false);
  assert.equal(
    isCheckoutPriceAllowed("price_allowed123", {
      [CHECKOUT_ALLOWED_PRICE_IDS_ENV]: "price_allowed123",
    }),
    false,
  );
});

test("disabled guards return one opaque, non-cacheable 503 response", async () => {
  const response = guardCommercialAction("working_generation", {});
  assert.ok(response);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("retry-after"), "3600");
  assert.deepEqual(await response.json(), {
    error: "This action is temporarily unavailable.",
    code: "ACTION_TEMPORARILY_UNAVAILABLE",
  });

  assert.equal(
    guardCommercialAction("working_generation", {
      [ENABLED_COMMERCIAL_ACTIONS_ENV]: "working_generation",
    }),
    null,
  );

  const hardClosed = guardCommercialAction("deep_search_generation", {
    [ENABLED_COMMERCIAL_ACTIONS_ENV]: "deep_search_generation",
  });
  assert.ok(hardClosed);
  assert.equal(hardClosed.status, 503);

  assert.ok(
    guardCheckoutOffer("price_unknown000", {
      [ENABLED_COMMERCIAL_ACTIONS_ENV]: "checkout",
      [CHECKOUT_ALLOWED_PRICE_IDS_ENV]: "price_allowed123",
    }),
  );
});

test("Checkout authenticates before the exact public-or-canary gate and still fails before ledger or Stripe", () => {
  const path = "src/app/api/stripe/create-checkout-session/route.ts";
  const handler = postHandlerSource(path);
  const requestParse = handler.indexOf("request.json()");
  const supabaseClient = handler.indexOf("createClient()");
  const profileRole = handler.indexOf('.select("role")');
  const checkout = handler.indexOf("createMembershipCheckout(");
  const stripeClient = handler.lastIndexOf("getStripeClient()");

  const checkoutSource = readSource(
    "src/lib/membership/membership-checkout.server.ts",
  );
  const publicResolution = checkoutSource.indexOf(
    "resolveMembershipCheckoutOffer(",
  );
  const canaryResolution = checkoutSource.indexOf(
    "resolveMembershipCanaryCheckoutOfferForUser(",
  );
  const offerGuard = checkoutSource.indexOf(
    "isCheckoutPriceAllowed(offer.stripePriceId",
  );
  const membership = checkoutSource.indexOf(
    "dependencies.loadMembership(input.userId)",
  );
  const reservation = checkoutSource.indexOf("dependencies.reserveRequest(");

  assert.ok(requestParse >= 0 && requestParse < supabaseClient);
  assert.ok(supabaseClient < profileRole && profileRole < checkout);
  assert.ok(checkout < stripeClient);
  assert.ok(publicResolution >= 0 && publicResolution < membership);
  assert.ok(canaryResolution >= 0 && canaryResolution < membership);
  assert.ok(offerGuard >= 0 && offerGuard < membership);
  assert.ok(offerGuard < reservation);

  const source = readSource(path);
  assert.doesNotMatch(source, /NEXT_PUBLIC_STRIPE_PRICE_ID_/);
  assert.doesNotMatch(source, /body\.(?:priceId|amount|mode|tier|customerId)/);
  assert.match(source, /mode:\s*"subscription"/);
});

test("customer-reachable unmetered routes guard before cost or mutation work", () => {
  const guardedRoutes: Array<[string, string, string[]]> = [
    ["src/app/api/working/generate/route.ts", "working_generation", ["executeMeteredWorking("]],
    ["src/app/api/parallax/query/route.ts", "seven_lenses_generation", ["executeMeteredSevenLenses("]],
    ["src/app/api/parallax/ai-search/route.ts", "deep_search_generation", ["createClient()", "request.json()", "hybridSearch(", "aiOrchestrator.chatComplete("]],
    ["src/app/api/parallax/lens/[lensId]/route.ts", "seven_lenses_expansion", ["executeMeteredLensExpansion("]],
    ["src/app/api/ai/gpt/route.ts", "gpt_proxy", ["createClient()", "request.json()", "aiOrchestrator.chatComplete("]],
    ["src/app/api/ai/claude/route.ts", "claude_proxy", ["createClient()", "request.json()", "aiOrchestrator.chatComplete("]],
    ["src/app/api/ai/gemini/route.ts", "gemini_proxy", ["createClient()", "request.json()", "aiOrchestrator.chatComplete("]],
    ["src/app/api/practitioner/tarot/generate/route.ts", "tarot_image_generation", ["new OpenAI(", "req.json()", "openai.images.generate("]],
    ["src/app/api/covers/generate/route.ts", "cover_image_generation", ["request.json()", "generateWithReplicate(", "createClient()"]],
    ["src/app/api/chapters/generate-names/route.ts", "chapter_name_generation", ["createClient()", "request.json()", "getOpenRouterClient()"]],
    ["src/app/api/metadata/extract/route.ts", "metadata_extraction", ["createClient()", "request.json()", "getOpenRouterClient()"]],
    ["src/app/api/process-document/route.ts", "document_processing", ["getR2Client()", "request.json()", "extractMetadata("]],
    ["src/app/api/process-media/route.ts", "media_processing", ["getR2Client()", "request.json()", "generateTranscript("]],
  ];

  for (const [path, action, markers] of guardedRoutes) {
    assertGuardPrecedes(path, action, markers);
  }
});

test("curator-only generation routes prove admin authority before prompts or providers", () => {
  const adminRoutes: Array<[string, string[]]> = [
    [
      "src/app/api/documents/generate-metadata/route.ts",
      ["request.json()", "getOpenRouterClient()", "chat.completions.create("],
    ],
    [
      "src/app/api/documents/rescan-all-metadata/route.ts",
      ["request.json()", "getR2Client()", "extractMetadata("],
    ],
  ];

  for (const [path, markers] of adminRoutes) {
    const handler = postHandlerSource(path);
    const adminCheck = handler.indexOf("profile?.role !== 'admin'");
    assert.notEqual(adminCheck, -1, `${path} must require the admin role`);
    for (const marker of markers) {
      const markerIndex = handler.indexOf(marker);
      assert.notEqual(markerIndex, -1, `${path} must contain ${marker}`);
      assert.ok(adminCheck < markerIndex, `${path} must authorize before ${marker}`);
    }
  }
});

test("zero-credit read, search, graph, Journal, and reopen surfaces stay outside commercial gating", () => {
  const freeSurfaces = [
    "src/app/library/page.tsx",
    "src/app/graph/page.tsx",
    "src/app/journal/page.tsx",
    "src/app/api/concepts/route.ts",
    "src/app/api/search/history/route.ts",
  ];

  for (const path of freeSurfaces) {
    assert.doesNotMatch(readSource(path), /guardCommercialAction\(/, path);
  }

  const conceptsGet = readSource("src/app/api/concepts/route.ts").split(
    "export async function POST",
  )[0];
  assert.doesNotMatch(
    conceptsGet,
    /scoreConceptsWithAI|chat\.completions\.create|aiOrchestrator\.chatComplete/,
  );

  const sevenLenses = readSource("src/app/seven-lenses/page.tsx");
  assert.match(sevenLenses, /setCurrentResponseId\(conversation\.id\)/);
  assert.match(sevenLenses, /setResponse\(formattedResponse\)/);
});

test("billing reconciliation has its own default-closed gate before auth or Stripe", () => {
  const path = "src/app/api/stripe/sync-subscription/route.ts";
  const handler = postHandlerSource(path);
  const gate = handler.indexOf("billingOperationsEnabled()");
  const auth = handler.indexOf("createClient()");
  const stripe = handler.indexOf("getStripeClient()");

  assert.ok(gate >= 0 && gate < auth);
  assert.ok(gate < stripe);
  assert.doesNotMatch(handler, /guardCommercialAction\(["']checkout["']\)/);
});

test("sacred-text imports preserve non-AI mode and guard AI mode before work", () => {
  const path = "src/app/api/import-sacred-text/route.ts";
  const handler = postHandlerSource(path);
  const branch = handler.indexOf("body?.useAI !== false");
  const guard = handler.indexOf(
    "guardCommercialAction('sacred_text_ai_metadata')",
  );
  const auth = handler.indexOf("createClient()");
  const remoteParse = handler.indexOf("parseWebText(");
  const provider = handler.indexOf("extractMetadata(");

  assert.ok(branch >= 0 && branch < guard);
  assert.ok(guard < auth);
  assert.ok(guard < remoteParse);
  assert.ok(guard < provider);
});

test("the server response wrapper is non-public and configuration-opaque", () => {
  const source = readSource("src/lib/commercial-availability.ts");
  assert.match(source, /import "server-only"/);
  assert.match(source, /status:\s*503/);
  assert.match(source, /ACTION_TEMPORARILY_UNAVAILABLE/);
  assert.match(source, /"Cache-Control":\s*"no-store"/);
  assert.doesNotMatch(source, /PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS/);
  assert.doesNotMatch(source, /PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS/);
});
