import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTION_CODE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/;
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

type WalletStatus = (typeof WALLET_STATUSES)[number];
type WalletPlanCode = (typeof PLAN_CODES)[number];
type WalletHistoryKind = (typeof HISTORY_KINDS)[number];

export interface CreditWalletPendingItem {
  actionCode: string;
  credits: number;
  createdAt: string;
  expiresAt: string;
}

export interface CreditWalletHistoryItem {
  kind: WalletHistoryKind;
  credits: number;
  availableAfter: number;
  reservedAfter: number;
  actionCode: string | null;
  occurredAt: string;
}

export interface CreditWallet {
  status: WalletStatus;
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
  pending: CreditWalletPendingItem[];
  history: CreditWalletHistoryItem[];
  asOf: string;
}

interface CreditWalletDependencies {
  loadWallet?: (
    userId: string,
    effectiveAt: string,
    historyLimit: number,
  ) => Promise<unknown>;
  now?: () => Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  choices: T,
): value is T[number] {
  return typeof value === "string" && choices.includes(value);
}

function parsePendingItem(value: unknown): CreditWalletPendingItem {
  if (!isRecord(value)) throw new Error("CREDIT_WALLET_INVALID_PROJECTION");
  if (
    typeof value.actionCode !== "string" ||
    !ACTION_CODE_PATTERN.test(value.actionCode) ||
    !isNonnegativeInteger(value.credits) ||
    value.credits === 0 ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.expiresAt) ||
    Date.parse(value.expiresAt) <= Date.parse(value.createdAt)
  ) {
    throw new Error("CREDIT_WALLET_INVALID_PROJECTION");
  }
  return {
    actionCode: value.actionCode,
    credits: value.credits,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
  };
}

function parseHistoryItem(value: unknown): CreditWalletHistoryItem {
  if (!isRecord(value)) throw new Error("CREDIT_WALLET_INVALID_PROJECTION");
  if (
    !isOneOf(value.kind, HISTORY_KINDS) ||
    !isInteger(value.credits) ||
    !isNonnegativeInteger(value.availableAfter) ||
    !isNonnegativeInteger(value.reservedAfter) ||
    !isTimestamp(value.occurredAt) ||
    !(
      value.actionCode === null ||
      (typeof value.actionCode === "string" &&
        ACTION_CODE_PATTERN.test(value.actionCode))
    )
  ) {
    throw new Error("CREDIT_WALLET_INVALID_PROJECTION");
  }
  return {
    kind: value.kind,
    credits: value.credits,
    availableAfter: value.availableAfter,
    reservedAfter: value.reservedAfter,
    actionCode: value.actionCode,
    occurredAt: value.occurredAt,
  };
}

function parseCreditWallet(value: unknown): CreditWallet {
  if (!isRecord(value)) throw new Error("CREDIT_WALLET_INVALID_PROJECTION");
  if (
    !isOneOf(value.status, WALLET_STATUSES) ||
    !isNonnegativeInteger(value.availableCredits) ||
    !isNonnegativeInteger(value.reservedCredits) ||
    !isNonnegativeInteger(value.totalCredits) ||
    value.totalCredits !== value.availableCredits + value.reservedCredits ||
    !Array.isArray(value.pending) ||
    !Array.isArray(value.history) ||
    value.history.length > 20 ||
    !isTimestamp(value.asOf)
  ) {
    throw new Error("CREDIT_WALLET_INVALID_PROJECTION");
  }

  let grant: CreditWallet["grant"] = null;
  if (value.grant !== null) {
    if (
      !isRecord(value.grant) ||
      !isOneOf(value.grant.planCode, PLAN_CODES) ||
      !isNonnegativeInteger(value.grant.grantedCredits) ||
      value.grant.grantedCredits === 0 ||
      !isTimestamp(value.grant.validFrom) ||
      !isTimestamp(value.grant.expiresAt) ||
      !isTimestamp(value.grant.resetsAt) ||
      value.grant.resetsAt !== value.grant.expiresAt ||
      Date.parse(value.grant.expiresAt) <= Date.parse(value.grant.validFrom)
    ) {
      throw new Error("CREDIT_WALLET_INVALID_PROJECTION");
    }
    grant = {
      planCode: value.grant.planCode,
      grantedCredits: value.grant.grantedCredits,
      validFrom: value.grant.validFrom,
      expiresAt: value.grant.expiresAt,
      resetsAt: value.grant.resetsAt,
    };
  }

  const pending = value.pending.map(parsePendingItem);
  const history = value.history.map(parseHistoryItem);
  const pendingCredits = pending.reduce((sum, item) => sum + item.credits, 0);
  if (pendingCredits !== value.reservedCredits) {
    throw new Error("CREDIT_WALLET_INVALID_PROJECTION");
  }

  return {
    status: value.status,
    availableCredits: value.availableCredits,
    reservedCredits: value.reservedCredits,
    totalCredits: value.totalCredits,
    grant,
    pending,
    history,
    asOf: value.asOf,
  };
}

async function loadWalletFromDatabase(
  userId: string,
  effectiveAt: string,
  historyLimit: number,
): Promise<unknown> {
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase.rpc("get_credit_wallet_v1", {
    p_user_id: userId,
    p_effective_at: effectiveAt,
    p_history_limit: historyLimit,
  });
  if (error) throw new Error("CREDIT_WALLET_LOOKUP_FAILED");
  return data;
}

/**
 * Loads one authenticated user's wallet through the service-only projection
 * and reconstructs a strict allowlisted response so unexpected database fields
 * can never leak through the API.
 */
export async function getCreditWalletForUser(
  userId: string,
  dependencies: CreditWalletDependencies = {},
): Promise<CreditWallet> {
  if (!UUID_PATTERN.test(userId)) {
    throw new Error("CREDIT_WALLET_INVALID_USER");
  }
  const now = (dependencies.now ?? (() => new Date()))();
  if (!Number.isFinite(now.getTime())) {
    throw new Error("CREDIT_WALLET_INVALID_TIME");
  }
  const effectiveAt = now.toISOString();
  const historyLimit = 20;
  const rawWallet = await (dependencies.loadWallet ?? loadWalletFromDatabase)(
    userId,
    effectiveAt,
    historyLimit,
  );
  return parseCreditWallet(rawWallet);
}
