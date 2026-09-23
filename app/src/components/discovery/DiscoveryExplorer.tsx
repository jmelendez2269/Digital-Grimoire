"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, BookmarkPlus, ChevronRight } from "lucide-react";
import { EVIDENCE_CLASSES, PREDICATES } from "@/lib/inquiries/model";
import { useAuth } from "@/contexts/AuthContext";
import {
  CreditWalletProvider,
  useCreditWallet,
  useOptionalCreditWallet,
  useToolCreditState,
} from "@/components/membership/CreditWalletProvider";
import ToolCreditStatus from "@/components/membership/ToolCreditStatus";
import type {
  Assertion,
  DiscoveryEvent,
  DiscoveryRun,
  Source,
} from "@/lib/discovery/model";
import {
  buttonClass,
  primaryClass,
  inputClass,
  inquiryRequest,
} from "@/components/inquiries/shared";

type HistoryItem = Pick<
  DiscoveryRun,
  "id" | "question" | "parent_id" | "root_id" | "status"
>;
function Evidence({
  assertion,
  sources,
}: {
  assertion: Assertion;
  sources: Source[];
}) {
  return (
    <div className="mt-4 space-y-3">
      {assertion.evidence.map((e, index) => {
        const source = sources.find((s) => s.id === e.sourceId);
        if (!source) return null;
        return (
          <details
            key={`${e.sourceId}-${index}`}
            className="rounded-lg border border-zinc-700 p-3"
          >
            <summary className="cursor-pointer text-sm text-amber-200">
              Evidence: {source.title}
            </summary>
            <blockquote className="my-3 border-l-2 border-amber-500/60 pl-3 text-sm leading-6 text-zinc-300">
              {e.quote}
            </blockquote>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-200 underline"
            >
              Open{" "}
              {source.kind === "web" ? "original source" : "library passage"}
            </a>
            <p className="mt-2 text-xs text-zinc-400">
              {source.kind === "web"
                ? "Quoted from the passage returned by web search. Open the full source to check its context."
                : "Passage retrieved from the library."}
            </p>
          </details>
        );
      })}
    </div>
  );
}

export default function DiscoveryExplorer(props: { initialQuery?: string }) {
  const wallet = useOptionalCreditWallet();
  return wallet ? (
    <DiscoveryContent {...props} />
  ) : (
    <CreditWalletProvider>
      <DiscoveryContent {...props} />
    </CreditWalletProvider>
  );
}

function DiscoveryContent({ initialQuery = "" }: { initialQuery?: string }) {
  const { isAdmin } = useAuth();
  const creditState = useToolCreditState("research.investigate");
  const { refresh: refreshWallet } = useCreditWallet();
  const canResearch = isAdmin || creditState.canSubmit;
  const costLabel = isAdmin
    ? "Admin research"
    : `${creditState.requiredCredits ?? 3} Prism Credits`;
  const [creditNotice, setCreditNotice] = useState("");
  const pendingRef = useRef<{
    id: string;
    question: string;
    parentId?: string;
  } | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [question, setQuestion] = useState(initialQuery);
  const [followup, setFollowup] = useState("");
  const [run, setRun] = useState<DiscoveryRun | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<Record<number, string>>({});
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  async function loadRun(id: string) {
    setError("");
    try {
      const data = await inquiryRequest<{ run: DiscoveryRun }>(
        `/api/knowledge/discover?id=${encodeURIComponent(id)}`
      );
      setRun(data.run);
      setSaved({});
      const url = new URL(window.location.href);
      url.searchParams.set("discovery", data.run.id);
      window.history.replaceState(null, "", url);
      if (data.run.status === "running")
        setError(
          "This research is still running or was interrupted. Refresh this step shortly, or start a new search."
        );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load research.");
    }
  }
  useEffect(() => {
    const abort = new AbortController();
    inquiryRequest<{ runs: HistoryItem[] }>(
      "/api/knowledge/discover",
      "GET",
      undefined,
      abort.signal
    )
      .then((data) => setHistory(data.runs))
      .catch((err) => {
        if (!abort.signal.aborted) setError(err.message);
      });
    const selected = new URLSearchParams(window.location.search).get(
      "discovery"
    );
    if (selected) void loadRun(selected);
    return () => {
      abort.abort();
      abortRef.current?.abort();
    };
  }, []);
  async function research(nextQuestion: string, parentId?: string) {
    if (loading || !canResearch || nextQuestion.trim().length < 2) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    setProgress("Starting your research…");
    setCreditNotice("");
    const matching =
      pendingRef.current?.question === nextQuestion.trim() &&
      pendingRef.current?.parentId === parentId;
    const id = matching ? pendingRef.current!.id : crypto.randomUUID();
    pendingRef.current = { id, question: nextQuestion.trim(), parentId };
    setLastRequestId(id);
    let complete = false;
    function accept(next: DiscoveryRun) {
      if (next.status === "running")
        throw new Error(
          "This investigation is still running. Check the saved research before retrying."
        );
      pendingRef.current = null;
      if (next.status === "failed")
        throw new Error(
          next.error ||
            "The earlier attempt failed. You can retry the question."
        );
      complete = true;
      setRun(next);
      setSaved({});
      setFollowup("");
      setHistory((prev) =>
        [next, ...prev.filter((r) => r.id !== next.id)].slice(0, 30)
      );
      const url = new URL(window.location.href);
      url.searchParams.set("discovery", next.id);
      window.history.replaceState(null, "", url);
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50
      );
    }
    try {
      const response = await fetch("/api/knowledge/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, question: nextQuestion.trim(), parentId }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        if (response.status < 500) pendingRef.current = null;
        throw new Error(data.error || "Research is unavailable.");
      }
      if (!response.headers.get("content-type")?.includes("ndjson")) {
        const data = await response.json();
        accept(data.run);
      } else {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines.filter(Boolean)) {
            const event = JSON.parse(line) as DiscoveryEvent;
            if (event.type === "progress") setProgress(event.message);
            if (event.type === "complete") {
              accept(event.run);
              setCreditNotice(
                event.chargedCredits
                  ? `Research saved · ${event.chargedCredits} Prism Credits used.`
                  : "Research saved. No credits deducted."
              );
            }
            if (event.type === "error") {
              if (event.code !== "METERING_SETTLEMENT_FAILED")
                pendingRef.current = null;
              throw new Error(event.message);
            }
          }
          if (done) break;
        }
      }
      if (!complete)
        throw new Error(
          "The connection ended before research finished. Check your recent research before retrying."
        );
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Unable to research this question."
        );
    } finally {
      setLoading(false);
      setProgress("");
      void refreshWallet();
    }
  }
  async function save(index: number) {
    if (!run) return;
    setSaving(index);
    setError("");
    try {
      const data = await inquiryRequest<{ inquiryId: string }>(
        `/api/knowledge/discover/${run.id}/save`,
        "POST",
        { index }
      );
      setSaved((prev) => ({ ...prev, [index]: data.inquiryId }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save this discovery."
      );
    } finally {
      setSaving(null);
    }
  }
  const result = run?.result;
  const trail: HistoryItem[] = [];
  let current: HistoryItem | undefined = run || undefined;
  while (
    current &&
    trail.length < 10 &&
    !trail.some((r) => r.id === current!.id)
  ) {
    trail.unshift(current);
    current = history.find((h) => h.id === current!.parent_id);
  }
  return (
    <div className="space-y-7 text-left text-zinc-100">
      <header className="max-w-3xl">
        <p className="text-xs tracking-widest text-amber-200 uppercase">
          Follow your curiosity
        </p>
        <h2 className="mt-3 font-serif text-3xl">
          Start with a question. Discover where it leads.
        </h2>
        <p className="mt-3 leading-7 text-zinc-400">
          Ask in your own words. I’ll search the library and the web, follow
          promising clues, and explain the connections with sources you can
          inspect.
        </p>
      </header>
      {isAdmin ? (
        <p className="text-sm text-amber-200">
          Admin research · No credits deducted. Members pay 3 Prism Credits per
          investigation.
        </p>
      ) : (
        <ToolCreditStatus actionCode="research.investigate" />
      )}
      <p className="text-sm text-zinc-400">
        Each new investigation includes source searches, an explanation, and an
        evidence review. Reading evidence, reopening saved results, and saving
        connections are free.
      </p>
      <Link href="/journal?tab=research" className="text-sm text-amber-200 underline">
        My Journal · Research
      </Link>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void research(question);
        }}
        className="space-y-3"
      >
        <label htmlFor="discovery-question" className="block text-sm">
          What are you curious about?
        </label>
        <textarea
          id="discovery-question"
          className={`${inputClass} min-h-24`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={2000}
          placeholder="WTF is Alchemy?"
          disabled={loading}
        />
        <div className="flex flex-wrap gap-3">
          <button
            className={primaryClass}
            disabled={loading || !canResearch || question.trim().length < 2}
          >
            <Search size={16} />
            {loading ? "Researching…" : `Explore this question · ${costLabel}`}
          </button>
          {!run && (
            <button
              type="button"
              className={buttonClass}
              disabled={loading}
              onClick={() => setQuestion("WTF is Alchemy?")}
            >
              Try “WTF is Alchemy?”
            </button>
          )}
        </div>
      </form>
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5"
        >
          <p>{progress}</p>
          <p className="mt-2 text-sm text-zinc-400">
            This may take a couple of minutes as the research follows more than
            one source.
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 p-4 text-red-200"
        >
          {error}
        </p>
      )}
      {error && lastRequestId && (
        <button
          className={buttonClass}
          onClick={() => void loadRun(lastRequestId)}
        >
          Check this saved research · Free
        </button>
      )}
      {creditNotice && (
        <p role="status" className="text-sm text-amber-200">
          {creditNotice}
        </p>
      )}
      {run && (
        <section
          ref={resultRef}
          className="scroll-mt-24 space-y-6"
          aria-label="Research discoveries"
        >
          <nav
            aria-label="Discovery trail"
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            {trail.map((item, i) => (
              <span className="flex items-center gap-2" key={item.id}>
                {i > 0 && <ChevronRight size={14} />}
                <button
                  className="text-amber-200 underline"
                  disabled={loading}
                  onClick={() => void loadRun(item.id)}
                  aria-current={item.id === run.id ? "step" : undefined}
                >
                  {item.question}
                </button>
              </span>
            ))}
          </nav>
          <h2 className="font-serif text-3xl">{run.question}</h2>
          {run.status === "failed" && <p>{run.error}</p>}
          {result && (
            <>
              <p className="text-sm text-zinc-400">
                Research interpretation · {result.sources.length} retrieved
                source passages · Open the evidence to assess each claim.
              </p>
              {result.warnings.map((w) => (
                <p key={w} className="text-sm text-amber-200">
                  {w}
                </p>
              ))}
              {result.overview.map((a, index) => (
                <article
                  key={index}
                  className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5"
                >
                  <h3 className="font-serif text-xl">{a.title}</h3>
                  <p className="mt-3 leading-7 whitespace-pre-wrap text-zinc-300">
                    {a.explanation}
                  </p>
                  <Evidence assertion={a} sources={result.sources} />
                </article>
              ))}
              {result.connections.length > 0 && (
                <h3 className="font-serif text-2xl">
                  Connections worth following
                </h3>
              )}
              <div className="grid gap-5 lg:grid-cols-2">
                {result.connections.map((c, index) => (
                  <article
                    key={index}
                    className="min-w-0 rounded-xl border border-amber-800/40 bg-zinc-900/50 p-5"
                  >
                    <p className="text-xs tracking-wide text-amber-200 uppercase">
                      {EVIDENCE_CLASSES[c.evidenceClass]}
                    </p>
                    <h4 className="mt-2 font-serif text-2xl">{c.title}</h4>
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-amber-100">
                      {c.from.name}
                      <ArrowRight size={14} />
                      {PREDICATES[c.predicate]}
                      <ArrowRight size={14} />
                      {c.to.name}
                    </p>
                    <p className="mt-4 leading-7 whitespace-pre-wrap">
                      {c.explanation}
                    </p>
                    <dl className="mt-4 space-y-3 text-sm text-zinc-400">
                      <div>
                        <dt className="text-zinc-200">
                          What is {c.from.name}?
                        </dt>
                        <dd className="mt-1">{c.from.definition}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-200">What is {c.to.name}?</dt>
                        <dd className="mt-1">{c.to.definition}</dd>
                      </div>
                    </dl>
                    <Evidence assertion={c} sources={result.sources} />
                    <p className="mt-4 text-sm leading-6 text-zinc-400">
                      <span className="text-zinc-200">
                        Context and limits:{" "}
                      </span>
                      {c.context}
                    </p>
                    <button
                      className={`${buttonClass} mt-4 w-full text-left`}
                      disabled={loading || !canResearch}
                      onClick={() => void research(c.nextQuestion, run.id)}
                    >
                      {c.nextQuestion}
                      <span className="text-xs">{costLabel}</span>
                      <ArrowRight size={16} className="shrink-0" />
                    </button>
                    <div className="mt-3">
                      {saved[index] ? (
                        <Link
                          className={buttonClass}
                          href={`/journal/research/${saved[index]}`}
                        >
                          Saved · Open in Journal
                        </Link>
                      ) : (
                        <button
                          className={buttonClass}
                          disabled={saving !== null}
                          onClick={() => void save(index)}
                        >
                          <BookmarkPlus size={16} />
                          {saving === index
                            ? "Saving…"
                            : "Save to Journal"}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {isAdmin
                        ? "Saved in Journal → Research as a private draft. Only publishing adds it to the shared map."
                        : "Saved in Journal → Research, under your starting question. Your sources and notes stay private."}
                    </p>
                  </article>
                ))}
              </div>
              {result.gaps.length > 0 && (
                <aside className="rounded-xl border border-zinc-700 p-5">
                  <h3 className="font-serif text-xl">What remains uncertain</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-300">
                    {result.gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </aside>
              )}
              <div className="space-y-3">
                {result.nextQuestions.map((q) => (
                  <button
                    key={q.question}
                    className="block w-full rounded-xl border border-zinc-700 p-4 text-left hover:border-amber-400 disabled:opacity-50"
                    disabled={loading || !canResearch}
                    onClick={() => void research(q.question, run.id)}
                  >
                    <span className="text-amber-200">{q.question}</span>
                    <span className="mt-1 block text-xs text-amber-200">
                      Investigate · {costLabel}
                    </span>
                    <span className="mt-1 block text-sm text-zinc-400">
                      {q.reason}
                    </span>
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void research(followup, run.id);
                }}
                className="space-y-3"
              >
                <label
                  htmlFor="discovery-followup"
                  className="block font-serif text-xl"
                >
                  Have a hunch or another question?
                </label>
                <p className="text-sm text-zinc-400">
                  You can ask about something you remember hearing. The next
                  search will look for evidence and keep this question’s
                  context.
                </p>
                <textarea
                  id="discovery-followup"
                  className={inputClass}
                  value={followup}
                  maxLength={2000}
                  onChange={(e) => setFollowup(e.target.value)}
                  placeholder="I’ve heard Jesus mentioned in relation to alchemy. Can you investigate that?"
                  disabled={loading}
                />
                <button
                  className={primaryClass}
                  disabled={
                    loading || !canResearch || followup.trim().length < 2
                  }
                >
                  Investigate this connection · {costLabel}
                  <ArrowRight size={16} />
                </button>
              </form>
              <details className="text-sm text-zinc-400">
                <summary className="cursor-pointer">
                  Sources consulted ({result.sources.length})
                </summary>
                <ul className="mt-3 space-y-2">
                  {result.sources.map((source) => (
                    <li key={source.id}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-200 underline"
                      >
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
              <details className="text-sm text-zinc-400">
                <summary className="cursor-pointer">
                  Where this research looked
                </summary>
                <ol className="mt-3 list-decimal space-y-2 pl-5">
                  {result.searched.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </details>
            </>
          )}
        </section>
      )}
      {history.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-zinc-400">
            Your recent research
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h.id}
                className={buttonClass}
                disabled={loading}
                onClick={() => void loadRun(h.id)}
              >
                {h.question}
                {h.status !== "complete" ? ` (${h.status})` : ""}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
