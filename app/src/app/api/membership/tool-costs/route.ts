import { NextResponse } from "next/server";

import {
  isCommercialActionEnabled,
  type CommercialAction,
} from "@/lib/commercial-availability-policy";
import {
  getSafeMembershipCatalog,
  type MeteredActionCode,
} from "@/lib/membership/membership-catalog.server";
import { resolveMeteringActionPolicy } from "@/lib/membership/metering-catalog.server";

export const dynamic = "force-dynamic";

const COMMERCIAL_ACTIONS: Partial<
  Record<MeteredActionCode, CommercialAction>
> = {
  "working.generate": "working_generation",
  "seven_lenses.expand": "seven_lenses_expansion",
  "seven_lenses.standard": "seven_lenses_generation",
  "seven_lenses.long": "seven_lenses_generation",
};

/**
 * Customer-safe tool costs and availability. Prices, modes, and gates remain
 * server-owned; this endpoint cannot enable an action or mutate a wallet.
 */
export async function GET() {
  const catalog = getSafeMembershipCatalog();
  const actions = catalog.actions.map((action) => {
    const commercialAction = COMMERCIAL_ACTIONS[action.code];
    const policy = resolveMeteringActionPolicy(action.code);
    const enabled = Boolean(
      commercialAction &&
        action.launchEnabled &&
        isCommercialActionEnabled(commercialAction) &&
        policy?.configurationValid &&
        !policy.killed &&
        policy.mode !== "off" &&
        policy.quote.offered &&
        policy.quote.creditCost === action.creditCost,
    );

    return {
      actionCode: action.code,
      customerLabel: action.customerLabel,
      creditCost: action.creditCost,
      enabled,
    };
  });

  return NextResponse.json(
    {
      toolCosts: {
        version: catalog.version,
        actions,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
