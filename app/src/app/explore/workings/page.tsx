"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import type { WorkingConditions } from "@/lib/working/conditions";

type SharedWorking = {
  id: string;
  intent_text: string;
  status: string;
  cast_at: string | null;
  conditions: WorkingConditions | null;
  shared_at: string;
  ritual: string;
  created_at: string;
};

function ConditionsLine({ conditions }: { conditions: WorkingConditions }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
      <span>{conditions.moon_phase_emoji} {conditions.moon_phase}</span>
      <span className="text-zinc-700">·</span>
      <span>{conditions.day_ruler_planet} {conditions.day_ruler}</span>
      <span className="text-zinc-700">·</span>
      <span>{conditions.season}</span>
      <span className="text-zinc-700">·</span>
      <span className="font-mono">{conditions.cast_date}</span>
    </span>
  );
}

function RitualPreview({ text }: { text: string }) {
  // Strip markdown headings/symbols for a clean prose preview
  const preview = text
    .replace(/^#+\s+.*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim()
    .slice(0, 220);
  return (
    <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3">
      {preview}…
    </p>
  );
}

export default function CommunityWorkingsPage() {
  const [workings, setWorkings] = useState<SharedWorking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/working/community")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWorkings(data.workings ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="mb-10">
        <p className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest mb-3">Community</p>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Shared Workings</h1>
        <p className="text-sm text-zinc-500 max-w-xl leading-relaxed">
          Practitioners who have cast and shared their workings. Each record is a live experiment —
          an intention stated, a ritual synthesized, conditions stamped at the moment of casting.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-600 py-8">
          <Loader2 size={13} className="animate-spin" />
          Loading…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 py-8">{error}</p>
      )}

      {!loading && !error && workings.length === 0 && (
        <p className="text-sm text-zinc-600 py-8">
          No shared workings yet. Cast and share your own from{" "}
          <Link href="/workbench/the-working" className="text-amber-400/70 hover:text-amber-400 transition-colors">
            The Working
          </Link>
          .
        </p>
      )}

      <div className="space-y-4">
        {workings.map((w) => (
          <Link
            key={w.id}
            href={`/explore/workings/${w.id}`}
            className="group block rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-5 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <p className="text-base font-medium text-zinc-100 group-hover:text-white leading-snug">
                {w.intent_text}
              </p>
              <ArrowRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-1" />
            </div>

            {w.conditions && <ConditionsLine conditions={w.conditions} />}

            <div className="mt-3">
              <RitualPreview text={w.ritual} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
