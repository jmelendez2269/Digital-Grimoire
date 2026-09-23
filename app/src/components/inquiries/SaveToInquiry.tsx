"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { BookmarkPlus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Capture, Inquiry } from "@/lib/inquiries/model";
import {
  Field,
  inputClass,
  buttonClass,
  primaryClass,
  inquiryRequest,
} from "./shared";

export default function SaveToInquiry({
  capture,
  label = "Save to Journal",
}: {
  capture: Capture;
  label?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selected, setSelected] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setSaved(null);
    inquiryRequest<{ inquiries: Inquiry[] }>(
      "/api/inquiries",
      "GET",
      undefined,
      abort.signal
    )
      .then((data) => {
        setInquiries(data.inquiries);
        const last = localStorage.getItem("prismarium:active-inquiry");
        setSelected(
          data.inquiries.some((i) => i.id === last)
            ? last!
            : data.inquiries[0]?.id || ""
        );
      })
      .catch((err) => {
        if (!abort.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [open]);
  if (!user) return null;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let id = selected;
      if (!id) {
        const created = await inquiryRequest<{ inquiry: Inquiry }>(
          "/api/inquiries",
          "POST",
          { title, question: capture.provenance?.query || "" }
        );
        id = created.inquiry.id;
        setSelected(id);
        setInquiries((previous) => [created.inquiry, ...previous]);
      }
      await inquiryRequest(`/api/inquiries/${id}/findings`, "POST", {
        ...capture,
        title: capture.title.slice(0, 180),
        note: [capture.note, note].filter(Boolean).join("\n\n"),
      });
      localStorage.setItem("prismarium:active-inquiry", id);
      setSaved(id);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) setOpen(value);
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className={buttonClass}>
          <BookmarkPlus size={16} aria-hidden="true" />
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/75" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[101] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-zinc-100 shadow-2xl">
          <Dialog.Title className="pr-10 font-serif text-2xl">
            Save to Journal
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-400">
            Keep this source and your notes in Journal → Research. Choose a
            research notebook or start a new one. Saved findings stay private.
          </Dialog.Description>
          <Dialog.Close asChild>
            <button
              disabled={busy}
              aria-label="Close"
              className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <X />
            </button>
          </Dialog.Close>
          {saved ? (
            <div className="mt-6 space-y-4" role="status">
              <p>Finding saved in Journal → Research.</p>
              <Link className={primaryClass} href={`/journal/research/${saved}`}>
                Open in Journal
              </Link>
            </div>
          ) : (
            <form onSubmit={save} className="mt-6 space-y-4">
              <p className="rounded-lg border border-zinc-700 p-3 text-sm">
                {capture.title}
              </p>
              <Field label="Research notebook">
                <select
                  className={inputClass}
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={loading || busy}
                >
                  <option value="">Create a new research notebook</option>
                  {inquiries.map((i) => (
                    <option value={i.id} key={i.id}>
                      {i.title}
                    </option>
                  ))}
                </select>
              </Field>
              {!selected && (
                <Field label="New notebook title">
                  <input
                    required
                    maxLength={180}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder="WTF is Alchemy?"
                  />
                </Field>
              )}
              <Field label="What caught your attention? (optional)">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={10000}
                  className={inputClass}
                />
              </Field>
              <button
                disabled={busy || loading || (!selected && !title.trim())}
                className={primaryClass}
              >
                {busy ? "Saving…" : "Save finding"}
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
