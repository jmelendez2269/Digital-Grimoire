"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import RitualMarkdown from "@/components/working/RitualMarkdown";
import type { WorkingConditions } from "@/lib/working/conditions";

type PublicWorking = {
  id: string;
  intent_text: string;
  ritual: string;
  status: string;
  cast_at: string | null;
  conditions: WorkingConditions | null;
  shared_at: string;
  created_at: string;
};

function ConditionsBadge({ conditions }: { conditions: WorkingConditions }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
      <span>{conditions.moon_phase_emoji} {conditions.moon_phase}</span>
      <span className="text-zinc-700">·</span>
      <span>{conditions.day_ruler_planet} {conditions.day_ruler}</span>
      <span className="text-zinc-700">·</span>
      <span>{conditions.season}</span>
      <span className="text-zinc-700">·</span>
      <span className="text-xs font-mono text-zinc-500">{conditions.cast_date}</span>
    </div>
  );
}

export default function PublicWorkingPage() {
  const { id } = useParams<{ id: string }>();
  const [working, setWorking] = useState<PublicWorking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/working/community/${id}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.json();
      })
      .then((data) => {
        if (data?.working) setWorking(data.working);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600 px-4 py-16 justify-center">
        <Loader2 size={14} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (notFound || !working) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <p className="text-zinc-500 mb-4">Working not found or not shared.</p>
        <Link href="/explore/workings" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Shared workings
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link
        href="/explore/workings"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-8 font-mono uppercase tracking-wider"
      >
        <ArrowLeft size={12} />
        Shared Workings
      </Link>

      <div className="mb-8">
        <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">Intention</p>
        <h1 className="text-xl font-bold text-zinc-100 leading-snug">{working.intent_text}</h1>
        {working.conditions && (
          <div className="mt-3">
            <ConditionsBadge conditions={working.conditions} />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-5">
          <span className="text-xs font-mono text-amber-500/50 uppercase tracking-widest">The ritual</span>
        </div>
        <RitualMarkdown content={working.ritual} />
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-900 flex items-center justify-between">
        <p className="text-xs text-zinc-700 font-mono">
          Shared {new Date(working.shared_at).toLocaleDateString()}
        </p>
        <Link
          href="/workbench/the-working"
          className="text-xs text-amber-400/60 hover:text-amber-400 transition-colors font-mono"
        >
          Create your own working →
        </Link>
      </div>
    </div>
  );
}
