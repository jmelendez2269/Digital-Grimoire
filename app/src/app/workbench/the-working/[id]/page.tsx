"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, CalendarCheck, BookOpen,
  Pencil, Check, X, LockKeyhole,
} from "lucide-react";
import RitualMarkdown from "@/components/working/RitualMarkdown";
import PalettePanel from "@/components/working/PalettePanel";
import type { AssembledPalette } from "@/lib/working/assemble";
import type { WorkingConditions } from "@/lib/working/conditions";

type WorkingRecord = {
  id: string;
  intent_text: string;
  ritual: string;
  palette: AssembledPalette;
  model_used: string;
  status: "draft" | "cast" | "shared";
  cast_at: string | null;
  conditions: WorkingConditions | null;
  shared_at: string | null;
  created_at: string;
  updated_at: string;
};

function ConditionsBadge({ conditions }: { conditions: WorkingConditions }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
      <span className="flex items-center gap-1.5">
        <span className="text-base leading-none">{conditions.moon_phase_emoji}</span>
        {conditions.moon_phase}
      </span>
      <span className="text-zinc-700">·</span>
      <span>{conditions.day_ruler_planet} {conditions.day_ruler}</span>
      <span className="text-zinc-700">·</span>
      <span>{conditions.season}</span>
      <span className="text-zinc-700">·</span>
      <span className="text-zinc-500 text-xs font-mono">{conditions.cast_date}</span>
    </div>
  );
}

export default function WorkingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [working, setWorking] = useState<WorkingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [casting, setCasting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/working/${id}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.json();
      })
      .then((data) => {
        if (data?.working) setWorking(data.working);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCast() {
    if (!working || casting) return;
    setCasting(true);
    setCastError(null);
    try {
      const res = await fetch(`/api/working/${working.id}/cast`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cast failed");
      setWorking((w) => w ? { ...w, ...data.working } : w);
    } catch (err: unknown) {
      setCastError(err instanceof Error ? err.message : "Cast failed");
    } finally {
      setCasting(false);
    }
  }

  async function handleEditSave() {
    if (!working || saving || !editText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/working/${working.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent_text: editText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setWorking((w) => w ? { ...w, intent_text: data.working.intent_text } : w);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600 px-4 py-16 justify-center">
        <Loader2 size={14} className="animate-spin" />
        Loading working…
      </div>
    );
  }

  if (notFound || !working) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <p className="text-zinc-500 mb-4">Working not found.</p>
        <Link href="/workbench/the-working" className="text-sm text-amber-400 hover:text-amber-300">
          ← Back to The Working
        </Link>
      </div>
    );
  }

  const isCast = !!working.cast_at;

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Back */}
      <Link
        href="/workbench/the-working"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-8 font-mono uppercase tracking-wider"
      >
        <ArrowLeft size={12} />
        The Working
      </Link>

      {/* Status + conditions */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border ${
            isCast
              ? "text-amber-400 border-amber-500/20 bg-amber-500/5"
              : "text-zinc-500 border-zinc-700 bg-zinc-900"
          }`}
        >
          {isCast ? "cast" : "draft"}
        </span>
        {isCast && working.conditions && (
          <ConditionsBadge conditions={working.conditions} />
        )}
      </div>

      {/* Intention (editable) */}
      <div className="mb-8">
        <div className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-2">Intention</div>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              autoFocus
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 p-3 text-sm leading-relaxed resize-none focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditSave}
                disabled={saving || !editText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-xs transition-colors"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs transition-colors"
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="group flex items-start gap-3">
            <p className="text-lg font-medium text-zinc-100 leading-snug flex-1">
              {working.intent_text}
            </p>
            <button
              onClick={() => { setEditText(working.intent_text); setEditing(true); }}
              className="mt-1 text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Ritual */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 mb-5">
        <div className="mb-5">
          <span className="text-xs font-mono text-amber-500/50 uppercase tracking-widest">The ritual</span>
        </div>
        <RitualMarkdown content={working.ritual} />
      </div>

      {/* Palette */}
      <PalettePanel palette={working.palette} />

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {!isCast && (
            <button
              onClick={handleCast}
              disabled={casting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
            >
              {casting ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
              Mark as cast
            </button>
          )}

          <Link
            href="/journal/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm transition-colors"
          >
            <BookOpen size={14} />
            New journal entry
          </Link>
        </div>

        {castError && <p className="text-sm text-red-400">{castError}</p>}
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <LockKeyhole size={13} className="text-emerald-400" aria-hidden="true" />
          This working stays private to your account.
        </p>
      </div>

      <div className="mt-10 pt-6 border-t border-zinc-900 text-xs text-zinc-700 font-mono">
        Created {new Date(working.created_at).toLocaleString()}
        {working.model_used && <> · {working.model_used}</>}
      </div>
    </div>
  );
}
