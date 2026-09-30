import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { handleInquiry, json, checkDB } from "@/lib/inquiries/server";
export function GET(request: NextRequest) {
  return handleInquiry(async () => {
    const query = (request.nextUrl.searchParams.get("q") || "")
      .trim()
      .slice(0, 100);
    if (query.length < 2) return json({ items: [] });
    const { data, error } = await createServiceClient().rpc(
      "search_knowledge_suggestions",
      { p_query: query, p_limit: 8 }
    );
    checkDB(error);
    return json({ items: data || [] });
  });
}
