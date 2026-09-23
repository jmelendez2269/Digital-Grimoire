import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { FindingInput, Inquiry } from "./model";

export class InquiryError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function handleInquiry(work: () => Promise<Response>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof InquiryError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return json(
        {
          error: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(" "),
        },
        400
      );
    if (error instanceof SyntaxError)
      return json({ error: "The request could not be read." }, 400);
    console.error("[inquiries]", error);
    return json(
      { error: "Unable to save or load this inquiry. Please try again." },
      500
    );
  }
}
export async function researcher(request: NextRequest) {
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    // Next may normalize nextUrl to localhost behind its dev proxy. Match the
    // browser's Origin to the actual Host header; do not trust forwarded hosts.
    const hostOrigin = `${request.nextUrl.protocol}//${request.headers.get("host")}`;
    if (origin && origin !== hostOrigin)
      throw new InquiryError("Request origin is not allowed.", 403);
  }
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) throw new InquiryError("Sign in to use inquiries.", 401);
  const { data: profile } = await auth
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile)
    throw new InquiryError("Your account could not be verified.", 403);
  return { user, db: createServiceClient(), isAdmin: profile.role === "admin" };
}
export async function curator(request: NextRequest) {
  const actor = await researcher(request);
  if (!actor.isAdmin)
    throw new InquiryError(
      "Inquiries are currently available to the curator.",
      403
    );
  return actor;
}
export async function checkFindingEntities(
  db: ResearchDB,
  input: FindingInput,
  owner: string
) {
  const ids = [
    ...new Set(
      [input.source_entity_id, input.target_entity_id].filter(
        (id): id is string => Boolean(id)
      )
    ),
  ];
  if (!ids.length) return;
  const { data, error } = await db
    .from("research_entities")
    .select("id")
    .in("id", ids)
    .eq("created_by", owner);
  checkDB(error);
  if (data?.length !== ids.length)
    throw new InquiryError(
      "Choose entries from your own research workspace.",
      403
    );
}
export type ResearchDB = ReturnType<typeof createServiceClient>;
export async function ownedInquiry(
  db: ResearchDB,
  id: string,
  owner: string
): Promise<Inquiry> {
  const { data, error } = await db
    .from("research_inquiries")
    .select("*")
    .eq("id", id)
    .eq("owner_id", owner)
    .maybeSingle();
  checkDB(error);
  if (!data) throw new InquiryError("Inquiry not found.", 404);
  return data as Inquiry;
}
export function checkDB(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "23505")
    throw new InquiryError(
      "That entry already exists. Search for it and reuse it.",
      409
    );
  if (error.code === "40001")
    throw new InquiryError(
      "This finding changed. Reload it before continuing.",
      409
    );
  if (error.code === "P0002") throw new InquiryError("Finding not found.", 404);
  if (
    error.code === "23514" ||
    error.code === "23503" ||
    error.code === "22P02" ||
    error.code === "22023"
  )
    throw new InquiryError(
      "Check the source, connection, and review state before continuing."
    );
  if (error.code === "42P01" || error.code === "PGRST205")
    throw new InquiryError("Inquiry storage is not available yet.", 503);
  throw error;
}
export function normalizePassage(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
export async function resolveEvidence(
  db: ResearchDB,
  input: FindingInput,
  verify = false
): Promise<FindingInput> {
  if (input.source_kind !== "library")
    return { ...input, text_id: null, chunk_id: null };
  if (!input.text_id) {
    if (verify) throw new InquiryError("Select a library source.");
    return input;
  }
  const { data: book, error } = await db
    .from("texts")
    .select("id,title,content")
    .eq("id", input.text_id)
    .maybeSingle();
  checkDB(error);
  if (!book) throw new InquiryError("The library source could not be found.");
  let content = book.content || "";
  if (input.chunk_id) {
    const chunkResult = await db
      .from("text_chunks")
      .select("content,text_id")
      .eq("id", input.chunk_id)
      .eq("text_id", book.id)
      .maybeSingle();
    checkDB(chunkResult.error);
    if (!chunkResult.data)
      throw new InquiryError(
        "This passage does not belong to the selected book."
      );
    content = chunkResult.data.content;
  }
  if (
    verify &&
    (!normalizePassage(input.excerpt) ||
      !normalizePassage(content).includes(normalizePassage(input.excerpt)))
  ) {
    throw new InquiryError(
      "This quotation does not match the stored source text. Open the source and capture the exact passage before review."
    );
  }
  return { ...input, source_title: book.title, source_url: "" };
}
