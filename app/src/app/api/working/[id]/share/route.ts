import { NextResponse } from "next/server";

function sharingRetiredResponse() {
  return NextResponse.json(
    {
      error:
        "Community sharing has been retired. Member workings remain private.",
    },
    { status: 410 }
  );
}

export async function POST() {
  return sharingRetiredResponse();
}

export async function DELETE() {
  return sharingRetiredResponse();
}
