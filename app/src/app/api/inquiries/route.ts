import { NextRequest } from "next/server";
import { inquiryInput } from "@/lib/inquiries/model";
import { checkAndRecordRateLimit } from "@/lib/api-rate-limit.server";
import {
  researcher,
  handleInquiry,
  json,
  checkDB,
  InquiryError,
} from "@/lib/inquiries/server";

export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const { data, error } = await db
      .from("research_inquiries")
      .select("id,title,question,updated_at,revision")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(200);
    checkDB(error);
    return json({ inquiries: data });
  });
}
export function POST(request: NextRequest) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const rateLimit = await checkAndRecordRateLimit(
      user.id,
      "inquiry_create",
      { limit: 20, windowMs: 3600_000 }
    );
    if (!rateLimit.allowed) {
      throw new InquiryError(
        `Rate limit exceeded. Try again after ${rateLimit.resetAt.toLocaleTimeString()}.`,
        429
      );
    }
    const input = inquiryInput.parse(await request.json());
    const { data, error } = await db
      .from("research_inquiries")
      .insert({ ...input, owner_id: user.id })
      .select("*")
      .single();
    checkDB(error);
    return json({ inquiry: data }, 201);
  });
}
