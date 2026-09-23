import { NextRequest } from "next/server";
import { entityInput } from "@/lib/inquiries/model";
import {
  researcher,
  handleInquiry,
  json,
  checkDB,
  InquiryError,
} from "@/lib/inquiries/server";
export function GET(request: NextRequest) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const q = (request.nextUrl.searchParams.get("q") || "")
      .trim()
      .slice(0, 100)
      .replace(/[%_\\]/g, "\\$&");
    const [entities, correspondences] = await Promise.all([
      db
        .from("research_entities")
        .select("id,name,kind,definition,correspondence_id")
        .eq("created_by", user.id)
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(30),
      db
        .from("correspondences")
        .select("id,name,category,description")
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(30),
    ]);
    checkDB(entities.error);
    checkDB(correspondences.error);
    return json({
      entities: entities.data,
      correspondences: correspondences.data,
    });
  });
}
export function POST(request: NextRequest) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const input = entityInput.parse(await request.json());
    if (input.correspondence_id) {
      const existing = await db
        .from("research_entities")
        .select("id,name,kind,definition,correspondence_id")
        .eq("correspondence_id", input.correspondence_id)
        .eq("created_by", user.id)
        .maybeSingle();
      checkDB(existing.error);
      if (existing.data) return json({ entity: existing.data });
      const original = await db
        .from("correspondences")
        .select("name")
        .eq("id", input.correspondence_id)
        .maybeSingle();
      checkDB(original.error);
      if (!original.data)
        throw new InquiryError("Correspondence entry not found.");
      input.name = original.data.name;
    }
    const { data, error } = await db
      .from("research_entities")
      .insert({ ...input, created_by: user.id })
      .select("id,name,kind,definition,correspondence_id")
      .single();
    checkDB(error);
    return json({ entity: data }, 201);
  });
}
