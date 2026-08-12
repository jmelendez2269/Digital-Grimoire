import { guardCommercialAction } from "@/lib/commercial-availability";
import {
  MeteringError,
} from "@/lib/membership/metering-adapter.server";
import { executeMeteredLensExpansion } from "@/lib/parallax/metered-lens-expansion.server";

export const maxDuration = 75;

const CUSTOMER_MESSAGES: Record<string, string> = {
  METERING_UNAUTHORIZED: "Sign in to expand this lens.",
  METERING_VERIFIED_EMAIL_REQUIRED:
    "Verify your email before expanding a lens.",
  METERING_INSUFFICIENT_CREDITS:
    "You do not have enough Prism Credits for this expansion.",
  METERING_INVALID_INPUT: "This expansion request is invalid.",
  LENS_EXPANSION_PARENT_NOT_FOUND:
    "The saved parent analysis could not be found.",
  LENS_EXPANSION_PARENT_INVALID:
    "This saved analysis cannot be expanded safely.",
  LENS_EXPANSION_PARENT_UNAVAILABLE:
    "The saved parent analysis is temporarily unavailable.",
  LENS_EXPANSION_LENS_NOT_IN_PARENT:
    "That lens was not part of the saved parent analysis.",
  METERING_CONCURRENCY_LIMITED:
    "Another expansion is still running. Wait a moment and try again.",
  METERING_VELOCITY_LIMITED:
    "Lens expansion needs a short pause before another request.",
  METERING_REQUEST_IN_PROGRESS:
    "This expansion is still running. Wait a moment and retry.",
  METERING_PROVIDER_TIMEOUT:
    "The expansion took too long. Your credit was returned; try again.",
  METERING_PROVIDER_ABORTED:
    "The expansion was interrupted. Your credit was returned; try again.",
  METERING_EMPTY_RESULT:
    "The lens did not produce a usable response. Your credit was returned; try again.",
  METERING_PERSISTENCE_FAILED:
    "The expansion could not be saved, so your credit was returned. Try again.",
  READER_AI_CAPACITY_PAUSED:
    "Reader AI capacity is temporarily paused. Your saved analysis is still available.",
  METERING_ACTION_OFF: "Lens expansion is temporarily unavailable.",
  METERING_ACTION_KILLED: "Lens expansion is temporarily unavailable.",
  METERING_ENTITLEMENT_UNAVAILABLE:
    "Membership status could not be verified. Try again shortly.",
  METERING_REQUEST_REPLAY_FAILED:
    "The saved expansion could not be reopened. Try again shortly.",
  METERING_SETTLEMENT_FAILED:
    "The expansion was saved, but its credit record needs reconciliation. Retry with the same request; do not start a new expansion.",
};

function headers(error?: MeteringError): HeadersInit {
  const value: Record<string, string> = { "Cache-Control": "no-store" };
  if (error?.retryAfterSeconds) {
    value["Retry-After"] = String(error.retryAfterSeconds);
  }
  return value;
}

function errorResponse(error: MeteringError): Response {
  return Response.json(
    {
      error:
        CUSTOMER_MESSAGES[error.code] ??
        "Lens expansion is temporarily unavailable. Try again shortly.",
      code: error.code,
    },
    { status: error.status, headers: headers(error) },
  );
}

/**
 * POST /api/parallax/lens/[lensId]
 * Body: { parentResponseId: uuid, requestId: uuid }
 *
 * Query, lens weights, response length, action code, and one-credit price are
 * server-owned. The expansion is durable and settled before content is sent.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ lensId: string }> },
) {
  const unavailable = guardCommercialAction("seven_lenses_expansion");
  if (unavailable) return unavailable;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "A valid request body is required.", code: "INVALID_REQUEST" },
      { status: 400, headers: headers() },
    );
  }
  const candidate = body as Record<string, unknown>;
  if (
    Object.keys(candidate).some(
      (key) => key !== "parentResponseId" && key !== "requestId",
    )
  ) {
    return Response.json(
      {
        error: "Only the saved parent and request ID may be supplied.",
        code: "INVALID_REQUEST_FIELDS",
      },
      { status: 400, headers: headers() },
    );
  }
  const parentResponseId =
    typeof candidate.parentResponseId === "string"
      ? candidate.parentResponseId.trim()
      : "";
  const requestId =
    typeof candidate.requestId === "string" ? candidate.requestId.trim() : "";
  const { lensId } = await params;
  if (!parentResponseId || !requestId) {
    return Response.json(
      {
        error: "A saved parent and request ID are required.",
        code: "EXPANSION_IDS_REQUIRED",
      },
      { status: 400, headers: headers() },
    );
  }

  try {
    const result = await executeMeteredLensExpansion({
      parentResponseId,
      lensId,
      requestId,
      signal: request.signal,
    });
    return Response.json(
      {
        lensResponse: result.value,
        replayed: result.replayed,
        chargedCredits: result.chargedCredits,
        quoteVersion: result.quoteVersion,
      },
      { headers: headers() },
    );
  } catch (error) {
    if (error instanceof MeteringError) return errorResponse(error);
    return Response.json(
      {
        error: "Lens expansion is temporarily unavailable. Try again shortly.",
        code: "LENS_EXPANSION_FAILED",
      },
      { status: 500, headers: headers() },
    );
  }
}
