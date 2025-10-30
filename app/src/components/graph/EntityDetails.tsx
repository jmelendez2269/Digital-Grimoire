"use client";

export default function EntityDetails({
  entity,
}: {
  entity: {
    id: string;
    name: string;
    category: string;
    aliases?: string[];
    description?: string;
    lenses?: string[];
  } | null;
}) {
  if (!entity) {
    return (
      <div className="text-amber-100/60 text-sm">Select a node to view details.</div>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <div className="text-xs uppercase tracking-wide text-amber-100/50">
          {entity.category}
        </div>
        <div className="text-xl font-semibold text-amber-100">{entity.name}</div>
      </div>
      {entity.description && (
        <p className="text-sm text-amber-100/80 mb-3">{entity.description}</p>
      )}
      {entity.aliases && entity.aliases.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-amber-100/50 mb-1">Aliases</div>
          <div className="flex flex-wrap gap-2">
            {entity.aliases.map((a) => (
              <span key={a} className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-amber-100/80">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
      {entity.lenses && entity.lenses.length > 0 && (
        <div>
          <div className="text-xs text-amber-100/50 mb-1">Lenses</div>
          <div className="flex flex-wrap gap-2">
            {entity.lenses.map((l) => (
              <span key={l} className="px-2 py-0.5 rounded bg-amber-900/20 border border-amber-700/30 text-xs text-amber-100/90">
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


