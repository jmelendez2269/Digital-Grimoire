"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  FlaskConical, Loader2, Sparkles, CalendarCheck,
  BookMarked, RotateCcw, ArrowRight, Check,
} from "lucide-react";
import RitualMarkdown from "@/components/working/RitualMarkdown";
import PalettePanel from "@/components/working/PalettePanel";
import type { AssembledPalette } from "@/lib/working/assemble";
import type { WorkingConditions } from "@/lib/working/conditions";

type GenerateResult = {
  id: string;
  createdAt: string;
  palette: AssembledPalette;
  ritual: string;
  modelUsed: string;
  interpretation?: string;
  replayed: boolean;
  chargedCredits: number;
};

type WorkingListItem = {
  id: string;
  intent_text: string;
  model_used: string;
  status: "draft" | "cast" | "shared";
  cast_at: string | null;
  conditions: WorkingConditions | null;
  created_at: string;
};

type Stage = "idle" | "loading" | "result" | "casting" | "saved";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function WorkingRow({ w }: { w: WorkingListItem }) {
  const hasCast = !!w.cast_at;
  const isShared = w.status === "shared";
  return (
    <Link
      href={`/workbench/the-working/${w.id}`}
      className="group flex items-start gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
          {w.intent_text}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {hasCast && w.conditions ? (
            <>
              <span>{w.conditions.moon_phase_emoji} {w.conditions.moon_phase}</span>
              <span className="text-zinc-700">·</span>
              <span>{w.conditions.day_ruler_planet} {w.conditions.day_ruler}</span>
              <span className="text-zinc-700">·</span>
              <span>{w.conditions.season}</span>
            </>
          ) : (
            <span>{new Date(w.created_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2 mt-0.5">
        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
            isShared
              ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
              : hasCast
              ? "text-amber-400 border-amber-500/20 bg-amber-500/5"
              : "text-zinc-500 border-zinc-700 bg-zinc-900"
          }`}
        >
          {w.status}
        </span>
        <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
      </div>
    </Link>
  );
}

export default function TheWorkingPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [intention, setIntention] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workings, setWorkings] = useState<WorkingListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const requestIdRef = useRef<string | null>(null);

  const loadWorkings = useCallback(async () => {
    try {
      const res = await fetch("/api/working");
      if (res.ok) {
        const data = await res.json();
        setWorkings(data.workings ?? []);
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadWorkings(); }, [loadWorkings]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!intention.trim() || stage === "loading") return;
    setStage("loading");
    setError(null);
    setResult(null);
    setSavedId(null);
    try {
      const requestId = requestIdRef.current ?? crypto.randomUUID();
      requestIdRef.current = requestId;
      const res = await fetch("/api/working/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intention: intention.trim(), requestId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "METERING_SETTLEMENT_FAILED") {
          loadWorkings();
        }
        if (
          data.code !== "METERING_REQUEST_IN_PROGRESS" &&
          data.code !== "METERING_SETTLEMENT_FAILED"
        ) {
          requestIdRef.current = null;
        }
        throw new Error(data.error || "Generation failed");
      }
      requestIdRef.current = null;
      setResult(data);
      setSavedId(data.id);
      setStage("result");
      loadWorkings();
    } catch (err: unknown) {
      setError(errorMessage(err, "Generation failed"));
      setStage("idle");
    }
  }

  async function handleCast() {
    if (!result || !savedId || stage === "casting") return;
    setStage("casting");
    setError(null);
    try {
      const castRes = await fetch(`/api/working/${savedId}/cast`, {
        method: "POST",
      });
      if (!castRes.ok) {
        const castData = await castRes.json();
        throw new Error(castData.error || "Cast failed");
      }
      setStage("saved");
      loadWorkings();
    } catch (err: unknown) {
      setError(errorMessage(err, "Cast failed"));
      setStage("result");
    }
  }

  function handleReset() {
    setStage("idle");
    setResult(null);
    setSavedId(null);
    setError(null);
    requestIdRef.current = null;
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-2">
          <FlaskConical size={18} className="text-amber-500/70" />
          <h1 className="text-xl font-bold text-zinc-100">The Working</h1>
        </div>
        <p className="text-sm text-zinc-500 max-w-xl leading-relaxed">
          State an intention. The Working assembles a correspondence palette from the
          Knowledge Graph and synthesizes a ritual. Cast it, record it, watch what unfolds.
        </p>
      </div>

      {/* Generator */}
      <div className="mb-14">
        {(stage === "idle" || stage === "loading") && (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label
                htmlFor="intention"
                className="block text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2"
              >
                Your intention
              </label>
              <textarea
                id="intention"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="e.g. attract prosperity · open to love · clarity before a decision"
                rows={3}
                disabled={stage === "loading"}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 p-4 text-sm leading-relaxed resize-none focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50 transition"
              />
            </div>

            <p id="working-credit-cost" className="text-xs text-zinc-500 leading-relaxed">
              Launch cost: <span className="font-medium text-zinc-300">1 Prism Credit</span>.
              Your credit is returned automatically if generation or saving fails.
            </p>

            {error && (
              <p role="alert" className="text-sm text-red-400 bg-red-900/10 border border-red-800/30 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            {stage === "loading" ? (
              <div className="flex items-center gap-3 py-2 text-sm text-zinc-400">
                <Loader2 size={15} className="animate-spin text-amber-500/60 shrink-0" />
                The Working is assembling your ritual — this takes about 20 seconds…
              </div>
            ) : (
              <button
                type="submit"
                disabled={!intention.trim()}
                aria-describedby="working-credit-cost"
                className="flex min-h-11 cursor-pointer items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
              >
                <Sparkles size={14} />
                Begin the working
              </button>
            )}
          </form>
        )}

        {(stage === "result" || stage === "casting") && result && (
          <div className="space-y-5">
            {result.interpretation && (
              <div className="text-xs text-zinc-500 font-mono bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 leading-relaxed">
                <span className="text-amber-500/50">Intent read as:</span> {result.interpretation}
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-5">
                <span className="text-xs font-mono text-amber-500/50 uppercase tracking-widest">
                  The ritual
                </span>
              </div>
              <RitualMarkdown content={result.ritual} />
            </div>

            <PalettePanel palette={result.palette} />

            <p className="text-xs text-zinc-500 leading-relaxed">
              Saved automatically as a private draft before the credit was settled.
            </p>

            <div className="flex items-center gap-3 flex-wrap pt-1">
              <button
                onClick={handleCast}
                disabled={stage === "casting"}
                className="flex min-h-11 cursor-pointer items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
              >
                {stage === "casting" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CalendarCheck size={14} />
                )}
                I cast this
              </button>

              <Link
                href={`/workbench/the-working/${savedId}`}
                className="flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm transition-colors"
              >
                <BookMarked size={14} />
                View saved draft
              </Link>

              <button
                onClick={handleReset}
                disabled={stage === "casting"}
                className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 font-medium text-sm transition-colors"
              >
                <RotateCcw size={13} />
                New working
              </button>

              {error && (
                <p role="alert" className="text-sm text-red-400 w-full">{error}</p>
              )}
            </div>
          </div>
        )}

        {stage === "saved" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2 mb-2 text-amber-400">
                <Check size={15} />
                <span className="text-sm font-semibold">Working recorded</span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Your ritual and its conditions have been saved. Watch what unfolds in the days after.
              </p>
              {savedId && (
                <Link
                  href={`/workbench/the-working/${savedId}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                >
                  View working record <ArrowRight size={12} />
                </Link>
              )}
            </div>

            <button
              onClick={handleReset}
              className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm transition-colors"
            >
              <RotateCcw size={13} />
              New working
            </button>
          </div>
        )}
      </div>

      {/* My Workings */}
      <div>
        <h2 className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">
          My workings
        </h2>

        {listLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-600 py-4">
            <Loader2 size={13} className="animate-spin" />
            Loading…
          </div>
        ) : workings.length === 0 ? (
          <p className="text-sm text-zinc-600 py-4">No workings yet. Begin one above.</p>
        ) : (
          <div className="space-y-2">
            {workings.map((w) => (
              <WorkingRow key={w.id} w={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
