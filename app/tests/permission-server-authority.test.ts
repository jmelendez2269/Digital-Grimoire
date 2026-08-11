import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ");
}

function assertUsesServiceClient(
  relativePath: string,
  expectedMutation: RegExp,
): void {
  const source = readSource(relativePath);

  assert.match(
    source,
    /import \{ createServiceClient \} from ["']@\/lib\/supabase\/service["'];/,
    `${relativePath} must import the server-only service client`,
  );
  assert.match(
    source,
    /const serviceSupabase = createServiceClient\(\);/,
    `${relativePath} must create a service client after authenticating the request`,
  );
  assert.match(source, expectedMutation);
}

test("Stripe authority writes use the service role after request authentication", () => {
  const checkout = readSource(
    "src/app/api/stripe/create-checkout-session/route.ts",
  );
  assert.match(
    checkout,
    /import \{ createServiceClient \} from ["']@\/lib\/supabase\/service["'];/,
  );
  assert.match(checkout, /const serviceSupabase = createServiceClient\(\);/);
  assert.match(
    checkout,
    /serviceSupabase \.from\("billing_checkout_requests"\) \.insert\(/,
  );
  assert.match(
    checkout,
    /serviceSupabase \.from\("billing_checkout_requests"\) \.update\(/,
  );
  assert.doesNotMatch(checkout, /\.from\("users"\)/);
  assert.doesNotMatch(checkout, /stripe\.customers\.(?:create|retrieve|update)/);
  assertUsesServiceClient(
    "src/app/api/stripe/sync-subscription/route.ts",
    /serviceSupabase\.rpc\( "reconcile_billing_membership_snapshot_v1"/,
  );

  const webhook = readSource("src/app/api/stripe/webhook/route.ts");
  assert.match(
    webhook,
    /import \{ createServiceClient \} from ["']@\/lib\/supabase\/service["'];/,
  );
  assert.match(webhook, /const serviceSupabase = createServiceClient\(\);/);
  assert.match(
    webhook,
    /serviceSupabase\.rpc\( "process_billing_webhook_event"/,
  );
  assert.doesNotMatch(webhook, /\.from\(["']users["']\)/);
  assert.doesNotMatch(webhook, /createClient\(\)/);
});

test("Stripe projection fails closed for unknown Prices and avoids sensitive logs", () => {
  const sync = readSource("src/app/api/stripe/sync-subscription/route.ts");
  const webhook = readSource("src/app/api/stripe/webhook/route.ts");
  const webhookNormalizer = readSource(
    "src/lib/membership/membership-webhook.server.ts",
  );
  const catalog = readSource("src/lib/membership/membership-catalog.server.ts");
  const serviceClient = readSource("src/lib/supabase/service.ts");

  const billing = readSource(
    "src/lib/membership/membership-billing.server.ts",
  );
  for (const source of [webhookNormalizer]) {
    assert.match(source, /resolveMembershipOfferByStripePriceId/);
    assert.doesNotMatch(source, /default to scholar/i);
    assert.doesNotMatch(source, /:\s*'scholar';/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_STRIPE_PRICE_ID_/);
  }

  assert.match(billing, /normalizeMembershipSubscriptionSnapshot/);
  assert.doesNotMatch(billing, /NEXT_PUBLIC_STRIPE_PRICE_ID_/);
  assert.match(sync, /reconcile_billing_membership_snapshot_v1/);
  assert.match(webhookNormalizer, /"UNKNOWN_SUBSCRIPTION_PRICE"/);
  assert.match(catalog, /if \(matches\.length !== 1\) return null;/);
  assert.doesNotMatch(
    sync,
    /console\.(?:log|info|error)\([^)]*(?:userId|customerId|subscriptionId|updateData)/,
  );
  assert.doesNotMatch(
    webhook,
    /console\.(?:log|info|error)\([^)]*(?:eventId|userId|customerId|subscriptionId)/,
  );
  assert.doesNotMatch(serviceClient, /keyPrefix|substring\(0, 10\)/);
});

test("shared cache and authoritative usage writes use the service role", () => {
  assertUsesServiceClient(
    "src/app/api/parallax/ai-search/route.ts",
    /serviceSupabase \.from\('search_cache'\) \.upsert\(/,
  );

  const usageTracker = readSource("src/lib/usage-tracker.ts");
  assert.match(
    usageTracker,
    /import \{ createServiceClient \} from ["']@\/lib\/supabase\/service["'];/,
  );
  assert.match(usageTracker, /const serviceSupabase = createServiceClient\(\);/);
  assert.match(
    usageTracker,
    /serviceSupabase\.from\('api_usage'\)\.insert\(/,
  );
});

test("server-owned indexing and preference persistence use the service role", () => {
  const embeddings = readSource("src/lib/parallax/embeddings.ts");
  assert.match(
    embeddings,
    /import \{ createServiceClient \} from ["']@\/lib\/supabase\/service["'];/,
  );
  assert.match(embeddings, /const serviceSupabase = createServiceClient\(\);/);
  assert.match(
    embeddings,
    /serviceSupabase\.rpc\('get_indexed_text_ids'\)/,
  );

  assertUsesServiceClient(
    "src/app/api/user/tts-preferences/route.ts",
    /serviceSupabase \.from\('users'\) \.update\(/,
  );
});
