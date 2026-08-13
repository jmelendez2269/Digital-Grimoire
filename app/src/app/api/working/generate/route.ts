import { NextResponse } from "next/server";

import { guardCommercialAction } from "@/lib/commercial-availability";
import { MeteringError } from "@/lib/membership/metering-adapter.server";
import { nextUtcMonthBoundary } from "@/lib/membership/metering-customer-presentation";
import { executeMeteredWorking } from "@/lib/working/metered-working.server";

export const maxDuration = 60;

const CUSTOMER_MESSAGES: Record<string, string> = {
  METERING_UNAUTHORIZED: "Sign in to begin a working.",
  METERING_VERIFIED_EMAIL_REQUIRED:
    "Verify your email before using The Working.",
  METERING_PAID_MEMBERSHIP_REQUIRED:
    "The Working requires a paid membership. Your reading and saved work remain available.",
  METERING_INSUFFICIENT_CREDITS:
    "You do not have enough Prism Credits for this working.",
  METERING_REQUEST_TOO_LARGE:
    "That intention is too long. Shorten it and try again.",
  METERING_CONCURRENCY_LIMITED:
    "Another working is still being created. Wait a moment and try again.",
  METERING_VELOCITY_LIMITED:
    "The Working needs a short pause before another generation.",
  METERING_REQUEST_IN_PROGRESS:
    "This working is still being created. Wait a moment and retry.",
  METERING_PROVIDER_TIMEOUT:
    "The ritual took too long to compose. Your credit was returned; try again.",
  METERING_PROVIDER_ABORTED:
    "The working was interrupted. Your credit was returned; try again.",
  METERING_MODERATION_BLOCKED:
    "That intention could not be used. Rephrase it and try again.",
  METERING_EMPTY_RESULT:
    "The Working could not compose a usable ritual. Your credit was returned; try different words.",
  METERING_PERSISTENCE_FAILED:
    "The ritual could not be saved, so your credit was returned. Try again.",
  READER_AI_CAPACITY_PAUSED:
    "Reader AI capacity is temporarily paused. Your saved work is still available.",
  METERING_ACTION_OFF: "The Working is temporarily unavailable.",
  METERING_ACTION_KILLED: "The Working is temporarily unavailable.",
  METERING_ENTITLEMENT_UNAVAILABLE:
    "Membership status could not be verified. Try again shortly.",
  METERING_REQUEST_REPLAY_FAILED:
    "The saved working could not be reopened. Try again shortly.",
  METERING_SETTLEMENT_FAILED:
    "The working was saved, but its credit record needs reconciliation. Open the saved draft below; do not submit it again.",
};

function noStoreHeaders(error?: MeteringError): HeadersInit {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (error?.retryAfterSeconds) {
    headers["Retry-After"] = String(error.retryAfterSeconds);
  }
  return headers;
}

function meteringErrorResponse(error: MeteringError): NextResponse {
  return NextResponse.json(
    {
      error:
        CUSTOMER_MESSAGES[error.code] ??
        "The Working is temporarily unavailable. Try again shortly.",
      code: error.code,
      ...(error.code === "READER_AI_CAPACITY_PAUSED"
        ? { resetAt: nextUtcMonthBoundary() }
        : {}),
    },
    { status: error.status, headers: noStoreHeaders(error) }
  );
}

/**
 * POST /api/working/generate
 * Body: { intention: string, requestId: uuid }
 *
 * The server owns the one-credit quote. A successful response means the
 * generated palette and ritual are already persisted as a user-owned draft.
 */
export async function POST(req: Request) {
  const unavailable = guardCommercialAction("working_generation");
  if (unavailable) return unavailable;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "A valid request body is required.", code: "INVALID_REQUEST" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
  const intention =
    typeof body.intention === "string" ? body.intention.trim() : "";
  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim() : "";
  if (!intention) {
    return NextResponse.json(
      { error: "An intention is required.", code: "INTENTION_REQUIRED" },
      { status: 400, headers: noStoreHeaders() }
    );
  }
  if (!requestId) {
    return NextResponse.json(
      { error: "A request ID is required.", code: "REQUEST_ID_REQUIRED" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  try {
    const result = await executeMeteredWorking({
      intention,
      requestId,
      signal: req.signal,
    });
    return NextResponse.json(
      {
        ...result.value,
        replayed: result.replayed,
        chargedCredits: result.chargedCredits,
        quoteVersion: result.quoteVersion,
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    if (error instanceof MeteringError) return meteringErrorResponse(error);
    return NextResponse.json(
      {
        error: "The Working is temporarily unavailable. Try again shortly.",
        code: "WORKING_GENERATION_FAILED",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
