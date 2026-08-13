import { NextResponse } from "next/server";

/** Member working detail is no longer available through a public API. */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "Public member-working links have been retired. Use the recorded public preview instead.",
    },
    { status: 410 }
  );
}
