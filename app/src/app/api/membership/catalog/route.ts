import { NextResponse } from "next/server";

import { getSafeMembershipCatalog } from "@/lib/membership/membership-catalog.server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { catalog: getSafeMembershipCatalog() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
