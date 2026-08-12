export type ToolRunState =
  | "idle"
  | "reserved"
  | "committed"
  | "returned"
  | "retry"
  | "reconcile"
  | "capacity_paused"
  | "disabled";

const RETURNED_CODES = new Set([
  "METERING_PROVIDER_TIMEOUT",
  "METERING_PROVIDER_ABORTED",
  "METERING_MODERATION_BLOCKED",
  "METERING_EMPTY_RESULT",
  "METERING_PERSISTENCE_FAILED",
  "METERING_PROVIDER_FAILED",
]);
const RETRY_CODES = new Set([
  "METERING_REQUEST_IN_PROGRESS",
  "METERING_REQUEST_REPLAY_FAILED",
]);
const DISABLED_CODES = new Set([
  "ACTION_TEMPORARILY_UNAVAILABLE",
  "METERING_ACTION_OFF",
  "METERING_ACTION_KILLED",
  "METERING_ACTION_NOT_OFFERED",
]);

export function toolRunStateForCode(code: string | undefined): ToolRunState {
  if (code === "READER_AI_CAPACITY_PAUSED") return "capacity_paused";
  if (code === "METERING_SETTLEMENT_FAILED") return "reconcile";
  if (code && RETURNED_CODES.has(code)) return "returned";
  if (code && RETRY_CODES.has(code)) return "retry";
  if (code && DISABLED_CODES.has(code)) return "disabled";
  return "idle";
}

export function nextUtcMonthBoundary(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  ).toISOString();
}
