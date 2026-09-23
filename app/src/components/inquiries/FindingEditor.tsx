"use client";
import { useState } from "react";
import {
  EVIDENCE_CLASSES,
  PREDICATES,
  findingInput,
  type Capture,
  type Finding,
  type FindingInput,
  type KnowledgeEntity,
} from "@/lib/inquiries/model";
import EntityPicker from "./EntityPicker";
import {
  Field,
  inputClass,
  primaryClass,
  buttonClass,
  inquiryRequest,
} from "./shared";
export default function FindingEditor({
  inquiryId,
  finding,
  seed,
  entities,
  onSaved,
  onCancel,
}: {
  inquiryId: string;
  finding?: Finding;
  seed?: Capture;
  entities: KnowledgeEntity[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FindingInput>(
    () =>
      finding ||
      findingInput.parse({
        title: "New finding",
        source_kind: "external",
        ...seed,
      })
  );
  const [source, setSource] = useState<KnowledgeEntity | null>(
    entities.find((e) => e.id === finding?.source_entity_id) || null
  );
  const [target, setTarget] = useState<KnowledgeEntity | null>(
    entities.find((e) => e.id === finding?.target_entity_id) || null
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof FindingInput>(key: K, value: FindingInput[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await inquiryRequest(
        `/api/inquiries/${inquiryId}/findings${finding ? `/${finding.id}` : ""}`,
        finding ? "PATCH" : "POST",
        {
          ...form,
          source_entity_id: source?.id || null,
          target_entity_id: target?.id || null,
          ...(finding ? { revision: finding.revision } : {}),
        }
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save finding.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="space-y-5 rounded-2xl border border-amber-300/30 bg-zinc-900 p-5 md:p-7"
    >
      <h2 className="font-serif text-2xl">
        {finding ? "Edit finding" : "Capture a finding"}
      </h2>
      <Field label="Finding title">
        <input
          autoFocus
          required
          maxLength={180}
          className={inputClass}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </Field>
      <Field label="Connection or claim">
        <textarea
          rows={3}
          maxLength={4000}
          className={inputClass}
          value={form.claim}
          onChange={(e) => set("claim", e.target.value)}
          placeholder="What does this source show about the connection?"
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <EntityPicker label="From" value={source} onChange={setSource} />
        <EntityPicker label="To" value={target} onChange={setTarget} />
      </div>
      <Field label="Relationship">
        <select
          className={inputClass}
          value={form.predicate}
          onChange={(e) =>
            set("predicate", e.target.value as FindingInput["predicate"])
          }
        >
          {Object.entries(PREDICATES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Source type">
          <select
            className={inputClass}
            value={form.source_kind}
            onChange={(e) =>
              set("source_kind", e.target.value as FindingInput["source_kind"])
            }
          >
            <option value="external">External source</option>
            <option value="library">Library passage</option>
            <option value="correspondence">Correspondence source</option>
            <option value="ai">AI research lead</option>
            <option value="note">Personal note</option>
          </select>
        </Field>
        <Field label="Evidence type">
          <select
            className={inputClass}
            value={form.evidence_class}
            onChange={(e) =>
              set(
                "evidence_class",
                e.target.value as FindingInput["evidence_class"]
              )
            }
          >
            {Object.entries(EVIDENCE_CLASSES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {form.source_kind === "library" && !form.text_id && (
        <p className="text-sm text-amber-200">
          Capture a passage using “Save to Journal” in the Library or Concept
          Search to attach its book.
        </p>
      )}
      {form.provenance.sources?.length ? (
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            Sources saved with this research lead
          </p>
          {form.provenance.sources.map((s) => (
            <a
              key={`${s.text_id}-${s.chunk_id}`}
              className="block text-sm text-amber-200 underline"
              href={`/library/${s.text_id}${s.chunk_id ? `?chunk=${s.chunk_id}` : ""}`}
            >
              {s.text_title || "Open source"}
            </a>
          ))}
        </div>
      ) : null}
      <Field label="Source title">
        <input
          maxLength={500}
          className={inputClass}
          value={form.source_title}
          onChange={(e) => set("source_title", e.target.value)}
        />
      </Field>
      {form.source_kind !== "library" && (
        <Field label="Source URL">
          <input
            type="url"
            maxLength={2000}
            className={inputClass}
            value={form.source_url}
            onChange={(e) => set("source_url", e.target.value)}
            placeholder="https://…"
          />
        </Field>
      )}
      <Field label="Location in source">
        <input
          maxLength={1000}
          className={inputClass}
          value={form.source_locator}
          onChange={(e) => set("source_locator", e.target.value)}
          placeholder="Edition, page, chapter, or illustration number"
        />
      </Field>
      <Field label="Exact passage or description of the source image">
        <textarea
          rows={5}
          maxLength={20000}
          className={inputClass}
          value={form.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
        />
      </Field>
      <Field label="Context and limits">
        <textarea
          rows={3}
          maxLength={4000}
          className={inputClass}
          value={form.context}
          onChange={(e) => set("context", e.target.value)}
          placeholder="Which author, period, or tradition? What does this evidence establish?"
        />
      </Field>
      <Field label="My private notes and next questions">
        <textarea
          rows={4}
          maxLength={30000}
          className={inputClass}
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className={primaryClass}>
          {busy ? "Saving…" : "Save draft"}
        </button>
        <button
          disabled={busy}
          type="button"
          className={buttonClass}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
