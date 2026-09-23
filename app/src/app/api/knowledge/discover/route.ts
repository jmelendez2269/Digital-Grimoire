import { NextRequest } from "next/server";
import {
  researcher,
  checkDB,
  handleInquiry,
  InquiryError,
  json,
} from "@/lib/inquiries/server";
import { guardCommercialAction } from "@/lib/commercial-availability";
import { hybridSearch } from "@/lib/parallax/hybrid-retrieval";
import { discover } from "@/lib/discovery/engine";
import { discoveryProvider } from "@/lib/discovery/provider";
import { executeMeteredDiscovery } from "@/lib/discovery/metered.server";
import { MeteringError } from "@/lib/membership/metering-adapter.server";
import {
  discoveryRequest,
  type DiscoveryEvent,
  type DiscoveryRun,
} from "@/lib/discovery/model";

export const maxDuration = 300;
export function GET(request: NextRequest) {
  return handleInquiry(async () => {
    const { user, db } = await researcher(request);
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const { data, error } = await db
        .from("research_discoveries")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user.id)
        .maybeSingle();
      checkDB(error);
      if (!data) throw new InquiryError("Research not found.", 404);
      return json({ run: data });
    }
    const { data, error } = await db
      .from("research_discoveries")
      .select("id,question,parent_id,root_id,status,created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    checkDB(error);
    return json({ runs: data });
  });
}

export function POST(request: NextRequest) {
  return handleInquiry(async () => {
    const { user, db, isAdmin } = await researcher(request);
    const input = discoveryRequest.parse(await request.json());
    const prior = await db
      .from("research_discoveries")
      .select("*")
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .maybeSingle();
    checkDB(prior.error);
    if (prior.data) {
      if (
        prior.data.question !== input.question ||
        prior.data.parent_id !== (input.parentId || null)
      )
        throw new InquiryError(
          "This request belongs to a different question.",
          409
        );
      return json(
        { run: prior.data },
        prior.data.status === "running" ? 202 : 200
      );
    }
    const unavailable = guardCommercialAction("deep_search_generation");
    if (unavailable) return unavailable;
    if (!process.env.OPENROUTER_API_KEY)
      throw new InquiryError(
        "Live research is not configured on this server yet.",
        503
      );
    const context: string[] = [];
    let parent: DiscoveryRun | null = null;
    let cursor = input.parentId;
    while (cursor && context.length < 10) {
      const found = await db
        .from("research_discoveries")
        .select("*")
        .eq("id", cursor)
        .eq("owner_id", user.id)
        .eq("status", "complete")
        .maybeSingle();
      checkDB(found.error);
      if (!found.data)
        throw new InquiryError(
          "The previous research step could not be found.",
          404
        );
      parent ||= found.data as DiscoveryRun;
      context.unshift(found.data.question);
      cursor = found.data.parent_id || undefined;
    }
    const recent = await db
      .from("research_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    checkDB(recent.error);
    if ((recent.count || 0) >= 20)
      throw new InquiryError(
        "Today's research limit is reached. Your existing discoveries are still available.",
        429
      );
    const inserted = await db
      .from("research_discoveries")
      .insert({
        id: input.id,
        owner_id: user.id,
        question: input.question,
        parent_id: input.parentId || null,
        root_id: parent?.root_id || input.id,
      })
      .select("*")
      .single();
    checkDB(inserted.error);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: DiscoveryEvent) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          } catch {
            /* Client disconnected; still persist the outcome. */
          }
        };
        try {
          const signal = AbortSignal.any([
            request.signal,
            AbortSignal.timeout(240000),
          ]);
          const { deps, usage } = discoveryProvider(async (query) => {
            const rows = await hybridSearch(query, { limit: 4 });
            return rows.map((row) => ({
              title: row.text_title || "Library passage",
              url: `/library/${row.text_id}${row.chunk_id ? `?chunk=${row.chunk_id}` : ""}`,
              content: row.content
                .replace(/^\.\.\.|\.\.\.$/g, "")
                .trim()
                .slice(0, 6000),
              kind: "library" as const,
              query,
              textId: row.text_id,
              chunkId: row.chunk_id,
            }));
          }, signal);
          const generate = async () => ({
            ...(await discover(input.question, context, deps, (message) =>
              emit({ type: "progress", message })
            )),
            usage,
          });
          const persist = async (
            result: Awaited<ReturnType<typeof generate>>,
            owner: string
          ) => {
            const saved = await db
              .from("research_discoveries")
              .update({
                status: "complete",
                result,
                completed_at: new Date().toISOString(),
              })
              .eq("id", input.id)
              .eq("owner_id", owner)
              .select("*")
              .single();
            checkDB(saved.error);
            return saved.data as DiscoveryRun;
          };
          if (isAdmin) {
            const run = await persist(await generate(), user.id);
            emit({ type: "complete", run, chargedCredits: 0 });
          } else {
            const outcome = await executeMeteredDiscovery(input, {
              generate,
              persist,
              usage,
              signal,
              replay: async (id, owner) => {
                const saved = await db
                  .from("research_discoveries")
                  .select("*")
                  .eq("id", id)
                  .eq("owner_id", owner)
                  .eq("status", "complete")
                  .single();
                checkDB(saved.error);
                return saved.data as DiscoveryRun;
              },
            });
            emit({
              type: "complete",
              run: outcome.value,
              chargedCredits: outcome.chargedCredits,
            });
          }
        } catch (error) {
          console.error(
            "[Discovery]",
            error instanceof Error ? error.message : "Research failed"
          );
          const code = error instanceof MeteringError ? error.code : undefined;
          const message =
            code === "METERING_SETTLEMENT_FAILED"
              ? "Your research was saved, but its credit record needs checking. Open the saved result before starting another investigation."
              : code === "METERING_INSUFFICIENT_CREDITS"
                ? "This investigation needs 3 Prism Credits. Your saved research remains available."
                : code === "METERING_PAID_MEMBERSHIP_REQUIRED"
                  ? "A paid membership is required for new investigations. Your saved research remains available."
                  : code === "METERING_ACTION_OFF" ||
                      code === "METERING_ACTION_KILLED"
                    ? "New investigations are temporarily unavailable. Your saved research remains available."
                    : "Research could not finish. Check your credit balance and saved research before retrying.";
          await db
            .from("research_discoveries")
            .update({
              status: "failed",
              error: message,
              completed_at: new Date().toISOString(),
            })
            .eq("id", input.id)
            .eq("status", "running")
            .eq("owner_id", user.id);
          emit({ type: "error", message, id: input.id, code });
        } finally {
          try {
            controller.close();
          } catch {
            /* The client may have cancelled the stream. */
          }
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
