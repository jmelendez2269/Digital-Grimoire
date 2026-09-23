"use client";
import { useEffect, useId, useState } from "react";
import { ENTITY_KINDS, type KnowledgeEntity } from "@/lib/inquiries/model";
import { Field, inputClass, buttonClass, inquiryRequest } from "./shared";
type Correspondence = {
  id: string;
  name: string;
  category: string;
  description: string | null;
};
export default function EntityPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: KnowledgeEntity | null;
  onChange: (entity: KnowledgeEntity) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    entities: KnowledgeEntity[];
    correspondences: Correspondence[];
  }>({ entities: [], correspondences: [] });
  const [kind, setKind] = useState<KnowledgeEntity["kind"]>("concept");
  const [definition, setDefinition] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      inquiryRequest<typeof results>(
        `/api/knowledge/entities?q=${encodeURIComponent(query)}`,
        "GET",
        undefined,
        abort.signal
      )
        .then(setResults)
        .catch((err) => {
          if (!abort.signal.aborted) setError(err.message);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query]);
  async function create(correspondence?: Correspondence) {
    setBusy(true);
    setError("");
    try {
      const { entity } = await inquiryRequest<{ entity: KnowledgeEntity }>(
        "/api/knowledge/entities",
        "POST",
        {
          name: correspondence?.name || query,
          kind,
          definition,
          correspondence_id: correspondence?.id || null,
        }
      );
      onChange(entity);
      setQuery("");
      setDefinition("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add entry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="min-w-0 space-y-3 rounded-xl border border-zinc-700 p-4">
      <legend className="px-2 text-sm font-medium text-amber-200">
        {label}
      </legend>
      {value && (
        <p className="text-sm text-zinc-200">
          Selected: <strong>{value.name}</strong> · {value.kind}
          {value.correspondence_id ? " · linked correspondence" : ""}
        </p>
      )}
      <label htmlFor={id} className="block text-sm text-zinc-400">
        Find an existing entry or name a new one
      </label>
      <input
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setError("");
          setResults({ entities: [], correspondences: [] });
        }}
        className={inputClass}
        maxLength={160}
        placeholder="e.g. Resurrection of Christ"
      />
      {query.trim().length >= 2 && (
        <>
          <div
            className="max-h-48 space-y-2 overflow-auto"
            aria-label={`${label} matches`}
          >
            {results.entities.map((entity) => (
              <button
                key={entity.id}
                type="button"
                disabled={busy}
                className={`${buttonClass} w-full justify-start text-left`}
                onClick={() => {
                  onChange(entity);
                  setQuery("");
                }}
              >
                {entity.name} <span className="text-xs">{entity.kind}</span>
              </button>
            ))}
            {results.correspondences
              .filter(
                (c) =>
                  !results.entities.some((e) => e.correspondence_id === c.id)
              )
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy}
                  className={`${buttonClass} w-full justify-start text-left`}
                  onClick={() => void create(c)}
                >
                  Use correspondence: {c.name}
                </button>
              ))}
          </div>
          <Field label="Entry type">
            <select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as KnowledgeEntity["kind"])
              }
              className={inputClass}
            >
              {ENTITY_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Short definition (optional)">
            <input
              className={inputClass}
              value={definition}
              maxLength={2000}
              onChange={(e) => setDefinition(e.target.value)}
            />
          </Field>
          <p className="text-xs leading-5 text-zinc-400">
            Use a qualified name when meanings differ, such as “Resurrection in
            Christian theology”. The selected type also applies when linking a
            correspondence.
          </p>
          <button
            type="button"
            disabled={busy}
            className={buttonClass}
            onClick={() => void create()}
          >
            {busy ? "Adding…" : `Create “${query}”`}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </fieldset>
  );
}
