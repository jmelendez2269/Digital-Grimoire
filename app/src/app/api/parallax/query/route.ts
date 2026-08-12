import { guardCommercialAction } from "@/lib/commercial-availability";
import { MeteringError } from "@/lib/membership/metering-adapter.server";
import {
  executeMeteredSevenLenses,
  type SevenLensesGenerationResult,
} from "@/lib/parallax/metered-seven-lenses.server";
import type { LensWeights, ResponseLength } from "@/lib/parallax/types";

export const maxDuration = 120;

const CUSTOMER_MESSAGES: Record<string, string> = {
  METERING_UNAUTHORIZED: "Sign in to use Seven Lenses.",
  METERING_VERIFIED_EMAIL_REQUIRED:
    "Verify your email before using Seven Lenses.",
  METERING_INSUFFICIENT_CREDITS:
    "You do not have enough Prism Credits for this analysis.",
  METERING_REQUEST_TOO_LARGE:
    "That question is too long. Shorten it and try again.",
  METERING_CONCURRENCY_LIMITED:
    "Another analysis is still running. Wait a moment and try again.",
  METERING_VELOCITY_LIMITED:
    "Seven Lenses needs a short pause before another analysis.",
  METERING_REQUEST_IN_PROGRESS:
    "This analysis is still running. Wait a moment and retry.",
  METERING_PROVIDER_TIMEOUT:
    "The analysis took too long. Your credits were returned; try again.",
  METERING_PROVIDER_ABORTED:
    "The analysis was interrupted. Your credits were returned; try again.",
  METERING_MODERATION_BLOCKED:
    "That question could not be used. Rephrase it and try again.",
  METERING_EMPTY_RESULT:
    "Seven Lenses did not produce a usable answer. Your credits were returned; try again.",
  METERING_PERSISTENCE_FAILED:
    "The answer could not be saved, so your credits were returned. Try again.",
  READER_AI_CAPACITY_PAUSED:
    "Reader AI capacity is temporarily paused. Your saved analyses are still available.",
  METERING_ACTION_OFF: "Seven Lenses is temporarily unavailable.",
  METERING_ACTION_KILLED: "Seven Lenses is temporarily unavailable.",
  METERING_ENTITLEMENT_UNAVAILABLE:
    "Membership status could not be verified. Try again shortly.",
  METERING_REQUEST_REPLAY_FAILED:
    "The saved analysis could not be reopened. Try again shortly.",
  METERING_SETTLEMENT_FAILED:
    "The analysis was saved, but its credit record needs reconciliation. Open it from history; do not submit it again.",
};

const LENS_KEYS = [
  "scientific",
  "psychological",
  "philosophical",
  "religious_spiritual",
  "historical_anthropological",
  "symbolic_occult",
  "mathematical",
] as const;

function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

function jsonError(error: string, code: string, status: number): Response {
  return Response.json(
    { error, code },
    { status, headers: noStoreHeaders() },
  );
}

function parseLensWeights(value: unknown): LensWeights | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== LENS_KEYS.length) return null;
  const valid = LENS_KEYS.every(
    (key) =>
      Number.isSafeInteger(candidate[key]) &&
      (candidate[key] as number) >= 0 &&
      (candidate[key] as number) <= 100,
  );
  if (!valid || !LENS_KEYS.some((key) => (candidate[key] as number) > 0)) {
    return null;
  }
  return Object.fromEntries(
    LENS_KEYS.map((key) => [key, candidate[key]]),
  ) as unknown as LensWeights;
}

function parseResponseLength(value: unknown): ResponseLength | null {
  return value === "short" || value === "medium" || value === "long"
    ? value
    : null;
}

function sse(value: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);
}

function safeEnqueue(
  controller: ReadableStreamDefaultController<Uint8Array>,
  value: unknown,
): boolean {
  try {
    controller.enqueue(sse(value));
    return true;
  } catch {
    return false;
  }
}

function emitDurableResult(
  controller: ReadableStreamDefaultController<Uint8Array>,
  result: SevenLensesGenerationResult,
  metering: {
    replayed: boolean;
    chargedCredits: number;
    quoteVersion: string;
  },
): void {
  safeEnqueue(controller, {
    type: "synthesis",
    content: result.synthesis,
    sources: result.sources,
    durable: true,
    resultUrl: result.resultUrl,
  });
  safeEnqueue(controller, {
    type: "done",
    response: result,
    resultUrl: result.resultUrl,
    ...metering,
    message: metering.replayed
      ? "Saved analysis reopened"
      : "Analysis saved",
  });
}

/**
 * POST /api/parallax/query
 * Body: { query, lensWeights, responseLength, requestId }
 *
 * Status events may stream while work is underway. Generated content is emitted
 * only after the user-owned convergence response is durable and metering has
 * settled. Standard (short/medium) costs 2 credits; long costs 3.
 */
export async function POST(request: Request) {
  const unavailable = guardCommercialAction("seven_lenses_generation");
  if (unavailable) return unavailable;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("A valid request body is required.", "INVALID_REQUEST", 400);
  }
  const candidate = body as Record<string, unknown>;
  const query = typeof candidate.query === "string" ? candidate.query.trim() : "";
  const requestId =
    typeof candidate.requestId === "string" ? candidate.requestId.trim() : "";
  const lensWeights = parseLensWeights(candidate.lensWeights);
  const responseLength = parseResponseLength(candidate.responseLength);
  if (!query) return jsonError("A question is required.", "QUERY_REQUIRED", 400);
  if (!lensWeights) {
    return jsonError(
      "Choose at least one valid lens.",
      "LENS_WEIGHTS_INVALID",
      400,
    );
  }
  if (!responseLength) {
    return jsonError(
      "Choose a valid response length.",
      "RESPONSE_LENGTH_INVALID",
      400,
    );
  }
  if (!requestId) {
    return jsonError("A request ID is required.", "REQUEST_ID_REQUIRED", 400);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      safeEnqueue(controller, {
        type: "start",
        message: "Reserving capacity and preparing your analysis...",
      });
      try {
        const result = await executeMeteredSevenLenses({
          query,
          lensWeights,
          responseLength,
          requestId,
          signal: request.signal,
        });
        emitDurableResult(controller, result.value, {
          replayed: result.replayed,
          chargedCredits: result.chargedCredits,
          quoteVersion: result.quoteVersion,
        });
      } catch (error) {
        const code =
          error instanceof MeteringError
            ? error.code
            : "SEVEN_LENSES_GENERATION_FAILED";
        safeEnqueue(controller, {
          type: "error",
          code,
          retryAfterSeconds:
            error instanceof MeteringError ? error.retryAfterSeconds : null,
          message:
            CUSTOMER_MESSAGES[code] ??
            "Seven Lenses is temporarily unavailable. Try again shortly.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // The browser may have disconnected while the server released the hold.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
