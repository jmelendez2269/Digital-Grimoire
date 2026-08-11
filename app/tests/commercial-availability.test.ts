import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CHECKOUT_ALLOWED_PRICE_IDS_ENV,
  COMMERCIAL_ACTIONS,
  ENABLED_COMMERCIAL_ACTIONS_ENV,
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

  assert.ok(
    guardCheckoutOffer("price_unknown000", {
      [ENABLED_COMMERCIAL_ACTIONS_ENV]: "checkout",
      [CHECKOUT_ALLOWED_PRICE_IDS_ENV]: "price_allowed123",
    }),
  );
});

test("Checkout fails closed before request parsing, Supabase, or Stripe", () => {
  const path = "src/app/api/stripe/create-checkout-session/route.ts";
  const handler = postHandlerSource(path);
  const actionGuard = handler.indexOf('guardCommercialAction("checkout")');
  const requestParse = handler.indexOf("request.json()");
  const serverResolution = handler.indexOf("resolveMembershipCheckoutOffer(");
  const offerGuard = handler.indexOf(
    "guardCheckoutOffer(serverOffer.stripePriceId)",
  );
  const supabaseClient = handler.indexOf("createClient()");
  const stripeClient = handler.indexOf("getStripeClient()");

  assert.ok(actionGuard >= 0 && actionGuard < requestParse);
  assert.ok(serverResolution > requestParse && serverResolution < supabaseClient);
  assert.ok(offerGuard > requestParse && offerGuard < supabaseClient);
  assert.ok(offerGuard < stripeClient);

  const source = readSource(path);
  assert.doesNotMatch(source, /NEXT_PUBLIC_STRIPE_PRICE_ID_/);
  assert.doesNotMatch(source, /body\.(?:priceId|amount|mode|tier|customerId)/);
  assert.match(source, /mode:\s*"subscription"/);
});

test("customer-reachable unmetered routes guard before cost or mutation work", () => {
  const guardedRoutes: Array<[string, string, string[]]> = [
    ["src/app/api/working/generate/route.ts", "working_generation", ["createClient()", "synthesizeRitual("]],
    ["src/app/api/parallax/query/route.ts", "seven_lenses_generation", ["createClient()", "createSSEStream("]],
    ["src/app/api/parallax/ai-search/route.ts", "deep_search_generation", ["createClient()", "hybridSearch(", "aiOrchestrator.chatComplete("]],
    ["src/app/api/parallax/lens/[lensId]/route.ts", "seven_lenses_expansion", ["createClient()", "hybridSearch(", "generateLensResponse("]],
    ["src/app/api/ai/gpt/route.ts", "gpt_proxy", ["createClient()", "aiOrchestrator.chatComplete("]],
    ["src/app/api/ai/claude/route.ts", "claude_proxy", ["createClient()", "aiOrchestrator.chatComplete("]],
    ["src/app/api/ai/gemini/route.ts", "gemini_proxy", ["createClient()", "aiOrchestrator.chatComplete("]],
    ["src/app/api/practitioner/tarot/generate/route.ts", "tarot_image_generation", ["new OpenAI(", "openai.images.generate("]],
    ["src/app/api/covers/generate/route.ts", "cover_image_generation", ["generateWithReplicate(", "createClient()"]],
    ["src/app/api/chapters/generate-names/route.ts", "chapter_name_generation", ["createClient()", "getOpenRouterClient()"]],
    ["src/app/api/metadata/extract/route.ts", "metadata_extraction", ["createClient()", "getOpenRouterClient()"]],
    ["src/app/api/process-document/route.ts", "document_processing", ["getR2Client()", "extractMetadata("]],
    ["src/app/api/process-media/route.ts", "media_processing", ["getR2Client()", "generateTranscript("]],
  ];

  for (const [path, action, markers] of guardedRoutes) {
    assertGuardPrecedes(path, action, markers);
  }
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
