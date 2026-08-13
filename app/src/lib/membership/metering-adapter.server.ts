import "server-only";

import { createHash } from "node:crypto";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { CatalogEnvironment } from "@/lib/membership/membership-catalog.server";
import {
  resolveMembershipEntitlement,
  type MembershipEntitlementResolution,
} from "@/lib/membership/membership-entitlement-resolver.server";
import {
  resolveMeteringActionPolicy,
  type MeteringActionQuote,
  type MeteringMode,
} from "@/lib/membership/metering-catalog.server";
import {
  databaseMeteringStore,
  type MeteringOutcome,
  type MeteringStore,
} from "@/lib/membership/metering-store.server";

export interface MeteringAuthenticatedUser {
  id: string;
  emailConfirmedAt: string | null;
}

export interface MeteredProviderUsage {
  providerRequestId?: string | null;
  inputUnits: number;
  outputUnits: number;
  estimatedCostUsd: number;
}

export interface MeteredProviderResult<T> {
  value: T;
  usage: MeteredProviderUsage;
}

export interface MeteredPersistenceResult<T> {
  value: T;
  resultReference: string;
}

export interface MeteredActionContext {
  userId: string;
  requestId: string;
}

export interface MeteredActionRequest<TInput, TProvider, TResult> {
  actionCode: string;
  requestId: string;
  input: TInput;
  provider: {
    name: string;
    model: string;
    execute: (
      context: MeteredActionContext
    ) => Promise<MeteredProviderResult<TProvider>>;
  };
  persist: (
    providerValue: TProvider,
    context: MeteredActionContext
  ) => Promise<MeteredPersistenceResult<TResult>>;
  replay?: (
    resultReference: string,
    context: MeteredActionContext
  ) => Promise<TResult>;
  isUsableProviderResult?: (value: TProvider) => boolean;
}

export interface MeteredActionSuccess<TResult> {
  value: TResult;
  actionCode: MeteringActionQuote["actionCode"];
  mode: Exclude<MeteringMode, "off">;
  chargedCredits: number;
  quoteVersion: string;
  replayed: boolean;
}

export class MeteringError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly retryAfterSeconds: number | null = null
  ) {
    super(code);
    this.name = "MeteringError";
  }
}

/** A provider wrapper may throw this to select a privacy-safe outcome. */
export class MeteredProviderFailure extends Error {
  constructor(
    public readonly outcome: Exclude<
      MeteringOutcome,
      "succeeded" | "persistence_error"
    >,
    public readonly usage?: Partial<MeteredProviderUsage>
  ) {
    super(outcome);
    this.name = "MeteredProviderFailure";
  }
}

export interface MeteringDependencies {
  environment?: CatalogEnvironment;
  now?: () => Date;
  authenticate?: () => Promise<MeteringAuthenticatedUser | null>;
  resolveEntitlement?: (
    userId: string
  ) => Promise<MembershipEntitlementResolution>;
  store?: MeteringStore;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_PATTERN = /^[a-z][a-z0-9_.-]{0,63}$/;
const ERROR_CLASS_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

function authenticatedUser(user: User): MeteringAuthenticatedUser {
  return {
    id: user.id,
    emailConfirmedAt: user.email_confirmed_at ?? null,
  };
}

async function authenticateFromSession(): Promise<MeteringAuthenticatedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : authenticatedUser(user);
}

function canonicalJson(value: unknown, seen = new Set<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new MeteringError("METERING_INVALID_INPUT", 400);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new MeteringError("METERING_INVALID_INPUT", 400);
    seen.add(value);
    const result = `[${value.map((item) => canonicalJson(item, seen)).join(",")}]`;
    seen.delete(value);
    return result;
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (seen.has(object))
      throw new MeteringError("METERING_INVALID_INPUT", 400);
    seen.add(object);
    const entries = Object.keys(object)
      .sort()
      .map((key) => {
        if (object[key] === undefined) {
          throw new MeteringError("METERING_INVALID_INPUT", 400);
        }
        return `${JSON.stringify(key)}:${canonicalJson(object[key], seen)}`;
      });
    seen.delete(object);
    return `{${entries.join(",")}}`;
  }
  throw new MeteringError("METERING_INVALID_INPUT", 400);
}

function isVerifiedTimestamp(value: string | null): boolean {
  return value !== null && Number.isFinite(Date.parse(value));
}

function validateProviderDescriptor(provider: string, model: string): void {
  if (
    !PROVIDER_PATTERN.test(provider) ||
    model.length < 1 ||
    model.length > 128 ||
    /[\r\n\0]/.test(model)
  ) {
    throw new MeteringError("METERING_INVALID_PROVIDER_CONFIGURATION", 503);
  }
}

function validateUsage(
  usage: Partial<MeteredProviderUsage> | undefined,
  fallbackCost: number
): MeteredProviderUsage {
  const inputUnits = usage?.inputUnits ?? 0;
  const outputUnits = usage?.outputUnits ?? 0;
  const estimatedCostUsd = usage?.estimatedCostUsd ?? fallbackCost;
  const providerRequestId = usage?.providerRequestId ?? null;
  if (
    !Number.isSafeInteger(inputUnits) ||
    inputUnits < 0 ||
    !Number.isSafeInteger(outputUnits) ||
    outputUnits < 0 ||
    !Number.isFinite(estimatedCostUsd) ||
    estimatedCostUsd < 0 ||
    estimatedCostUsd > 100_000 ||
    !(
      providerRequestId === null ||
      (typeof providerRequestId === "string" &&
        providerRequestId.length >= 1 &&
        providerRequestId.length <= 200 &&
        !/[\r\n\0]/.test(providerRequestId))
    )
  ) {
    throw new MeteringError("METERING_INVALID_PROVIDER_USAGE", 503);
  }
  return { providerRequestId, inputUnits, outputUnits, estimatedCostUsd };
}

function defaultUsable(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== "string" || value.trim().length > 0;
}

function outcomeForError(
  error: unknown
): Exclude<MeteringOutcome, "succeeded"> {
  if (error instanceof MeteredProviderFailure) return error.outcome;
  if (
    error instanceof MeteringError &&
    error.code === "METERING_EMPTY_RESULT"
  ) {
    return "empty";
  }
  if (
    error instanceof MeteringError &&
    error.code === "METERING_PERSISTENCE_FAILED"
  ) {
    return "persistence_error";
  }
  if (error instanceof Error && error.name === "AbortError") return "aborted";
  if (error instanceof Error && error.name === "TimeoutError") return "timeout";
  return "provider_error";
}

function releaseReason(outcome: Exclude<MeteringOutcome, "succeeded">): string {
  return {
    provider_error: "PROVIDER_ERROR",
    timeout: "TIMEOUT",
    aborted: "ABORTED",
    moderated: "MODERATION_BLOCKED",
    empty: "EMPTY_RESULT",
    persistence_error: "PERSISTENCE_ERROR",
  }[outcome];
}

function safeErrorClass(
  outcome: Exclude<MeteringOutcome, "succeeded">
): string {
  const value = outcome.toUpperCase();
  return ERROR_CLASS_PATTERN.test(value) ? value : "PROVIDER_ERROR";
}

function controlError(code: string): MeteringError {
  switch (code) {
    case "duplicate_pending":
      return new MeteringError("METERING_REQUEST_IN_PROGRESS", 409, 3);
    case "duplicate_released":
      return new MeteringError("METERING_REQUEST_ALREADY_RELEASED", 409);
    case "concurrency_limited":
      return new MeteringError("METERING_CONCURRENCY_LIMITED", 429, 30);
    case "velocity_limited":
      return new MeteringError("METERING_VELOCITY_LIMITED", 429, 600);
    case "reader_budget_exceeded":
      return new MeteringError("READER_AI_CAPACITY_PAUSED", 503, 3600);
    case "entitlement_state_blocked":
      return new MeteringError("METERING_ENTITLEMENT_UNAVAILABLE", 503);
    default:
      return new MeteringError("METERING_REQUEST_REPLAYED", 409);
  }
}

function creditError(code: string): MeteringError {
  switch (code) {
    case "insufficient_credits":
      return new MeteringError("METERING_INSUFFICIENT_CREDITS", 402);
    case "billing_state_blocked":
    case "grant_unavailable":
      return new MeteringError("METERING_ENTITLEMENT_UNAVAILABLE", 503);
    default:
      return new MeteringError("METERING_CREDIT_RESERVATION_FAILED", 503);
  }
}

async function compensateBeforeProvider(input: {
  store: MeteringStore;
  mode: Exclude<MeteringMode, "off">;
  creditReserved: boolean;
  userId: string;
  requestId: string;
  requestFingerprint: string;
  effectiveAt: string;
}): Promise<void> {
  if (input.mode === "enforce" && input.creditReserved) {
    await input.store.releaseCredits({
      userId: input.userId,
      requestId: input.requestId,
      requestFingerprint: input.requestFingerprint,
      reasonCode: "MANUAL_RECOVERY",
      effectiveAt: input.effectiveAt,
    });
  }
  await input.store.releaseRequest({
    userId: input.userId,
    requestId: input.requestId,
    requestFingerprint: input.requestFingerprint,
    outcome: input.creditReserved ? "control_released" : "credit_denied",
    effectiveAt: input.effectiveAt,
  });
}

/**
 * Executes the one permitted metered lifecycle. Existing routes are not wired
 * by L4-01; later packets supply their provider and durable persistence calls.
 */
export async function executeMeteredAction<TInput, TProvider, TResult>(
  request: MeteredActionRequest<TInput, TProvider, TResult>,
  dependencies: MeteringDependencies = {}
): Promise<MeteredActionSuccess<TResult>> {
  const now = dependencies.now ?? (() => new Date());
  const store = dependencies.store ?? databaseMeteringStore;
  const authenticate = dependencies.authenticate ?? authenticateFromSession;
  const resolveEntitlement =
    dependencies.resolveEntitlement ??
    ((userId: string) => resolveMembershipEntitlement({ userId }));

  if (!UUID_PATTERN.test(request.requestId)) {
    throw new MeteringError("METERING_INVALID_REQUEST_ID", 400);
  }
  const user = await authenticate();
  if (!user || !UUID_PATTERN.test(user.id)) {
    throw new MeteringError("METERING_UNAUTHORIZED", 401);
  }
  if (!isVerifiedTimestamp(user.emailConfirmedAt)) {
    throw new MeteringError("METERING_VERIFIED_EMAIL_REQUIRED", 403);
  }

  const entitlement = await resolveEntitlement(user.id);
  if (entitlement.failClosed) {
    throw new MeteringError("METERING_ENTITLEMENT_UNAVAILABLE", 503);
  }
  if (
    !entitlement.paidEntitlementsActive ||
    entitlement.planCode === "reader"
  ) {
    throw new MeteringError("METERING_PAID_MEMBERSHIP_REQUIRED", 402);
  }
  const policy = resolveMeteringActionPolicy(
    request.actionCode,
    dependencies.environment
  );
  if (!policy) throw new MeteringError("METERING_UNKNOWN_ACTION", 400);
  if (!policy.configurationValid || policy.killed) {
    throw new MeteringError("METERING_ACTION_KILLED", 503);
  }
  if (policy.mode === "off") {
    throw new MeteringError("METERING_ACTION_OFF", 503);
  }
  if (
    policy.quote.creditCost === null ||
    policy.quote.estimatedProviderCostUsd === null
  ) {
    throw new MeteringError("METERING_ACTION_NOT_OFFERED", 503);
  }

  validateProviderDescriptor(request.provider.name, request.provider.model);
  const normalizedInput = canonicalJson(request.input);
  const inputBytes = Buffer.byteLength(normalizedInput, "utf8");
  if (inputBytes > policy.quote.maxRequestBytes) {
    throw new MeteringError("METERING_REQUEST_TOO_LARGE", 413);
  }
  const requestFingerprint = createHash("sha256")
    .update(
      canonicalJson({
        actionCode: policy.quote.actionCode,
        input: JSON.parse(normalizedInput) as unknown,
        quoteVersion: policy.quote.quoteVersion,
      })
    )
    .digest("hex");
  const started = now();
  if (!Number.isFinite(started.getTime())) {
    throw new MeteringError("METERING_INVALID_TIME", 503);
  }
  const startedAt = started.toISOString();

  const control = await store.beginRequest({
    userId: user.id,
    requestId: request.requestId,
    requestFingerprint,
    planCode: entitlement.planCode,
    mode: policy.mode,
    quote: policy.quote,
    readerMonthlyProviderBudgetUsd: policy.readerMonthlyProviderBudgetUsd,
    effectiveAt: startedAt,
  });
  if (control.code === "duplicate_completed") {
    if (!request.replay) {
      throw new MeteringError("METERING_REQUEST_REPLAY_UNAVAILABLE", 409);
    }
    let resultReference: string | null;
    try {
      resultReference = await store.getCompletedResultReference({
        userId: user.id,
        requestId: request.requestId,
        requestFingerprint,
      });
    } catch {
      throw new MeteringError("METERING_REQUEST_REPLAY_FAILED", 503);
    }
    if (!resultReference) {
      throw new MeteringError("METERING_REQUEST_COMPLETED_WITHOUT_RESULT", 409);
    }
    try {
      return {
        value: await request.replay(resultReference, {
          userId: user.id,
          requestId: request.requestId,
        }),
        actionCode: policy.quote.actionCode,
        mode: policy.mode,
        chargedCredits: 0,
        quoteVersion: policy.quote.quoteVersion,
        replayed: true,
      };
    } catch {
      throw new MeteringError("METERING_REQUEST_REPLAY_FAILED", 503);
    }
  }
  if (control.code !== "started" || !control.meteringRequestId) {
    throw controlError(control.code);
  }

  let reservationId: string | null = null;
  if (policy.mode === "enforce") {
    const reservation = await store.reserveCredits({
      userId: user.id,
      requestId: request.requestId,
      requestFingerprint,
      actionCode: policy.quote.actionCode,
      quotedCredits: policy.quote.creditCost,
      effectiveAt: startedAt,
    });
    if (reservation.code !== "reserved" || !reservation.reservationId) {
      await store.releaseRequest({
        userId: user.id,
        requestId: request.requestId,
        requestFingerprint,
        outcome: "credit_denied",
        effectiveAt: startedAt,
      });
      throw creditError(reservation.code);
    }
    reservationId = reservation.reservationId;
    try {
      await store.attachCreditReservation({
        userId: user.id,
        requestId: request.requestId,
        requestFingerprint,
        reservationId,
      });
    } catch {
      await compensateBeforeProvider({
        store,
        mode: policy.mode,
        creditReserved: true,
        userId: user.id,
        requestId: request.requestId,
        requestFingerprint,
        effectiveAt: startedAt,
      });
      throw new MeteringError("METERING_CREDIT_ATTACHMENT_FAILED", 503);
    }
  }

  let usageEventId: string;
  try {
    usageEventId = await store.beginUsageAttempt({
      userId: user.id,
      meteringRequestId: control.meteringRequestId,
      reservationId,
      actionCode: policy.quote.actionCode,
      planCode: entitlement.planCode,
      provider: request.provider.name,
      model: request.provider.model,
      costRateVersion: policy.quote.costRateVersion,
      startedAt,
    });
  } catch {
    await compensateBeforeProvider({
      store,
      mode: policy.mode,
      creditReserved: reservationId !== null,
      userId: user.id,
      requestId: request.requestId,
      requestFingerprint,
      effectiveAt: startedAt,
    });
    throw new MeteringError("METERING_TELEMETRY_UNAVAILABLE", 503);
  }

  let providerUsage: MeteredProviderUsage | undefined;
  let providerStarted = false;
  try {
    providerStarted = true;
    const providerResult = await request.provider.execute({
      userId: user.id,
      requestId: request.requestId,
    });
    providerUsage = validateUsage(
      providerResult.usage,
      policy.quote.estimatedProviderCostUsd
    );
    const usable = request.isUsableProviderResult ?? defaultUsable;
    if (!usable(providerResult.value)) {
      throw new MeteringError("METERING_EMPTY_RESULT", 502);
    }

    let persisted: MeteredPersistenceResult<TResult>;
    try {
      persisted = await request.persist(providerResult.value, {
        userId: user.id,
        requestId: request.requestId,
      });
    } catch {
      throw new MeteringError("METERING_PERSISTENCE_FAILED", 503);
    }
    if (
      !persisted.resultReference ||
      persisted.resultReference.length > 200 ||
      /[\r\n\0]/.test(persisted.resultReference)
    ) {
      throw new MeteringError("METERING_PERSISTENCE_FAILED", 503);
    }

    const completed = now();
    if (!Number.isFinite(completed.getTime())) {
      throw new MeteringError("METERING_INVALID_TIME", 503);
    }
    const completedAt = completed.toISOString();
    const latencyMs = Math.max(0, completed.getTime() - started.getTime());

    try {
      if (policy.mode === "enforce") {
        const committed = await store.commitCredits({
          userId: user.id,
          requestId: request.requestId,
          requestFingerprint,
          resultReference: persisted.resultReference,
          effectiveAt: completedAt,
        });
        if (
          committed.code !== "committed" &&
          committed.code !== "duplicate_committed"
        ) {
          throw new Error("credit commit rejected");
        }
      }
      await store.completeRequest({
        userId: user.id,
        requestId: request.requestId,
        requestFingerprint,
        outcome: "succeeded",
        actualCostUsd: providerUsage.estimatedCostUsd,
        resultReference: persisted.resultReference,
        effectiveAt: completedAt,
      });
      await store.completeUsageAttempt({
        userId: user.id,
        usageEventId,
        outcome: "succeeded",
        providerRequestId: providerUsage.providerRequestId ?? null,
        inputUnits: providerUsage.inputUnits,
        outputUnits: providerUsage.outputUnits,
        latencyMs,
        estimatedCostUsd: providerUsage.estimatedCostUsd,
        errorClass: null,
        completedAt,
      });
    } catch {
      throw new MeteringError("METERING_SETTLEMENT_FAILED", 503);
    }

    return {
      value: persisted.value,
      actionCode: policy.quote.actionCode,
      mode: policy.mode,
      chargedCredits: policy.mode === "enforce" ? policy.quote.creditCost : 0,
      quoteVersion: policy.quote.quoteVersion,
      replayed: false,
    };
  } catch (error) {
    if (
      error instanceof MeteringError &&
      error.code === "METERING_SETTLEMENT_FAILED"
    ) {
      throw error;
    }
    const outcome = outcomeForError(error);
    const failureUsage = validateUsage(
      error instanceof MeteredProviderFailure ? error.usage : providerUsage,
      providerStarted ? policy.quote.estimatedProviderCostUsd : 0
    );
    const completed = now();
    const completedAt = Number.isFinite(completed.getTime())
      ? completed.toISOString()
      : startedAt;
    const latencyMs = Math.max(0, Date.parse(completedAt) - started.getTime());
    const settlementErrors: unknown[] = [];

    if (policy.mode === "enforce" && reservationId) {
      try {
        await store.releaseCredits({
          userId: user.id,
          requestId: request.requestId,
          requestFingerprint,
          reasonCode: releaseReason(outcome),
          effectiveAt: completedAt,
        });
      } catch (settlementError) {
        settlementErrors.push(settlementError);
      }
    }
    try {
      await store.completeRequest({
        userId: user.id,
        requestId: request.requestId,
        requestFingerprint,
        outcome,
        actualCostUsd: failureUsage.estimatedCostUsd,
        resultReference: null,
        effectiveAt: completedAt,
      });
    } catch (settlementError) {
      settlementErrors.push(settlementError);
    }
    try {
      await store.completeUsageAttempt({
        userId: user.id,
        usageEventId,
        outcome,
        providerRequestId: failureUsage.providerRequestId ?? null,
        inputUnits: failureUsage.inputUnits,
        outputUnits: failureUsage.outputUnits,
        latencyMs,
        estimatedCostUsd: failureUsage.estimatedCostUsd,
        errorClass: safeErrorClass(outcome),
        completedAt,
      });
    } catch (settlementError) {
      settlementErrors.push(settlementError);
    }
    if (settlementErrors.length > 0) {
      throw new MeteringError("METERING_SETTLEMENT_FAILED", 503);
    }

    if (error instanceof MeteringError) throw error;
    throw new MeteringError(
      outcome === "timeout"
        ? "METERING_PROVIDER_TIMEOUT"
        : outcome === "aborted"
          ? "METERING_PROVIDER_ABORTED"
          : outcome === "moderated"
            ? "METERING_MODERATION_BLOCKED"
            : outcome === "empty"
              ? "METERING_EMPTY_RESULT"
              : "METERING_PROVIDER_FAILED",
      outcome === "moderated" ? 422 : 502
    );
  }
}
