import "server-only";

import {
  isCheckoutPriceAllowed,
  isCommercialActionEnabled,
  type AvailabilityEnvironment,
  type CommercialAction,
} from "@/lib/commercial-availability-policy";

function temporarilyUnavailableResponse(): Response {
  return Response.json(
    {
      error: "This action is temporarily unavailable.",
      code: "ACTION_TEMPORARILY_UNAVAILABLE",
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "3600",
      },
    },
  );
}

export function guardCommercialAction(
  action: CommercialAction,
  environment: AvailabilityEnvironment = process.env,
): Response | null {
  return isCommercialActionEnabled(action, environment)
    ? null
    : temporarilyUnavailableResponse();
}

export function guardCheckoutOffer(
  priceId: unknown,
  environment: AvailabilityEnvironment = process.env,
): Response | null {
  return isCheckoutPriceAllowed(priceId, environment)
    ? null
    : temporarilyUnavailableResponse();
}
