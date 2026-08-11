export const COMMERCIAL_ACTIONS = [
  "checkout",
  "working_generation",
  "seven_lenses_generation",
  "seven_lenses_expansion",
  "deep_search_generation",
  "gpt_proxy",
  "claude_proxy",
  "gemini_proxy",
  "tarot_image_generation",
  "cover_image_generation",
  "chapter_name_generation",
  "metadata_extraction",
  "document_processing",
  "media_processing",
  "sacred_text_ai_metadata",
] as const;

export type CommercialAction = (typeof COMMERCIAL_ACTIONS)[number];
export type AvailabilityEnvironment = Record<string, string | undefined>;

export const ENABLED_COMMERCIAL_ACTIONS_ENV =
  "PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS";
export const CHECKOUT_ALLOWED_PRICE_IDS_ENV =
  "PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS";

function parseCsv(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

/**
 * L0-04 containment is default-closed. An action becomes available only when
 * its exact server-owned token is present; wildcards and truthy values have no
 * meaning so configuration mistakes remain safe.
 */
export function isCommercialActionEnabled(
  action: CommercialAction,
  environment: AvailabilityEnvironment = process.env,
): boolean {
  return parseCsv(environment[ENABLED_COMMERCIAL_ACTIONS_ENV]).has(action);
}

/**
 * Checkout requires both explicit action enablement and an exact server-only
 * Price allowlist match. Legacy NEXT_PUBLIC Price variables are intentionally
 * not authority for this decision.
 */
export function isCheckoutPriceAllowed(
  priceId: unknown,
  environment: AvailabilityEnvironment = process.env,
): priceId is string {
  if (!isCommercialActionEnabled("checkout", environment)) {
    return false;
  }

  if (typeof priceId !== "string" || !/^price_[A-Za-z0-9]+$/.test(priceId)) {
    return false;
  }

  return parseCsv(environment[CHECKOUT_ALLOWED_PRICE_IDS_ENV]).has(priceId);
}
