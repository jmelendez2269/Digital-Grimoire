/**
 * LEAN-L2-03 live Stripe Price configuration.
 *
 * This command is deliberately narrow: it reads the Account, Products, and
 * Prices; reuses the approved legacy Student founding Price; and creates only
 * missing immutable monthly Prices. It never reads customer or subscription
 * resources and requires both a live key and an explicit --apply flag.
 */

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import Stripe from "stripe";

import { stripeModeFromKey } from "./verify-stripe-prices";

const LEGACY_KEYS = {
  student: "NEXT_PUBLIC_STRIPE_PRICE_ID_STUDENT",
  scholar: "NEXT_PUBLIC_STRIPE_PRICE_ID_SCHOLAR",
  adept: "NEXT_PUBLIC_STRIPE_PRICE_ID_ADEPT",
} as const;

const OUTPUT_KEYS = {
  founding: "PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY",
  standard: "PRISMARIUM_STRIPE_PRICE_STUDENT_STANDARD_MONTHLY",
  scholar: "PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY",
  adept: "PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY",
} as const;

interface PriceTarget {
  code: "student_standard_monthly" | "scholar_monthly" | "adept_monthly";
  outputKey: (typeof OUTPUT_KEYS)["standard" | "scholar" | "adept"];
  legacyKey: (typeof LEGACY_KEYS)["student" | "scholar" | "adept"];
  amountCents: 1900 | 3900 | 6900;
  lookupKey: string;
  nickname: string;
}

const CREATE_TARGETS: PriceTarget[] = [
  {
    code: "student_standard_monthly",
    outputKey: OUTPUT_KEYS.standard,
    legacyKey: LEGACY_KEYS.student,
    amountCents: 1900,
    lookupKey: "prismarium_student_standard_monthly_v1",
    nickname: "Prismarium Student Standard Monthly v1",
  },
  {
    code: "scholar_monthly",
    outputKey: OUTPUT_KEYS.scholar,
    legacyKey: LEGACY_KEYS.scholar,
    amountCents: 3900,
    lookupKey: "prismarium_scholar_monthly_v1",
    nickname: "Prismarium Scholar Monthly v1",
  },
  {
    code: "adept_monthly",
    outputKey: OUTPUT_KEYS.adept,
    legacyKey: LEGACY_KEYS.adept,
    amountCents: 6900,
    lookupKey: "prismarium_adept_monthly_v1",
    nickname: "Prismarium Adept Monthly v1",
  },
];

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function productId(price: Stripe.Price): string | null {
  return typeof price.product === "string"
    ? price.product
    : price.product?.id ?? null;
}

export function isExactMonthlyPrice(
  price: Stripe.Price,
  expectedProductId: string,
  amountCents: number,
): boolean {
  return (
    price.active &&
    price.livemode &&
    productId(price) === expectedProductId &&
    price.currency === "usd" &&
    price.unit_amount === amountCents &&
    price.type === "recurring" &&
    price.recurring?.interval === "month" &&
    price.recurring.interval_count === 1 &&
    price.recurring.usage_type === "licensed"
  );
}

export function selectReusablePrice(
  prices: Stripe.Price[],
  expectedProductId: string,
  amountCents: number,
  lookupKey: string,
): Stripe.Price | null {
  const matches = prices.filter((price) =>
    isExactMonthlyPrice(price, expectedProductId, amountCents),
  );
  const lookupMatch = matches.filter((price) => price.lookup_key === lookupKey);
  if (lookupMatch.length === 1) return lookupMatch[0];
  if (lookupMatch.length > 1 || matches.length > 1) {
    throw new Error("ambiguous_exact_price_candidates");
  }
  return matches[0] ?? null;
}

function requiredEnvironmentValue(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`missing_required_environment:${key}`);
  return value;
}

function outputPathFromArguments(): string {
  const flagIndex = process.argv.indexOf("--output-json");
  const value = flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined;
  if (!value) throw new Error("missing_output_json_path");
  return resolve(value);
}

async function main(): Promise<void> {
  if (!process.argv.includes("--apply")) {
    throw new Error("refusing_without_apply_flag");
  }

  const secretKey = requiredEnvironmentValue("STRIPE_SECRET_KEY");
  if (stripeModeFromKey(secretKey) !== "live") {
    throw new Error("refusing_non_live_stripe_key");
  }

  const stripe = new Stripe(secretKey, { maxNetworkRetries: 1 });
  const [account, products, prices] = await Promise.all([
    stripe.accounts.retrieve(),
    stripe.products.list({ limit: 100 }).autoPagingToArray({ limit: 1000 }),
    stripe.prices.list({ limit: 100 }).autoPagingToArray({ limit: 1000 }),
  ]);
  if (!account.id) throw new Error("stripe_account_not_retrieved");

  const productsById = new Map(products.map((product) => [product.id, product]));
  const legacyStudentId = requiredEnvironmentValue(LEGACY_KEYS.student);
  const legacyStudent = prices.find((price) => price.id === legacyStudentId);
  const legacyStudentProductId = legacyStudent ? productId(legacyStudent) : null;
  if (
    !legacyStudent ||
    !legacyStudentProductId ||
    productsById.get(legacyStudentProductId)?.active !== true ||
    !isExactMonthlyPrice(legacyStudent, legacyStudentProductId, 1500)
  ) {
    throw new Error("legacy_student_price_is_not_approved_founding_offer");
  }

  const mappings: Record<string, string> = {
    [OUTPUT_KEYS.founding]: legacyStudent.id,
  };
  const actions: Array<{
    code: string;
    action: "reused" | "created";
    fingerprint: string;
  }> = [
    {
      code: "student_founding_monthly",
      action: "reused",
      fingerprint: fingerprint(legacyStudent.id),
    },
  ];

  for (const target of CREATE_TARGETS) {
    const legacyPriceId = requiredEnvironmentValue(target.legacyKey);
    const legacyPrice = prices.find((price) => price.id === legacyPriceId);
    const targetProductId = legacyPrice ? productId(legacyPrice) : null;
    if (!targetProductId || productsById.get(targetProductId)?.active !== true) {
      throw new Error(`legacy_tier_product_unavailable:${target.code}`);
    }

    const reusable = selectReusablePrice(
      prices,
      targetProductId,
      target.amountCents,
      target.lookupKey,
    );
    const configured =
      reusable ??
      (await stripe.prices.create(
        {
          active: true,
          currency: "usd",
          unit_amount: target.amountCents,
          product: targetProductId,
          recurring: {
            interval: "month",
            interval_count: 1,
            usage_type: "licensed",
          },
          lookup_key: target.lookupKey,
          nickname: target.nickname,
          metadata: {
            prismarium_offer_code: target.code,
            prismarium_catalog_version: "1",
          },
        },
        { idempotencyKey: `prismarium-l2-03-live-${target.code}-v1` },
      ));

    if (!isExactMonthlyPrice(configured, targetProductId, target.amountCents)) {
      throw new Error(`configured_price_failed_validation:${target.code}`);
    }
    mappings[target.outputKey] = configured.id;
    actions.push({
      code: target.code,
      action: reusable ? "reused" : "created",
      fingerprint: fingerprint(configured.id),
    });
    if (!reusable) prices.push(configured);
  }

  await writeFile(outputPathFromArguments(), JSON.stringify(mappings), {
    encoding: "utf8",
    flag: "wx",
  });
  console.log(
    JSON.stringify(
      {
        result: "configured",
        accountMode: "live",
        actions,
        mappingFileWritten: true,
        rawStripeIdsEmitted: false,
        customerOrSubscriptionDataAccessed: false,
      },
      null,
      2,
    ),
  );
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (entrypoint === import.meta.url) {
  void main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        result: "blocked",
        reason: error instanceof Error ? error.message : "unknown_error",
        rawStripeErrorEmitted: false,
      }),
    );
    process.exitCode = 1;
  });
}
