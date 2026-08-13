import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

import type { MembershipPlanCode } from "@/lib/membership/membership-catalog.server";
import type {
  MeteringActionQuote,
  MeteringMode,
} from "@/lib/membership/metering-catalog.server";

export type MeteringOutcome =
  | "succeeded"
  | "provider_error"
  | "timeout"
  | "aborted"
  | "moderated"
  | "empty"
  | "persistence_error";

export interface MeteringBeginResult {
  code:
    | "started"
    | "duplicate_pending"
    | "duplicate_completed"
    | "duplicate_released"
    | "entitlement_state_blocked"
    | "concurrency_limited"
    | "velocity_limited"
    | "reader_budget_exceeded";
  meteringRequestId: string | null;
  state: "pending" | "completed" | "released" | null;
  readerCostUsd: number;
  readerBudgetUsd: number;
}

export interface CreditMutationResult {
  code: string;
  reservationId: string | null;
  state: string | null;
  availableCredits: number;
  reservedCredits: number;
}

export interface BeginMeteringRequestInput {
  userId: string;
  requestId: string;
  requestFingerprint: string;
  planCode: MembershipPlanCode;
  mode: Exclude<MeteringMode, "off">;
  quote: MeteringActionQuote;
  readerMonthlyProviderBudgetUsd: number;
  effectiveAt: string;
}

export interface UsageAttemptInput {
  userId: string;
  meteringRequestId: string;
  reservationId: string | null;
  actionCode: string;
  planCode: MembershipPlanCode;
  provider: string;
  model: string;
  costRateVersion: string;
  startedAt: string;
}

export interface UsageAttemptCompletion {
  userId: string;
  usageEventId: string;
  outcome: MeteringOutcome;
  providerRequestId: string | null;
  inputUnits: number;
  outputUnits: number;
  latencyMs: number;
  estimatedCostUsd: number;
  errorClass: string | null;
  completedAt: string;
}

export interface MeteringStore {
  beginRequest(input: BeginMeteringRequestInput): Promise<MeteringBeginResult>;
  getCompletedResultReference(input: {
    userId: string;
    requestId: string;
    requestFingerprint: string;
  }): Promise<string | null>;
  reserveCredits(input: {
    userId: string;
    requestId: string;
    requestFingerprint: string;
    actionCode: string;
    quotedCredits: number;
    effectiveAt: string;
  }): Promise<CreditMutationResult>;
  attachCreditReservation(input: {
    userId: string;
    requestId: string;
    requestFingerprint: string;
    reservationId: string;
  }): Promise<void>;
  beginUsageAttempt(input: UsageAttemptInput): Promise<string>;
  completeUsageAttempt(input: UsageAttemptCompletion): Promise<void>;
  commitCredits(input: {
    userId: string;
    requestId: string;
    requestFingerprint: string;
    resultReference: string;
    effectiveAt: string;
  }): Promise<CreditMutationResult>;
  releaseCredits(input: {
    userId: string;
    requestId: string;
    requestFingerprint: string;
    reasonCode: string;
    effectiveAt: string;
  }): Promise<CreditMutationResult>;
  completeRequest(input: {
    userId: string;
    requestId: string;
    requestFingerprint: string;
    outcome: MeteringOutcome;
    actualCostUsd: number;
    resultReference: string | null;
    effectiveAt: string;
  }): Promise<void>;
  releaseRequest(input: {
    userId: string;
    requestId: string;
    requestFingerprint: string;
    outcome: "credit_denied" | "control_released";
    effectiveAt: string;
  }): Promise<void>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown, code: string): Record<string, unknown> {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(code);
  }
  return row as Record<string, unknown>;
}

function finiteNumber(value: unknown, code: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(code);
  return parsed;
}

function parseMeteringBegin(value: unknown): MeteringBeginResult {
  const row = asRecord(value, "METERING_CONTROL_INVALID_RESULT");
  const codes = [
    "started",
    "duplicate_pending",
    "duplicate_completed",
    "duplicate_released",
    "entitlement_state_blocked",
    "concurrency_limited",
    "velocity_limited",
    "reader_budget_exceeded",
  ] as const;
  const states = ["pending", "completed", "released"] as const;
  if (
    typeof row.result_code !== "string" ||
    !codes.includes(row.result_code as (typeof codes)[number]) ||
    !(
      row.result_metering_request_id === null ||
      (typeof row.result_metering_request_id === "string" &&
        UUID_PATTERN.test(row.result_metering_request_id))
    ) ||
    !(
      row.result_state === null ||
      (typeof row.result_state === "string" &&
        states.includes(row.result_state as (typeof states)[number]))
    )
  ) {
    throw new Error("METERING_CONTROL_INVALID_RESULT");
  }
  return {
    code: row.result_code as MeteringBeginResult["code"],
    meteringRequestId: row.result_metering_request_id as string | null,
    state: row.result_state as MeteringBeginResult["state"],
    readerCostUsd: finiteNumber(
      row.result_reader_cost_usd,
      "METERING_CONTROL_INVALID_RESULT",
    ),
    readerBudgetUsd: finiteNumber(
      row.result_reader_budget_usd,
      "METERING_CONTROL_INVALID_RESULT",
    ),
  };
}

function parseCreditMutation(value: unknown): CreditMutationResult {
  const row = asRecord(value, "METERING_CREDIT_INVALID_RESULT");
  if (
    typeof row.result_code !== "string" ||
    !(
      row.result_reservation_id === null ||
      (typeof row.result_reservation_id === "string" &&
        UUID_PATTERN.test(row.result_reservation_id))
    ) ||
    !(row.result_state === null || typeof row.result_state === "string")
  ) {
    throw new Error("METERING_CREDIT_INVALID_RESULT");
  }
  return {
    code: row.result_code,
    reservationId: row.result_reservation_id as string | null,
    state: row.result_state as string | null,
    availableCredits: finiteNumber(
      row.result_available,
      "METERING_CREDIT_INVALID_RESULT",
    ),
    reservedCredits: finiteNumber(
      row.result_reserved,
      "METERING_CREDIT_INVALID_RESULT",
    ),
  };
}

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const service = createServiceClient();
  const { data, error } = await service.rpc(name, args);
  if (error) throw new Error(`METERING_STORE_${name.toUpperCase()}_FAILED`);
  return data;
}

export const databaseMeteringStore: MeteringStore = {
  async beginRequest(input) {
    return parseMeteringBegin(
      await rpc("begin_ai_metering_request_v1", {
        p_user_id: input.userId,
        p_request_id: input.requestId,
        p_request_fingerprint: input.requestFingerprint,
        p_action_code: input.quote.actionCode,
        p_quote_version: input.quote.quoteVersion,
        p_quoted_credits: input.quote.creditCost,
        p_mode: input.mode,
        p_plan_code: input.planCode,
        p_estimated_cost_usd: input.quote.estimatedProviderCostUsd,
        p_cost_rate_version: input.quote.costRateVersion,
        p_max_concurrency: input.quote.maxConcurrency,
        p_velocity_limit: input.quote.velocityLimit,
        p_velocity_window_seconds: input.quote.velocityWindowSeconds,
        p_hold_seconds: input.quote.holdSeconds,
        p_reader_base_budget_usd: input.readerMonthlyProviderBudgetUsd,
        p_effective_at: input.effectiveAt,
      }),
    );
  },

  async getCompletedResultReference(input) {
    const service = createServiceClient();
    const { data, error } = await service
      .from("ai_metering_requests")
      .select("result_reference")
      .eq("user_id", input.userId)
      .eq("request_id", input.requestId)
      .eq("request_fingerprint", input.requestFingerprint)
      .eq("state", "completed")
      .eq("outcome", "succeeded")
      .maybeSingle();
    if (error) throw new Error("METERING_REPLAY_LOOKUP_FAILED");
    if (!data) return null;
    if (
      typeof data.result_reference !== "string" ||
      data.result_reference.length < 1 ||
      data.result_reference.length > 200 ||
      /[\r\n\0]/.test(data.result_reference)
    ) {
      throw new Error("METERING_REPLAY_INVALID_RESULT");
    }
    return data.result_reference;
  },

  async reserveCredits(input) {
    return parseCreditMutation(
      await rpc("reserve_credits_v1", {
        p_user_id: input.userId,
        p_request_id: input.requestId,
        p_request_fingerprint: input.requestFingerprint,
        p_action_code: input.actionCode,
        p_quoted_credits: input.quotedCredits,
        p_effective_at: input.effectiveAt,
      }),
    );
  },

  async attachCreditReservation(input) {
    const result = await rpc("attach_ai_metering_credit_reservation_v1", {
      p_user_id: input.userId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_credit_reservation_id: input.reservationId,
    });
    if (result !== "attached" && result !== "duplicate_attached") {
      throw new Error("METERING_CREDIT_ATTACHMENT_FAILED");
    }
  },

  async beginUsageAttempt(input) {
    const service = createServiceClient();
    const { data, error } = await service
      .from("ai_usage_events")
      .insert({
        user_id: input.userId,
        metering_request_id: input.meteringRequestId,
        reservation_id: input.reservationId,
        attempt_number: 1,
        action_code: input.actionCode,
        plan_code: input.planCode,
        provider: input.provider,
        model: input.model,
        is_fallback: false,
        outcome: "pending",
        input_units: 0,
        output_units: 0,
        estimated_cost_usd: 0,
        cost_rate_version: input.costRateVersion,
        started_at: input.startedAt,
      })
      .select("id")
      .single();
    if (error || !data || typeof data.id !== "string" || !UUID_PATTERN.test(data.id)) {
      throw new Error("METERING_USAGE_BEGIN_FAILED");
    }
    return data.id;
  },

  async completeUsageAttempt(input) {
    const service = createServiceClient();
    const { data, error } = await service
      .from("ai_usage_events")
      .update({
        provider_request_id: input.providerRequestId,
        outcome: input.outcome,
        input_units: input.inputUnits,
        output_units: input.outputUnits,
        latency_ms: input.latencyMs,
        estimated_cost_usd: input.estimatedCostUsd,
        error_class: input.errorClass,
        completed_at: input.completedAt,
      })
      .eq("id", input.usageEventId)
      .eq("user_id", input.userId)
      .eq("outcome", "pending")
      .select("id");
    if (error || !Array.isArray(data) || data.length !== 1) {
      throw new Error("METERING_USAGE_COMPLETE_FAILED");
    }
  },

  async commitCredits(input) {
    return parseCreditMutation(
      await rpc("commit_credit_reservation_v1", {
        p_user_id: input.userId,
        p_request_id: input.requestId,
        p_request_fingerprint: input.requestFingerprint,
        p_result_reference: input.resultReference,
        p_effective_at: input.effectiveAt,
      }),
    );
  },

  async releaseCredits(input) {
    return parseCreditMutation(
      await rpc("release_credit_reservation_v1", {
        p_user_id: input.userId,
        p_request_id: input.requestId,
        p_request_fingerprint: input.requestFingerprint,
        p_reason_code: input.reasonCode,
        p_effective_at: input.effectiveAt,
      }),
    );
  },

  async completeRequest(input) {
    const result = await rpc("complete_ai_metering_request_v1", {
      p_user_id: input.userId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_outcome: input.outcome,
      p_actual_cost_usd: input.actualCostUsd,
      p_result_reference: input.resultReference,
      p_effective_at: input.effectiveAt,
    });
    if (result !== "completed" && result !== "duplicate_completed") {
      throw new Error("METERING_CONTROL_COMPLETE_FAILED");
    }
  },

  async releaseRequest(input) {
    const result = await rpc("release_ai_metering_request_v1", {
      p_user_id: input.userId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_outcome: input.outcome,
      p_effective_at: input.effectiveAt,
    });
    if (result !== "released" && result !== "duplicate_released") {
      throw new Error("METERING_CONTROL_RELEASE_FAILED");
    }
  },
};
