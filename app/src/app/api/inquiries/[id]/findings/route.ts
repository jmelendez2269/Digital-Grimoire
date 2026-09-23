import { NextRequest } from "next/server";
import { z } from "zod";
import { findingInput } from "@/lib/inquiries/model";
import {
  researcher,
  handleInquiry,
  json,
  checkDB,
  ownedInquiry,
  resolveEvidence,
  checkFindingEntities,
} from "@/lib/inquiries/server";
export function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
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
