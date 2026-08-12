import "server-only";

import {
  METERED_ACTION_CODES,
  type CatalogEnvironment,
  type MeteredActionCode,
} from "@/lib/membership/membership-catalog.server";

export const METERING_QUOTE_VERSION = "lean-launch-v1" as const;
export const METERING_COST_RATE_VERSION = "lean-reader-guardrail-v1" as const;
export const DEFAULT_READER_MONTHLY_PROVIDER_BUDGET_USD = 50;

export const METERING_MODES = ["off", "shadow", "enforce"] as const;
export type MeteringMode = (typeof METERING_MODES)[number];

export interface MeteringActionQuote {
  actionCode: MeteredActionCode;
  customerLabel: string;
  creditCost: number | null;
  quoteVersion: typeof METERING_QUOTE_VERSION;
  estimatedProviderCostUsd: number | null;
  costRateVersion: typeof METERING_COST_RATE_VERSION;
  maxRequestBytes: number;
  maxConcurrency: number;
  velocityLimit: number;
  velocityWindowSeconds: number;
  holdSeconds: number;
  offered: boolean;
}

export interface MeteringActionPolicy {
  quote: MeteringActionQuote;
  mode: MeteringMode;
  killed: boolean;
  configurationValid: boolean;
  readerMonthlyProviderBudgetUsd: number;
}

const ENV = Object.freeze({
  defaultMode: "PRISMARIUM_METERING_MODE",
  actionModes: "PRISMARIUM_METERING_ACTION_MODES",
  globalKillSwitch: "PRISMARIUM_METERING_GLOBAL_KILL_SWITCH",
  actionKillSwitches: "PRISMARIUM_METERING_ACTION_KILL_SWITCHES",
  readerBudget: "PRISMARIUM_READER_MONTHLY_PROVIDER_BUDGET_USD",
} as const);

const QUOTES = Object.freeze<readonly MeteringActionQuote[]>([
  {
    actionCode: "working.generate",
    customerLabel: "The Working",
    creditCost: 1,
    quoteVersion: METERING_QUOTE_VERSION,
    estimatedProviderCostUsd: 0.05,
    costRateVersion: METERING_COST_RATE_VERSION,
    maxRequestBytes: 4_000,
    maxConcurrency: 1,
    velocityLimit: 6,
    velocityWindowSeconds: 600,
    holdSeconds: 300,
    offered: true,
  },
  {
    actionCode: "seven_lenses.expand",
    customerLabel: "Expand one lens",
    creditCost: 1,
    quoteVersion: METERING_QUOTE_VERSION,
    estimatedProviderCostUsd: 0.05,
    costRateVersion: METERING_COST_RATE_VERSION,
    maxRequestBytes: 12_000,
    maxConcurrency: 1,
    velocityLimit: 10,
    velocityWindowSeconds: 600,
    holdSeconds: 300,
    offered: true,
  },
  {
    actionCode: "seven_lenses.standard",
    customerLabel: "Standard Seven Lenses synthesis",
    creditCost: 2,
    quoteVersion: METERING_QUOTE_VERSION,
    estimatedProviderCostUsd: 0.1,
    costRateVersion: METERING_COST_RATE_VERSION,
    maxRequestBytes: 16_000,
    maxConcurrency: 1,
    velocityLimit: 6,
    velocityWindowSeconds: 600,
    holdSeconds: 300,
    offered: true,
  },
  {
    actionCode: "seven_lenses.long",
    customerLabel: "Long Seven Lenses synthesis",
    creditCost: 3,
    quoteVersion: METERING_QUOTE_VERSION,
    estimatedProviderCostUsd: 0.15,
    costRateVersion: METERING_COST_RATE_VERSION,
    maxRequestBytes: 16_000,
    maxConcurrency: 1,
    velocityLimit: 4,
    velocityWindowSeconds: 600,
    holdSeconds: 300,
    offered: true,
  },
  {
    actionCode: "deep_search.fresh",
    customerLabel: "Fresh Deep Search synthesis",
    creditCost: 3,
    quoteVersion: METERING_QUOTE_VERSION,
    estimatedProviderCostUsd: 0.15,
    costRateVersion: METERING_COST_RATE_VERSION,
    maxRequestBytes: 8_000,
    maxConcurrency: 1,
    velocityLimit: 4,
    velocityWindowSeconds: 600,
    holdSeconds: 300,
    offered: false,
  },
  {
    actionCode: "image.generate",
    customerLabel: "Image generation",
    creditCost: null,
    quoteVersion: METERING_QUOTE_VERSION,
    estimatedProviderCostUsd: null,
    costRateVersion: METERING_COST_RATE_VERSION,
    maxRequestBytes: 4_000,
    maxConcurrency: 1,
    velocityLimit: 2,
    velocityWindowSeconds: 600,
    holdSeconds: 300,
    offered: false,
  },
]);

function isMode(value: unknown): value is MeteringMode {
  return (
    typeof value === "string" &&
    METERING_MODES.includes(value as MeteringMode)
  );
}

function parseBoolean(value: string | undefined): {
  value: boolean;
  valid: boolean;
} {
  if (value === undefined || value === "false") {
    return { value: false, valid: true };
  }
  if (value === "true") return { value: true, valid: true };
  return { value: true, valid: false };
}

function parseActionModes(value: string | undefined): {
  modes: Map<MeteredActionCode, MeteringMode>;
  valid: boolean;
} {
  const modes = new Map<MeteredActionCode, MeteringMode>();
  if (!value?.trim()) return { modes, valid: true };

  for (const entry of value.split(",")) {
    const parts = entry.split("=");
    const actionCode = parts[0] as MeteredActionCode;
    const mode = parts[1];
    if (
      parts.length !== 2 ||
      !METERED_ACTION_CODES.includes(actionCode) ||
      !isMode(mode) ||
      modes.has(actionCode)
    ) {
      return { modes: new Map(), valid: false };
    }
    modes.set(actionCode, mode);
  }
  return { modes, valid: true };
}

function parseActionSet(value: string | undefined): {
  actions: Set<MeteredActionCode>;
  valid: boolean;
} {
  const actions = new Set<MeteredActionCode>();
  if (!value?.trim()) return { actions, valid: true };

  for (const entry of value.split(",")) {
    const actionCode = entry as MeteredActionCode;
    if (
      !entry ||
      entry !== entry.trim() ||
      !METERED_ACTION_CODES.includes(actionCode) ||
      actions.has(actionCode)
    ) {
      return { actions: new Set(), valid: false };
    }
    actions.add(actionCode);
  }
  return { actions, valid: true };
}

function parseReaderBudget(value: string | undefined): {
  budget: number;
  valid: boolean;
} {
  if (value === undefined) {
    return { budget: DEFAULT_READER_MONTHLY_PROVIDER_BUDGET_USD, valid: true };
  }
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(value)) {
    return { budget: DEFAULT_READER_MONTHLY_PROVIDER_BUDGET_USD, valid: false };
  }
  const budget = Number(value);
  return Number.isFinite(budget) && budget >= 0 && budget <= 100_000
    ? { budget, valid: true }
    : { budget: DEFAULT_READER_MONTHLY_PROVIDER_BUDGET_USD, valid: false };
}

export function getMeteringActionQuote(
  actionCode: unknown,
): MeteringActionQuote | null {
  if (
    typeof actionCode !== "string" ||
    !METERED_ACTION_CODES.includes(actionCode as MeteredActionCode)
  ) {
    return null;
  }
  const quote = QUOTES.find((candidate) => candidate.actionCode === actionCode);
  return quote ? { ...quote } : null;
}

/**
 * Resolves only server-owned flags. Missing or malformed configuration keeps
 * the action off; no browser-supplied price, mode, limit, or cost is accepted.
 */
export function resolveMeteringActionPolicy(
  actionCode: unknown,
  environment: CatalogEnvironment = process.env,
): MeteringActionPolicy | null {
  const quote = getMeteringActionQuote(actionCode);
  if (!quote) return null;

  const defaultModeRaw = environment[ENV.defaultMode];
  const defaultMode = isMode(defaultModeRaw) ? defaultModeRaw : "off";
  const defaultModeValid = defaultModeRaw === undefined || isMode(defaultModeRaw);
  const actionModes = parseActionModes(environment[ENV.actionModes]);
  const globalKill = parseBoolean(environment[ENV.globalKillSwitch]);
  const actionKills = parseActionSet(environment[ENV.actionKillSwitches]);
  const readerBudget = parseReaderBudget(environment[ENV.readerBudget]);
  const configurationValid =
    defaultModeValid &&
    actionModes.valid &&
    globalKill.valid &&
    actionKills.valid &&
    readerBudget.valid;
  const killed =
    globalKill.value ||
    actionKills.actions.has(quote.actionCode) ||
    !configurationValid;
  const configuredMode = actionModes.modes.get(quote.actionCode) ?? defaultMode;
  const mode = quote.offered && !killed ? configuredMode : "off";

  return {
    quote,
    mode,
    killed,
    configurationValid,
    readerMonthlyProviderBudgetUsd: readerBudget.budget,
  };
}
