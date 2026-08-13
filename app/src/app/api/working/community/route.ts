import { NextResponse } from "next/server";

/**
 * Member workings are private. The former community feed is intentionally
 * retired; the public preview imports an editorial recording directly.
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "The community workings feed has been retired. Use the recorded public preview instead.",
    },
    { status: 410 }
  );
}
