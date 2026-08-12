const PLAN_CODES = ["reader", "student", "scholar", "adept"] as const;
const WALLET_STATUSES = ["current", "unavailable"] as const;
const HISTORY_KINDS = [
  "monthly_grant",
  "credit_reserved",
  "credit_used",
  "credit_returned",
  "monthly_grant_expired",
  "balance_adjusted",
] as const;
const ACTION_CODES = [
  "working.generate",
  "seven_lenses.expand",
  "seven_lenses.standard",
  "seven_lenses.long",
  "deep_search.fresh",
  "image.generate",
] as const;
const WALLET_KEYS = new Set([
  "status",
  "availableCredits",
  "reservedCredits",
  "totalCredits",
  "grant",
  "pending",
  "history",
  "asOf",
]);
const GRANT_KEYS = new Set([
  "planCode",
  "grantedCredits",
  "validFrom",
  "expiresAt",
  "resetsAt",
]);
const PENDING_KEYS = new Set([
  "actionCode",
  "credits",
  "createdAt",
  "expiresAt",
]);
const HISTORY_KEYS = new Set([
  "kind",
  "credits",
  "availableAfter",
  "reservedAfter",
  "actionCode",
  "occurredAt",
]);
const TOOL_COSTS_KEYS = new Set(["version", "actions"]);
const TOOL_ACTION_KEYS = new Set([
  "actionCode",
  "customerLabel",
  "creditCost",
  "enabled",
]);

export type WalletPlanCode = (typeof PLAN_CODES)[number];
export type WalletHistoryKind = (typeof HISTORY_KINDS)[number];
export type ToolActionCode = (typeof ACTION_CODES)[number];

export interface SafeWalletPendingItem {
  actionCode: string;
  credits: number;
  createdAt: string;
  expiresAt: string;
}

export interface SafeWalletHistoryItem {
  kind: WalletHistoryKind;
  credits: number;
  availableAfter: number;
  reservedAfter: number;
  actionCode: string | null;
  occurredAt: string;
}

export interface SafeCreditWallet {
  status: (typeof WALLET_STATUSES)[number];
  availableCredits: number;
  reservedCredits: number;
  totalCredits: number;
  grant: null | {
    planCode: WalletPlanCode;
    grantedCredits: number;
    validFrom: string;
    expiresAt: string;
    resetsAt: string;
  };
  pending: SafeWalletPendingItem[];
  history: SafeWalletHistoryItem[];
  asOf: string;
}

export interface SafeToolCost {
  actionCode: ToolActionCode;
  customerLabel: string;
  creditCost: number | null;
  enabled: boolean;
}

export interface SafeToolCosts {
  version: number;
  actions: SafeToolCost[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: Set<string>) {
  const actual = Object.keys(value);
  return actual.length === keys.size && actual.every((key) => keys.has(key));
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isActionCode(value: unknown): value is ToolActionCode {
  return (
    typeof value === "string" && ACTION_CODES.includes(value as ToolActionCode)
  );
}

function parsePending(value: unknown): SafeWalletPendingItem | null {
  if (!isRecord(value) || !hasExactKeys(value, PENDING_KEYS)) return null;
  if (
    typeof value.actionCode !== "string" ||
    !/^[a-z][a-z0-9_.]{0,63}$/.test(value.actionCode) ||
    !isNonnegativeInteger(value.credits) ||
    value.credits === 0 ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.expiresAt) ||
    Date.parse(value.expiresAt) <= Date.parse(value.createdAt)
  ) {
    return null;
  }
  return value as unknown as SafeWalletPendingItem;
}

function parseHistory(value: unknown): SafeWalletHistoryItem | null {
  if (!isRecord(value) || !hasExactKeys(value, HISTORY_KEYS)) return null;
  if (
    !HISTORY_KINDS.includes(value.kind as WalletHistoryKind) ||
    typeof value.credits !== "number" ||
    !Number.isInteger(value.credits) ||
    !isNonnegativeInteger(value.availableAfter) ||
    !isNonnegativeInteger(value.reservedAfter) ||
    !isTimestamp(value.occurredAt) ||
    !(
      value.actionCode === null ||
      (typeof value.actionCode === "string" &&
        /^[a-z][a-z0-9_.]{0,63}$/.test(value.actionCode))
    )
  ) {
    return null;
  }
  return value as unknown as SafeWalletHistoryItem;
}

export function parseSafeCreditWallet(value: unknown): SafeCreditWallet | null {
  if (!isRecord(value) || !hasExactKeys(value, WALLET_KEYS)) return null;
  if (
    !WALLET_STATUSES.includes(value.status as SafeCreditWallet["status"]) ||
    !isNonnegativeInteger(value.availableCredits) ||
    !isNonnegativeInteger(value.reservedCredits) ||
    !isNonnegativeInteger(value.totalCredits) ||
    value.totalCredits !== value.availableCredits + value.reservedCredits ||
    !Array.isArray(value.pending) ||
    !Array.isArray(value.history) ||
    value.history.length > 20 ||
    !isTimestamp(value.asOf)
  ) {
    return null;
  }

  let grant: SafeCreditWallet["grant"] = null;
  if (value.grant !== null) {
    if (!isRecord(value.grant) || !hasExactKeys(value.grant, GRANT_KEYS)) {
      return null;
    }
    if (
      !PLAN_CODES.includes(value.grant.planCode as WalletPlanCode) ||
      !isNonnegativeInteger(value.grant.grantedCredits) ||
      value.grant.grantedCredits === 0 ||
      !isTimestamp(value.grant.validFrom) ||
      !isTimestamp(value.grant.expiresAt) ||
      !isTimestamp(value.grant.resetsAt) ||
      value.grant.resetsAt !== value.grant.expiresAt
    ) {
      return null;
    }
    grant = value.grant as unknown as NonNullable<SafeCreditWallet["grant"]>;
  }

  const pending = value.pending.map(parsePending);
  const history = value.history.map(parseHistory);
  if (pending.some((item) => item === null) || history.some((item) => item === null)) {
    return null;
  }
  const safePending = pending as SafeWalletPendingItem[];
  if (
    safePending.reduce((total, item) => total + item.credits, 0) !==
    value.reservedCredits
  ) {
    return null;
  }

  return {
    status: value.status as SafeCreditWallet["status"],
    availableCredits: value.availableCredits,
    reservedCredits: value.reservedCredits,
    totalCredits: value.totalCredits,
    grant,
    pending: safePending,
    history: history as SafeWalletHistoryItem[],
    asOf: value.asOf,
  };
}

export function parseSafeWalletResponse(value: unknown): SafeCreditWallet | null {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["wallet"]))) return null;
  return parseSafeCreditWallet(value.wallet);
}

export function parseSafeToolCosts(value: unknown): SafeToolCosts | null {
  if (!isRecord(value) || !hasExactKeys(value, TOOL_COSTS_KEYS)) return null;
  if (
    !isNonnegativeInteger(value.version) ||
    value.version === 0 ||
    !Array.isArray(value.actions) ||
    value.actions.length !== ACTION_CODES.length
  ) {
    return null;
  }

  const seen = new Set<ToolActionCode>();
  const actions: SafeToolCost[] = [];
  for (const candidate of value.actions) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, TOOL_ACTION_KEYS)) {
      return null;
    }
    if (
      !isActionCode(candidate.actionCode) ||
      seen.has(candidate.actionCode) ||
      typeof candidate.customerLabel !== "string" ||
      !candidate.customerLabel.trim() ||
      !(
        candidate.creditCost === null ||
        (isNonnegativeInteger(candidate.creditCost) && candidate.creditCost > 0)
      ) ||
      typeof candidate.enabled !== "boolean"
    ) {
      return null;
    }
    seen.add(candidate.actionCode);
    actions.push(candidate as unknown as SafeToolCost);
  }

  return { version: value.version, actions };
}

export function parseSafeToolCostsResponse(value: unknown): SafeToolCosts | null {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["toolCosts"]))) {
    return null;
  }
  return parseSafeToolCosts(value.toolCosts);
}

export function formatUtcDateTime(value: string): string {
  return `${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

export function actionLabel(actionCode: string | null): string {
  return (
    {
      "working.generate": "The Working",
      "seven_lenses.expand": "Lens expansion",
      "seven_lenses.standard": "Standard Seven Lenses",
      "seven_lenses.long": "Long Seven Lenses",
    }[actionCode ?? ""] ?? "Account credits"
  );
}
