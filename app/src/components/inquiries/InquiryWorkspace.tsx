"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, BookOpen, Download, Plus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import {
  exportInquiry,
  publicFinding,
  reviewProblems,
  type Capture,
  type Finding,
  type Inquiry,
  type KnowledgeEntity,
} from "@/lib/inquiries/model";
import {
  Field,
  inputClass,
  primaryClass,
  buttonClass,
  inquiryRequest,
} from "./shared";
import FindingEditor from "./FindingEditor";
import EvidenceCard from "./EvidenceCard";

const ALCHEMY_SOURCE: Capture = {
  title: "Why does Christ appear in an alchemical manuscript?",
  source_kind: "external",
  source_title:
    "University of Glasgow — Rosarium Philosophorum, MS Ferguson 210",
  source_url:
    "https://www.gla.ac.uk/myglasgow/library/files/special/exhibns/month/april2009.html",
  source_locator:
    "Illustration 20, The Resurrection; 18th-century English manuscript copy",
  note: "Research lead: inspect the manuscript image and the library commentary. Record what each supports before adding a connection.",
};
export default function InquiryWorkspace({
  id,
  embedded = false,
  searchQuery = "",
}: {
  id?: string;
  embedded?: boolean;
  searchQuery?: string;
}) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<Inquiry[]>([]);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [entities, setEntities] = useState<KnowledgeEntity[]>([]);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [editor, setEditor] = useState<Finding | "new" | null>(null);
  const [seed, setSeed] = useState<Capture | undefined>();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState<number | null>(null);
  const load = useCallback(async () => {
    setError("");
    if (id) {
      const data = await inquiryRequest<{
        inquiry: Inquiry;
        findings: Finding[];
        entities: KnowledgeEntity[];
      }>(`/api/inquiries/${id}`);
      setInquiry(data.inquiry);
      setFindings(data.findings);
      setEntities(data.entities);
      localStorage.setItem("prismarium:active-inquiry", id);
    } else {
      const data = await inquiryRequest<{ inquiries: Inquiry[] }>(
        "/api/inquiries"
      );
      setList(data.inquiries);
    }
  }, [id]);
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, load]);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to complete this action."
      );
    } finally {
      setBusy(false);
    }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    await action(async () => {
      const data = await inquiryRequest<{ inquiry: Inquiry }>(
        "/api/inquiries",
        "POST",
        { title, question }
      );
      router.push(`/journal/research/${data.inquiry.id}`);
    });
  }
  async function transition(finding: Finding, state: string) {
    await action(async () => {
      await inquiryRequest(
        `/api/inquiries/${id}/findings/${finding.id}`,
        "PATCH",
        {
          action: state,
          revision: finding.revision,
          checked: checked[finding.id] === true,
        }
      );
      await load();
      setChecked({});
      setNotice(
        state === "publish"
          ? "Connection published to the shared concept map."
          : state === "draft"
            ? "Returned to draft. This connection is no longer on the shared map."
            : "Finding updated."
      );
    });
  }
  function download() {
    if (!inquiry) return;
    const blob = new Blob([exportInquiry(inquiry, findings, entities)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${inquiry.title.replace(/[^a-z0-9 -]/gi, "").trim() || "inquiry"}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const currentStep = step === null ? null : findings[step];
  const matchingInquiries = list.filter((item) =>
    `${item.title} ${item.question}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase())
  );
  const Content = embedded ? "section" : "main";
  return (
    <div
      className={`${embedded ? "" : "min-h-screen bg-zinc-950"} text-zinc-100`}
    >
      {!embedded && step === null && <Header />}
      <Content
        className={
          embedded
            ? "space-y-7"
            : "mx-auto max-w-5xl space-y-7 px-4 py-10 md:px-8"
        }
      >
        {authLoading ? (
          <p role="status">Loading your workspace…</p>
        ) : !user ? (
          <section className="space-y-4">
            <h2 className="font-serif text-3xl">Saved research</h2>
            <p>Sign in to open the research saved in your Journal.</p>
            <Link
              className={buttonClass}
              href={user ? "/graph?type=research" : "/login"}
            >
              {user ? "Explore the shared map" : "Sign in"}
            </Link>
          </section>
        ) : (
          <>
            {!embedded && step === null && (
              <nav
                className="flex flex-wrap gap-4 text-sm text-amber-200"
                aria-label="Research navigation"
              >
                <Link href="/journal">Journal</Link>
                <Link href="/journal?tab=research">Research</Link>
                <Link href="/graph?type=research">Shared concept map</Link>
                <Link href="/graph?type=correspondences">Correspondences</Link>
              </nav>
            )}
            {error && (
              <div
                role="alert"
                className="space-y-3 rounded-lg border border-red-400/30 p-4 text-red-200"
              >
                <p>{error}</p>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => void action(load)}
                >
                  Reload
                </button>
              </div>
            )}
            {notice && (
              <p role="status" className="text-teal-200">
                {notice}
              </p>
            )}
            {loading ? (
              <p role="status">Loading saved research…</p>
            ) : !id ? (
              <>
                <header>
                  <h2 className="font-serif text-3xl">Saved research</h2>
                  <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                    Connections, sources, and notes, grouped by the question
                    that started your research.{" "}
                    {isAdmin
                      ? "Your notes stay private; you choose which findings to publish."
                      : "Everything you save here stays private."}
                  </p>
                </header>
                <Link className={primaryClass} href="/search">
                  Ask a question and discover connections
                </Link>
                <p className="text-sm text-zinc-400">
                  Choose “Save to Journal” on a discovery to keep its
                  explanation and supporting sources here. Saving and adding
                  notes are free.
                </p>
                <section
                  className="space-y-3"
                  aria-label="Saved research questions"
                >
                  {matchingInquiries.length === 0 ? (
                    <p className="text-zinc-400">
                      {list.length
                        ? "No saved questions match your search."
                        : "Your saved connections will appear here under their starting question."}
                    </p>
                  ) : (
                    matchingInquiries.map((item) => (
                      <Link
                        key={item.id}
                        href={`/journal/research/${item.id}`}
                        className="block rounded-xl border border-zinc-700 p-5 transition-colors hover:border-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        <h3 className="text-lg text-amber-100">{item.title}</h3>
                        <p className="mt-2 text-sm text-zinc-400">
                          {item.question}
                        </p>
                      </Link>
                    ))
                  )}
                </section>
                <details className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-6">
                  <summary className="cursor-pointer text-amber-200">
                    Start a research notebook manually
                  </summary>
                  <form onSubmit={create} className="mt-5 space-y-4">
                    <h3 className="font-serif text-2xl">
                      New research notebook
                    </h3>
                    <Field label="Title">
                      <input
                        required
                        maxLength={180}
                        className={inputClass}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="WTF is Alchemy?"
                      />
                    </Field>
                    <Field label="Starting question">
                      <textarea
                        maxLength={4000}
                        className={inputClass}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        rows={2}
                        placeholder="What were alchemists trying to transform?"
                      />
                    </Field>
                    <div className="flex flex-wrap gap-3">
                      <button className={primaryClass} disabled={busy}>
                        <Plus size={16} aria-hidden="true" />
                        Create notebook
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => {
                          setTitle("WTF is Alchemy?");
                          setQuestion(
                            "What were alchemists trying to transform, and why does Christian imagery appear in some alchemical works?"
                          );
                        }}
                      >
                        Use the Alchemy starting question
                      </button>
                    </div>
                  </form>
                </details>
              </>
            ) : (
              inquiry && (
                <>
                  {step !== null ? (
                    <section className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-amber-200">
                          {inquiry.title} · Finding {step + 1} of{" "}
                          {findings.length}
                        </p>
                        <button
                          className={buttonClass}
                          onClick={() => setStep(null)}
                        >
                          Exit replay
                        </button>
                      </div>
                      {currentStep && (
                        <article className="rounded-2xl border border-zinc-700 p-6 md:p-10">
                          <p className="mb-4 text-sm text-zinc-400">
                            {currentStep.status === "published"
                              ? "Published connection"
                              : `${currentStep.status} · research in progress`}
                          </p>
                          <EvidenceCard
                            finding={publicFinding(currentStep)}
                            entities={entities}
                          />
                        </article>
                      )}
                      <div className="flex justify-between gap-3">
                        <button
                          className={buttonClass}
                          disabled={step === 0}
                          onClick={() => setStep(step - 1)}
                        >
                          Previous finding
                        </button>
                        <button
                          className={primaryClass}
                          disabled={step >= findings.length - 1}
                          onClick={() => setStep(step + 1)}
                        >
                          Next finding
                        </button>
                      </div>
                    </section>
                  ) : (
                    <>
                      <header>
                        <p className="mb-3 text-xs tracking-[0.2em] text-amber-200 uppercase">
                          Journal · Private research
                        </p>
                        <h1 className="font-serif text-3xl md:text-4xl">
                          {inquiry.title}
                        </h1>
                        <p className="mt-4 leading-7 whitespace-pre-wrap text-zinc-300">
                          {inquiry.question}
                        </p>
                      </header>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          className={buttonClass}
                          href={`/search?q=${encodeURIComponent(inquiry.question || inquiry.title)}`}
                        >
                          Search the Library
                        </Link>
                        <Link
                          className={buttonClass}
                          href={`/seven-lenses?query=${encodeURIComponent(inquiry.question || inquiry.title)}`}
                        >
                          Ask Seven Lenses
                        </Link>
                        <button
                          className={buttonClass}
                          disabled={!findings.length}
                          onClick={() => setStep(0)}
                        >
                          Replay discovery trail
                        </button>
                        <button className={buttonClass} onClick={download}>
                          <Download size={16} aria-hidden="true" />
                          Export notes
                        </button>
                      </div>
                      {editingNotes ? (
                        <form
                          className="space-y-4 rounded-xl border border-zinc-700 p-5"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void action(async () => {
                              const data = await inquiryRequest<{
                                inquiry: Inquiry;
                              }>(`/api/inquiries/${id}`, "PATCH", {
                                title,
                                question,
                                notes,
                                revision: inquiry.revision,
                              });
                              setInquiry(data.inquiry);
                              setEditingNotes(false);
                              setNotice(
                                "Research notes saved in your Journal."
                              );
                            });
                          }}
                        >
                          <Field label="Research title">
                            <input
                              required
                              className={inputClass}
                              value={title}
                              maxLength={180}
                              onChange={(e) => setTitle(e.target.value)}
                            />
                          </Field>
                          <Field label="Question">
                            <textarea
                              className={inputClass}
                              value={question}
                              maxLength={4000}
                              onChange={(e) => setQuestion(e.target.value)}
                            />
                          </Field>
                          <Field label="Private research notes">
                            <textarea
                              className={inputClass}
                              rows={7}
                              maxLength={30000}
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </Field>
                          <button className={primaryClass} disabled={busy}>
                            Save research notes
                          </button>{" "}
                          <button
                            type="button"
                            className={buttonClass}
                            onClick={() => setEditingNotes(false)}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <section className="space-y-3 rounded-xl border border-zinc-800 p-5">
                          <h2 className="font-serif text-xl">
                            My notes and open questions
                          </h2>
                          <p className="text-sm leading-7 whitespace-pre-wrap text-zinc-400">
                            {inquiry.notes ||
                              "What surprised you? What would you like to investigate next?"}
                          </p>
                          <button
                            className={buttonClass}
                            onClick={() => {
                              setTitle(inquiry.title);
                              setQuestion(inquiry.question);
                              setNotes(inquiry.notes);
                              setEditingNotes(true);
                            }}
                          >
                            Edit research notes
                          </button>
                        </section>
                      )}
                      {!editingNotes &&
                        (editor ? (
                          <FindingEditor
                            key={editor === "new" ? "new" : editor.id}
                            inquiryId={id}
                            finding={editor === "new" ? undefined : editor}
                            seed={seed}
                            entities={entities}
                            onCancel={() => setEditor(null)}
                            onSaved={() => {
                              setEditor(null);
                              void action(async () => {
                                await load();
                                setNotice("Draft saved.");
                              });
                            }}
                          />
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <h2 className="font-serif text-2xl">
                                Discovery trail{" "}
                                <span className="text-base text-zinc-400">
                                  ({findings.length})
                                </span>
                              </h2>
                              <button
                                className={primaryClass}
                                onClick={() => {
                                  setSeed(undefined);
                                  setEditor("new");
                                }}
                              >
                                <Plus size={16} aria-hidden="true" />
                                Add finding
                              </button>
                            </div>
                            {!findings.length && (
                              <section className="space-y-4 rounded-xl border border-dashed border-zinc-600 p-6">
                                <BookOpen
                                  className="text-amber-200"
                                  aria-hidden="true"
                                />
                                <p className="text-zinc-300">
                                  Save a passage from the Library, or add a
                                  source you found elsewhere.
                                </p>
                                {/alchem/i.test(inquiry.title) && (
                                  <button
                                    className={buttonClass}
                                    onClick={() => {
                                      setSeed(ALCHEMY_SOURCE);
                                      setEditor("new");
                                    }}
                                  >
                                    Investigate the Rosarium manuscript
                                  </button>
                                )}
                              </section>
                            )}
                            {findings.map((finding, index) => (
                              <article
                                key={finding.id}
                                className="space-y-5 rounded-2xl border border-zinc-700 bg-zinc-900/40 p-5 md:p-7"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs tracking-wide text-zinc-400 uppercase">
                                    Finding {index + 1} · {finding.status}
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      disabled={busy || index === 0}
                                      aria-label={`Move finding ${index + 1} up`}
                                      className={buttonClass}
                                      onClick={() =>
                                        void transition(finding, "up")
                                      }
                                    >
                                      <ArrowUp size={16} />
                                    </button>
                                    <button
                                      disabled={
                                        busy || index === findings.length - 1
                                      }
                                      aria-label={`Move finding ${index + 1} down`}
                                      className={buttonClass}
                                      onClick={() =>
                                        void transition(finding, "down")
                                      }
                                    >
                                      <ArrowDown size={16} />
                                    </button>
                                  </div>
                                </div>
                                <EvidenceCard
                                  finding={publicFinding(finding)}
                                  entities={entities}
                                />
                                {finding.note && (
                                  <details className="text-sm text-zinc-400">
                                    <summary className="min-h-11 cursor-pointer py-2">
                                      My private notes
                                    </summary>
                                    <p className="leading-7 whitespace-pre-wrap">
                                      {finding.note}
                                    </p>
                                  </details>
                                )}
                                {finding.status === "draft" && (
                                  <>
                                    <button
                                      disabled={busy}
                                      className={buttonClass}
                                      onClick={() => {
                                        setSeed(undefined);
                                        setEditor(finding);
                                      }}
                                    >
                                      Edit finding and connection
                                    </button>
                                    {isAdmin &&
                                      (reviewProblems(finding).length ? (
                                        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
                                          {reviewProblems(finding).map(
                                            (problem) => (
                                              <li key={problem}>{problem}</li>
                                            )
                                          )}
                                        </ul>
                                      ) : (
                                        <div className="space-y-3">
                                          <label className="flex min-h-11 items-center gap-3 text-sm">
                                            <input
                                              type="checkbox"
                                              className="h-5 w-5 accent-amber-300"
                                              checked={
                                                checked[finding.id] || false
                                              }
                                              onChange={(e) =>
                                                setChecked((previous) => ({
                                                  ...previous,
                                                  [finding.id]:
                                                    e.target.checked,
                                                }))
                                              }
                                            />
                                            I checked the source, the
                                            connection, and its context.
                                          </label>
                                          <button
                                            className={buttonClass}
                                            disabled={
                                              busy || !checked[finding.id]
                                            }
                                            onClick={() =>
                                              void transition(finding, "review")
                                            }
                                          >
                                            Mark reviewed
                                          </button>
                                        </div>
                                      ))}
                                  </>
                                )}
                                {isAdmin && finding.status === "reviewed" && (
                                  <div className="space-y-3">
                                    <p className="text-sm text-zinc-400">
                                      Publishing shares the claim, source,
                                      context, and connected entries. Your
                                      private notes stay in your Journal.
                                    </p>
                                    <button
                                      disabled={busy}
                                      className={primaryClass}
                                      onClick={() =>
                                        void transition(finding, "publish")
                                      }
                                    >
                                      Publish connection
                                    </button>
                                  </div>
                                )}
                                {isAdmin && finding.status !== "draft" && (
                                  <button
                                    disabled={busy}
                                    className={buttonClass}
                                    onClick={() =>
                                      void transition(finding, "draft")
                                    }
                                  >
                                    {finding.status === "published"
                                      ? "Unpublish and return to draft"
                                      : "Return to draft"}
                                  </button>
                                )}
                              </article>
                            ))}
                          </>
                        ))}
                    </>
                  )}
                </>
              )
            )}
          </>
        )}
      </Content>
      {!embedded && step === null && <Footer />}
    </div>
  );
}
