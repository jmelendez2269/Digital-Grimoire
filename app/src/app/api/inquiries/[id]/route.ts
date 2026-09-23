import { NextRequest } from "next/server";
import { z } from "zod";
import { inquiryInput } from "@/lib/inquiries/model";
import {
  researcher,
  handleInquiry,
  json,
  checkDB,
  ownedInquiry,
  InquiryError,
} from "@/lib/inquiries/server";
type Context = { params: Promise<{ id: string }> };
export function GET(request: NextRequest, context: Context) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const { id } = await context.params;
    const inquiry = await ownedInquiry(db, z.uuid().parse(id), user.id);
    const { data: findings, error } = await db
      .from("research_findings")
      .select("*")
      .eq("inquiry_id", inquiry.id)
      .order("sort_order")
      .limit(500);
    checkDB(error);
    const ids = [
      ...new Set(
        (findings || [])
          .flatMap((f) => [f.source_entity_id, f.target_entity_id])
          .filter(Boolean)
      ),
    ];
    const entityResult = ids.length
      ? await db
          .from("research_entities")
          .select("id,name,kind,definition,correspondence_id")
          .in("id", ids)
      : { data: [], error: null };
    checkDB(entityResult.error);
    return json({ inquiry, findings, entities: entityResult.data });
  });
}
export function PATCH(request: NextRequest, context: Context) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const { id } = await context.params;
    const input = inquiryInput
      .extend({ revision: z.number().int().positive() })
      .parse(await request.json());
    await ownedInquiry(db, z.uuid().parse(id), user.id);
    const { data, error } = await db
      .from("research_inquiries")
      .update({
        ...input,
        revision: input.revision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("revision", input.revision)
      .select("*")
      .maybeSingle();
    checkDB(error);
    if (!data)
      throw new InquiryError(
        "This inquiry changed. Reload before saving.",
        409
      );
    return json({ inquiry: data });
  });
}
