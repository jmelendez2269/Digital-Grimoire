export const LEAN_L5_04_STUDY_BATCHES = 3;
export const LEAN_L5_04_REQUIRED_SUCCESSES = 30;

export const LEAN_L5_04_ACTIONS = [
  "working.generate",
  "seven_lenses.expand",
  "seven_lenses.standard",
  "seven_lenses.long",
] as const;

export type LeanL504Action = (typeof LEAN_L5_04_ACTIONS)[number];
export type LeanL504InputProfile =
  | "default"
  | "maximum"
  | "maximum-derived-parent";

export interface LeanL504ScheduledRun {
  actionCode: LeanL504Action;
  inputProfile: LeanL504InputProfile;
  accountOffset: 0 | 1 | 2;
  lensId?: "scientific" | "psychological";
}

export function canonicalJson(value: unknown, seen = new Set<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NON_FINITE_NUMBER");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error("CYCLIC_VALUE");
    seen.add(value);
    const result = `[${value.map((item) => canonicalJson(item, seen)).join(",")}]`;
    seen.delete(value);
    return result;
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (seen.has(object)) throw new Error("CYCLIC_VALUE");
    seen.add(object);
    const entries = Object.keys(object)
      .sort()
      .map((key) => {
        if (object[key] === undefined) throw new Error("UNDEFINED_VALUE");
        return `${JSON.stringify(key)}:${canonicalJson(object[key], seen)}`;
      });
    seen.delete(object);
    return `{${entries.join(",")}}`;
  }
  throw new Error("UNSUPPORTED_VALUE");
}

export function exactAsciiStringForCanonicalBytes(input: {
  prefix: string;
  maxBytes: number;
  buildValue: (value: string) => unknown;
}): string {
  if (!/^[\x20-\x7e]*$/.test(input.prefix)) {
    throw new Error("PREFIX_MUST_BE_PRINTABLE_ASCII");
  }
  const emptyBytes = Buffer.byteLength(canonicalJson(input.buildValue("")), "utf8");
  const remaining = input.maxBytes - emptyBytes - input.prefix.length;
  if (remaining < 0) throw new Error("PREFIX_EXCEEDS_LIMIT");
  const value = `${input.prefix}${"x".repeat(remaining)}`;
  const actualBytes = Buffer.byteLength(canonicalJson(input.buildValue(value)), "utf8");
  if (actualBytes !== input.maxBytes) throw new Error("MAX_BYTES_MISMATCH");
  return value;
}

export function scheduleForStudyBatch(batchNumber: number): LeanL504ScheduledRun[] {
  if (!Number.isSafeInteger(batchNumber) || batchNumber < 1 || batchNumber > 3) {
    throw new Error("STUDY_BATCH_OUT_OF_RANGE");
  }
  if (batchNumber === 1) {
    return [
      { actionCode: "working.generate", inputProfile: "default", accountOffset: 0 },
      { actionCode: "seven_lenses.standard", inputProfile: "default", accountOffset: 1 },
      {
        actionCode: "seven_lenses.expand",
        inputProfile: "default",
        accountOffset: 1,
        lensId: "scientific",
      },
      { actionCode: "seven_lenses.long", inputProfile: "default", accountOffset: 2 },
      { actionCode: "working.generate", inputProfile: "maximum", accountOffset: 0 },
    ];
  }

  if (batchNumber === 2) {
    return [
      { actionCode: "seven_lenses.standard", inputProfile: "maximum", accountOffset: 0 },
      {
        actionCode: "seven_lenses.expand",
        inputProfile: "maximum-derived-parent",
        accountOffset: 0,
        lensId: "scientific",
      },
      { actionCode: "working.generate", inputProfile: "default", accountOffset: 0 },
      { actionCode: "seven_lenses.long", inputProfile: "default", accountOffset: 0 },
      { actionCode: "seven_lenses.standard", inputProfile: "default", accountOffset: 1 },
      {
        actionCode: "seven_lenses.expand",
        inputProfile: "default",
        accountOffset: 1,
        lensId: "scientific",
      },
      { actionCode: "working.generate", inputProfile: "default", accountOffset: 1 },
      { actionCode: "seven_lenses.long", inputProfile: "default", accountOffset: 1 },
      { actionCode: "seven_lenses.standard", inputProfile: "default", accountOffset: 2 },
      {
        actionCode: "seven_lenses.expand",
        inputProfile: "default",
        accountOffset: 2,
        lensId: "psychological",
      },
      { actionCode: "working.generate", inputProfile: "default", accountOffset: 2 },
      { actionCode: "seven_lenses.long", inputProfile: "default", accountOffset: 2 },
      { actionCode: "seven_lenses.standard", inputProfile: "default", accountOffset: 0 },
    ];
  }

  const runs: LeanL504ScheduledRun[] = [];
  for (const accountOffset of [0, 1, 2] as const) {
    runs.push(
      { actionCode: "seven_lenses.standard", inputProfile: "default", accountOffset },
      {
        actionCode: "seven_lenses.expand",
        inputProfile: "default",
        accountOffset,
        lensId: accountOffset === 2 ? "psychological" : "scientific",
      },
      { actionCode: "working.generate", inputProfile: "default", accountOffset },
      {
        actionCode: "seven_lenses.long",
        inputProfile: accountOffset === 0 ? "maximum" : "default",
        accountOffset,
      },
    );
  }
  return runs;
}

export function summarizeStudySchedule(): Record<LeanL504Action, number> {
  const totals = Object.fromEntries(
    LEAN_L5_04_ACTIONS.map((action) => [action, 0]),
  ) as Record<LeanL504Action, number>;
  for (let batch = 1; batch <= LEAN_L5_04_STUDY_BATCHES; batch += 1) {
    for (const run of scheduleForStudyBatch(batch)) totals[run.actionCode] += 1;
  }
  return totals;
}

export function modelMonthlyTierEconomics(input: {
  monthlyPriceUsd: number;
  providerCostUsd: number;
  marginalInfrastructureUsd: number;
}): {
  paymentFeesUsd: number;
  contributionUsd: number;
  contributionMargin: number;
  providerCostShare: number;
} {
  const paymentFeesUsd = input.monthlyPriceUsd * 0.036 + 0.3;
  const contributionUsd =
    input.monthlyPriceUsd -
    paymentFeesUsd -
    input.providerCostUsd -
    input.marginalInfrastructureUsd;
  return {
    paymentFeesUsd,
    contributionUsd,
    contributionMargin: contributionUsd / input.monthlyPriceUsd,
    providerCostShare: input.providerCostUsd / input.monthlyPriceUsd,
  };
}
