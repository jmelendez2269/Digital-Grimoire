import { NextRequest } from "next/server";
import { z } from "zod";
import { findingInput } from "@/lib/inquiries/model";
import { checkAndRecordRateLimit } from "@/lib/api-rate-limit.server";
import {
  researcher,
  handleInquiry,
  json,
  checkDB,
  ownedInquiry,
  resolveEvidence,
  checkFindingEntities,
  InquiryError,
} from "@/lib/inquiries/server";
export function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const rateLimit = await checkAndRecordRateLimit(
      user.id,
      "inquiry_finding_save",
      { limit: 50, windowMs: 3600_000 }
    );
    if (!rateLimit.allowed) {
      throw new InquiryError(
        `Rate limit exceeded. Try again after ${rateLimit.resetAt.toLocaleTimeString()}.`,
        429
      );
    }
    const { id } = await context.params;
    await ownedInquiry(db, z.uuid().parse(id), user.id);
    const input = await resolveEvidence(
      db,
      findingInput.parse(await request.json())
    );
    await checkFindingEntities(db, input, user.id);
    const { data, error } = await db
      .from("research_findings")
      .insert({ ...input, inquiry_id: id })
      .select("*")
      .single();
    checkDB(error);
    return json({ finding: data }, 201);
  });
}
