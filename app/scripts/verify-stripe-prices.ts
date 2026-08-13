/**
 * LEAN-L2-03 privacy-safe, read-only Stripe catalog verifier.
 *
 * Allowed Stripe operations:
 * - accounts.retrieve
 * - products.list
 * - prices.list
 *
 * The output never includes raw keys, account/Product/Price IDs, customer data,
 * product copy, or metadata values. Stable Stripe IDs are represented only by
 * short SHA-256 fingerprints suitable for comparing audit runs.
 */

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as dotenv from "dotenv";
import Stripe from "stripe";

const OFFER_EXPECTATIONS = [
  {
    code: "student_founding_monthly",
    environmentKey: "PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY",
    amountCents: 1500,
  },
  {
    code: "student_standard_monthly",
    environmentKey: "PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY",
    amountCents: 1900,
  },
  {
    code: "scholar_monthly",
    environmentKey: "PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY",
    amountCents: 3900,
  },
  {
    code: "adept_monthly",
    environmentKey: "PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY",
    amountCents: 6900,
  },
] as const;

const LEGACY_PRICE_KEYS = [
  "NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT",
  "NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR",
  "NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT",
] as const;

type StripeMode = "live" | "test" | "unknown";

interface ProductProjection {
  id: string;
  active: boolean;
}

interface PriceProjection {
  id: string;
  active: boolean;
  livemode: boolean;
  currency: string;
  unitAmount: number | null;
  type: string;
  recurringInterval: string | null;
  recurringIntervalCount: number | null;
  recurringUsageType: string | null;
  productId: string | null;
}

export interface OfferVerification {
  code: (typeof OFFER_EXPECTATIONS)[number]["code"];
  configured: boolean;
  configuredPriceFingerprint: string | null;
  expected: {
    amountCents: number;
    currency: "usd";
    type: "recurring";
    interval: "month";
    intervalCount: 1;
    usageType: "licensed";
    active: true;
  };
  status:
    | "verified"
    | "missing_configuration"
    | "configured_price_not_found"
    | "configured_price_mismatch";
  checks: Record<string, boolean> | null;
  exactCandidateCount: number;
  exactCandidateFingerprints: string[];
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function stripeModeFromKey(secretKey: string): StripeMode {
  if (/^(?:sk|rk)_live_/.test(secretKey)) return "live";
  if (/^(?:sk|rk)_test_/.test(secretKey)) return "test";
  return "unknown";
}

function priceChecks(
  price: PriceProjection,
  product: ProductProjection | undefined,
  amountCents: number,
  mode: StripeMode,
): Record<string, boolean> {
  return {
    accountModeKnown: mode !== "unknown",
    modeMatchesAccountKey:
      mode === "live" ? price.livemode : mode === "test" && !price.livemode,
    productExists: product !== undefined,
    productActive: product?.active === true,
    priceActive: price.active,
    currencyUsd: price.currency === "usd",
    exactAmount: price.unitAmount === amountCents,
    recurring: price.type === "recurring",
    monthlyInterval: price.recurringInterval === "month",
    intervalCountOne: price.recurringIntervalCount === 1,
    licensedUsage: price.recurringUsageType === "licensed",
  };
}

function checksPass(checks: Record<string, boolean>): boolean {
  return Object.values(checks).every(Boolean);
}

export function verifyOffer(
  expectation: (typeof OFFER_EXPECTATIONS)[number],
  configuredPriceId: string | undefined,
  prices: PriceProjection[],
  products: Map<string, ProductProjection>,
  mode: StripeMode,
): OfferVerification {
  const exactCandidates = prices.filter((price) => {
    const product = price.productId
      ? products.get(price.productId)
      : undefined;
    return checksPass(
      priceChecks(price, product, expectation.amountCents, mode),
    );
  });
  const exactCandidateFingerprints = exactCandidates
    .map((price) => fingerprint(price.id))
    .sort();

  const expected = {
    amountCents: expectation.amountCents,
    currency: "usd" as const,
    type: "recurring" as const,
    interval: "month" as const,
    intervalCount: 1 as const,
    usageType: "licensed" as const,
    active: true as const,
  };

  if (!configuredPriceId) {
    return {
      code: expectation.code,
      configured: false,
      configuredPriceFingerprint: null,
      expected,
      status: "missing_configuration",
      checks: null,
      exactCandidateCount: exactCandidates.length,
      exactCandidateFingerprints,
    };
  }

  const configuredPrice = prices.find(
    (price) => price.id === configuredPriceId,
  );
  if (!configuredPrice) {
    return {
      code: expectation.code,
      configured: true,
      configuredPriceFingerprint: fingerprint(configuredPriceId),
      expected,
      status: "configured_price_not_found",
      checks: null,
      exactCandidateCount: exactCandidates.length,
      exactCandidateFingerprints,
    };
  }

  const product = configuredPrice.productId
    ? products.get(configuredPrice.productId)
    : undefined;
  const checks = priceChecks(
    configuredPrice,
    product,
    expectation.amountCents,
    mode,
  );
  return {
    code: expectation.code,
    configured: true,
    configuredPriceFingerprint: fingerprint(configuredPrice.id),
    expected,
    status: checksPass(checks) ? "verified" : "configured_price_mismatch",
    checks,
    exactCandidateCount: exactCandidates.length,
    exactCandidateFingerprints,
  };
}

function projectProduct(product: Stripe.Product): ProductProjection {
  return { id: product.id, active: product.active };
}

function projectPrice(price: Stripe.Price): PriceProjection {
  return {
    id: price.id,
    active: price.active,
    livemode: price.livemode,
    currency: price.currency,
    unitAmount: price.unit_amount,
    type: price.type,
    recurringInterval: price.recurring?.interval ?? null,
    recurringIntervalCount: price.recurring?.interval_count ?? null,
    recurringUsageType: price.recurring?.usage_type ?? null,
    productId:
      typeof price.product === "string" ? price.product : price.product?.id ?? null,
  };
}

async function main(): Promise<void> {
  if (!process.argv.includes("--no-local-env")) {
    const scriptDirectory = dirname(fileURLToPath(import.meta.url));
    dotenv.config({
      path: resolve(scriptDirectory, "../.env.local"),
      quiet: true,
    });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.log(
      JSON.stringify({
        verificationVersion: 1,
        result: "blocked_missing_stripe_key",
        externalMutations: 0,
      }),
    );
    process.exitCode = 2;
    return;
  }

  const mode = stripeModeFromKey(secretKey);
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 1 });

  try {
    const [account, stripeProducts, stripePrices] = await Promise.all([
      stripe.accounts.retrieve(),
      stripe.products.list({ limit: 100 }).autoPagingToArray({ limit: 1000 }),
      stripe.prices.list({ limit: 100 }).autoPagingToArray({ limit: 1000 }),
    ]);
    const products = stripeProducts.map(projectProduct);
    const prices = stripePrices.map(projectPrice);
    const productsById = new Map(products.map((product) => [product.id, product]));
    const offers = OFFER_EXPECTATIONS.map((expectation) =>
      verifyOffer(
        expectation,
        process.env[expectation.environmentKey],
        prices,
        productsById,
        mode,
      ),
    );
    const legacyPrices = LEGACY_PRICE_KEYS.map((environmentKey) => {
      const priceId = process.env[environmentKey];
      const price = priceId
        ? prices.find((candidate) => candidate.id === priceId)
        : undefined;
      return {
        environmentKey,
        configured: Boolean(priceId),
        fingerprint: priceId ? fingerprint(priceId) : null,
        found: price !== undefined,
        active: price?.active ?? null,
        livemode: price?.livemode ?? null,
        amountCents: price?.unitAmount ?? null,
        currency: price?.currency ?? null,
        interval: price?.recurringInterval ?? null,
      };
    });
    const allOffersVerified = offers.every(
      (offer) => offer.status === "verified",
    );

    console.log(
      JSON.stringify(
        {
          verificationVersion: 1,
          executedAt: new Date().toISOString(),
          result: allOffersVerified
            ? "verified"
            : "hold_missing_or_mismatched_configuration",
          readOnlyOperations: [
            "accounts.retrieve",
            "products.list",
            "prices.list",
          ],
          externalMutations: 0,
          account: {
            mode,
            fingerprint: fingerprint(account.id),
            retrieved: true,
          },
          catalog: {
            productCount: products.length,
            activeProductCount: products.filter((product) => product.active)
              .length,
            priceCount: prices.length,
            activePriceCount: prices.filter((price) => price.active).length,
            recurringPriceCount: prices.filter(
              (price) => price.type === "recurring",
            ).length,
          },
          offers,
          legacyPrices,
          privacy: {
            rawAccountIdsEmitted: false,
            rawProductIdsEmitted: false,
            rawPriceIdsEmitted: false,
            productCopyEmitted: false,
            customerOrSubscriptionDataAccessed: false,
          },
        },
        null,
        2,
      ),
    );
    if (!allOffersVerified) process.exitCode = 2;
  } catch {
    console.log(
      JSON.stringify({
        verificationVersion: 1,
        result: "stripe_read_failed",
        externalMutations: 0,
        privacy: { rawStripeErrorEmitted: false },
      }),
    );
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (entrypoint === import.meta.url) {
  void main();
}
