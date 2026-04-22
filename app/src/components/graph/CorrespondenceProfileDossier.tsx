"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Bird,
  CalendarDays,
  Compass,
  Gem,
  GlassWater,
  Leaf,
  Link2,
  MoonStar,
  Orbit,
  Palette,
  PawPrint,
  ScrollText,
  ShieldCheck,
  Sparkles,
  SunMoon,
  Swords,
  Trees,
  Waves,
} from "lucide-react";
import type {
  CorrespondenceProfile,
  CorrespondenceProfileConnection,
} from "@/lib/graph/correspondence-profile";

interface CorrespondenceProfileDossierProps {
  profile: CorrespondenceProfile;
  compact?: boolean;
  onSelectConnectionEntity?: (connection: CorrespondenceProfileConnection) => void;
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type SectionVisual = {
  icon: LucideIcon;
  accentClass: string;
  panelClass: string;
  chipClass: string;
};

const DEFAULT_SECTION_VISUAL: SectionVisual = {
  icon: Sparkles,
  accentClass: "text-amber-300",
  panelClass: "border-amber-900/25 bg-zinc-950/75",
  chipClass: "border-zinc-700/60 bg-black/35 text-amber-100/82",
};

const SECTION_VISUALS: Record<string, SectionVisual> = {
  planets: {
    icon: Orbit,
    accentClass: "text-sky-300",
    panelClass:
      "border-sky-900/30 bg-[linear-gradient(180deg,rgba(14,31,49,0.92),rgba(10,12,18,0.96))]",
    chipClass: "border-sky-700/40 bg-sky-950/35 text-sky-100",
  },
  zodiac: {
    icon: SunMoon,
    accentClass: "text-fuchsia-300",
    panelClass:
      "border-fuchsia-900/30 bg-[linear-gradient(180deg,rgba(43,16,48,0.92),rgba(13,9,20,0.96))]",
    chipClass: "border-fuchsia-700/40 bg-fuchsia-950/35 text-fuchsia-100",
  },
  "moon-phases": {
    icon: MoonStar,
    accentClass: "text-indigo-300",
    panelClass:
      "border-indigo-900/30 bg-[linear-gradient(180deg,rgba(21,24,59,0.92),rgba(10,10,18,0.96))]",
    chipClass: "border-indigo-700/40 bg-indigo-950/35 text-indigo-100",
  },
  "full-moons": {
    icon: MoonStar,
    accentClass: "text-violet-300",
    panelClass:
      "border-violet-900/30 bg-[linear-gradient(180deg,rgba(32,20,56,0.92),rgba(12,10,18,0.96))]",
    chipClass: "border-violet-700/40 bg-violet-950/35 text-violet-100",
  },
  seasons: {
    icon: Trees,
    accentClass: "text-emerald-300",
    panelClass:
      "border-emerald-900/30 bg-[linear-gradient(180deg,rgba(15,46,34,0.92),rgba(9,15,13,0.96))]",
    chipClass: "border-emerald-700/40 bg-emerald-950/35 text-emerald-100",
  },
  days: {
    icon: CalendarDays,
    accentClass: "text-amber-300",
    panelClass:
      "border-amber-900/25 bg-[linear-gradient(180deg,rgba(52,34,10,0.92),rgba(16,12,8,0.96))]",
    chipClass: "border-amber-700/40 bg-amber-950/35 text-amber-100",
  },
  "times-of-day": {
    icon: CalendarDays,
    accentClass: "text-orange-300",
    panelClass:
      "border-orange-900/30 bg-[linear-gradient(180deg,rgba(61,28,11,0.92),rgba(18,11,8,0.96))]",
    chipClass: "border-orange-700/40 bg-orange-950/35 text-orange-100",
  },
  celebrations: {
    icon: Sparkles,
    accentClass: "text-rose-300",
    panelClass:
      "border-rose-900/30 bg-[linear-gradient(180deg,rgba(58,19,28,0.92),rgba(19,9,12,0.96))]",
    chipClass: "border-rose-700/40 bg-rose-950/35 text-rose-100",
  },
  ogham: {
    icon: Trees,
    accentClass: "text-lime-300",
    panelClass:
      "border-lime-900/30 bg-[linear-gradient(180deg,rgba(43,53,14,0.92),rgba(13,16,9,0.96))]",
    chipClass: "border-lime-700/40 bg-lime-950/35 text-lime-100",
  },
  runes: {
    icon: Swords,
    accentClass: "text-stone-300",
    panelClass:
      "border-stone-800/40 bg-[linear-gradient(180deg,rgba(39,34,30,0.92),rgba(14,12,11,0.96))]",
    chipClass: "border-stone-600/40 bg-stone-950/35 text-stone-100",
  },
  tarot: {
    icon: Sparkles,
    accentClass: "text-purple-300",
    panelClass:
      "border-purple-900/30 bg-[linear-gradient(180deg,rgba(34,16,51,0.92),rgba(12,8,18,0.96))]",
    chipClass: "border-purple-700/40 bg-purple-950/35 text-purple-100",
  },
  numbers: {
    icon: ShieldCheck,
    accentClass: "text-cyan-300",
    panelClass:
      "border-cyan-900/30 bg-[linear-gradient(180deg,rgba(12,44,51,0.92),rgba(7,13,16,0.96))]",
    chipClass: "border-cyan-700/40 bg-cyan-950/35 text-cyan-100",
  },
  elements: {
    icon: Compass,
    accentClass: "text-red-300",
    panelClass:
      "border-red-900/30 bg-[linear-gradient(180deg,rgba(58,18,14,0.92),rgba(17,9,8,0.96))]",
    chipClass: "border-red-700/40 bg-red-950/35 text-red-100",
  },
  energies: {
    icon: Sparkles,
    accentClass: "text-yellow-300",
    panelClass:
      "border-yellow-900/30 bg-[linear-gradient(180deg,rgba(61,47,10,0.92),rgba(18,14,8,0.96))]",
    chipClass: "border-yellow-700/40 bg-yellow-950/35 text-yellow-100",
  },
  directions: {
    icon: Compass,
    accentClass: "text-teal-300",
    panelClass:
      "border-teal-900/30 bg-[linear-gradient(180deg,rgba(12,49,45,0.92),rgba(7,14,15,0.96))]",
    chipClass: "border-teal-700/40 bg-teal-950/35 text-teal-100",
  },
  chakras: {
    icon: Sparkles,
    accentClass: "text-pink-300",
    panelClass:
      "border-pink-900/30 bg-[linear-gradient(180deg,rgba(58,18,42,0.92),rgba(18,8,14,0.96))]",
    chipClass: "border-pink-700/40 bg-pink-950/35 text-pink-100",
  },
  colors: {
    icon: Palette,
    accentClass: "text-emerald-200",
    panelClass:
      "border-emerald-900/25 bg-[linear-gradient(180deg,rgba(18,36,30,0.92),rgba(9,12,11,0.96))]",
    chipClass: "border-emerald-700/40 bg-emerald-950/35 text-emerald-100",
  },
  uses: {
    icon: ScrollText,
    accentClass: "text-amber-300",
    panelClass:
      "border-amber-900/25 bg-[linear-gradient(180deg,rgba(46,30,11,0.92),rgba(14,11,8,0.96))]",
    chipClass: "border-amber-700/40 bg-amber-950/35 text-amber-100",
  },
  goddesses: {
    icon: Sparkles,
    accentClass: "text-rose-200",
    panelClass:
      "border-rose-900/25 bg-[linear-gradient(180deg,rgba(48,18,33,0.92),rgba(15,8,12,0.96))]",
    chipClass: "border-rose-700/40 bg-rose-950/35 text-rose-100",
  },
  gods: {
    icon: Sparkles,
    accentClass: "text-orange-200",
    panelClass:
      "border-orange-900/25 bg-[linear-gradient(180deg,rgba(53,23,11,0.92),rgba(15,9,8,0.96))]",
    chipClass: "border-orange-700/40 bg-orange-950/35 text-orange-100",
  },
  angels: {
    icon: ShieldCheck,
    accentClass: "text-slate-200",
    panelClass:
      "border-slate-800/40 bg-[linear-gradient(180deg,rgba(31,37,47,0.92),rgba(10,12,15,0.96))]",
    chipClass: "border-slate-600/40 bg-slate-950/35 text-slate-100",
  },
  magical: {
    icon: Sparkles,
    accentClass: "text-violet-200",
    panelClass:
      "border-violet-900/25 bg-[linear-gradient(180deg,rgba(36,17,50,0.92),rgba(12,9,17,0.96))]",
    chipClass: "border-violet-700/40 bg-violet-950/35 text-violet-100",
  },
  animals: {
    icon: PawPrint,
    accentClass: "text-orange-300",
    panelClass:
      "border-orange-900/25 bg-[linear-gradient(180deg,rgba(45,24,10,0.92),rgba(13,10,8,0.96))]",
    chipClass: "border-orange-700/40 bg-orange-950/35 text-orange-100",
  },
  birds: {
    icon: Bird,
    accentClass: "text-sky-200",
    panelClass:
      "border-sky-900/25 bg-[linear-gradient(180deg,rgba(16,34,50,0.92),rgba(8,10,15,0.96))]",
    chipClass: "border-sky-700/40 bg-sky-950/35 text-sky-100",
  },
  "marine-life": {
    icon: Waves,
    accentClass: "text-cyan-200",
    panelClass:
      "border-cyan-900/25 bg-[linear-gradient(180deg,rgba(11,37,50,0.92),rgba(7,10,15,0.96))]",
    chipClass: "border-cyan-700/40 bg-cyan-950/35 text-cyan-100",
  },
  reptiles: {
    icon: PawPrint,
    accentClass: "text-lime-200",
    panelClass:
      "border-lime-900/25 bg-[linear-gradient(180deg,rgba(34,43,12,0.92),rgba(10,12,8,0.96))]",
    chipClass: "border-lime-700/40 bg-lime-950/35 text-lime-100",
  },
  "insects-misc": {
    icon: Leaf,
    accentClass: "text-green-200",
    panelClass:
      "border-green-900/25 bg-[linear-gradient(180deg,rgba(16,39,21,0.92),rgba(8,12,9,0.96))]",
    chipClass: "border-green-700/40 bg-green-950/35 text-green-100",
  },
  mythical: {
    icon: Sparkles,
    accentClass: "text-fuchsia-200",
    panelClass:
      "border-fuchsia-900/25 bg-[linear-gradient(180deg,rgba(43,16,43,0.92),rgba(12,8,14,0.96))]",
    chipClass: "border-fuchsia-700/40 bg-fuchsia-950/35 text-fuchsia-100",
  },
  trees: {
    icon: Trees,
    accentClass: "text-emerald-200",
    panelClass:
      "border-emerald-900/25 bg-[linear-gradient(180deg,rgba(17,42,24,0.92),rgba(9,13,10,0.96))]",
    chipClass: "border-emerald-700/40 bg-emerald-950/35 text-emerald-100",
  },
  "herbs-garden": {
    icon: Leaf,
    accentClass: "text-green-200",
    panelClass:
      "border-green-900/25 bg-[linear-gradient(180deg,rgba(18,44,18,0.92),rgba(9,12,9,0.96))]",
    chipClass: "border-green-700/40 bg-green-950/35 text-green-100",
  },
  crystals: {
    icon: Gem,
    accentClass: "text-cyan-200",
    panelClass:
      "border-cyan-900/25 bg-[linear-gradient(180deg,rgba(12,36,47,0.92),rgba(8,11,15,0.96))]",
    chipClass: "border-cyan-700/40 bg-cyan-950/35 text-cyan-100",
  },
  metals: {
    icon: ShieldCheck,
    accentClass: "text-slate-200",
    panelClass:
      "border-slate-800/35 bg-[linear-gradient(180deg,rgba(34,36,41,0.92),rgba(11,12,14,0.96))]",
    chipClass: "border-slate-600/40 bg-slate-950/35 text-slate-100",
  },
  "sea-items": {
    icon: GlassWater,
    accentClass: "text-blue-200",
    panelClass:
      "border-blue-900/25 bg-[linear-gradient(180deg,rgba(12,29,48,0.92),rgba(8,10,15,0.96))]",
    chipClass: "border-blue-700/40 bg-blue-950/35 text-blue-100",
  },
};

export default function CorrespondenceProfileDossier({
  profile,
  compact = false,
  onSelectConnectionEntity,
}: CorrespondenceProfileDossierProps) {
  const gridClass = compact
    ? "grid grid-cols-1 gap-3"
    : "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-amber-900/30 bg-[radial-gradient(circle_at_top,_rgba(180,120,30,0.18),_rgba(24,18,12,0.9)_45%,_rgba(10,10,10,0.95)_100%)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,220,160,0.06),transparent_35%,transparent_65%,rgba(180,110,20,0.06))]" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-700/40 bg-amber-950/40 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-amber-200/75">
              {profile.hero.typeLabel}
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-100/35">
              {titleCase(profile.hero.categoryLabel)}
            </span>
          </div>

          {profile.hero.description ? (
            <p className="max-w-3xl text-sm leading-7 text-amber-100/82">
              {profile.hero.description}
            </p>
          ) : (
            <p className="max-w-3xl text-sm italic leading-7 text-amber-100/45">
              Structured associations are available below even though this entity does not yet have
              a narrative summary.
            </p>
          )}

          {(profile.hero.aliases.length > 0 || profile.hero.lenses.length > 0) && (
            <div className={gridClass}>
              {profile.hero.aliases.length > 0 && (
                <div className="rounded-xl border border-amber-900/25 bg-black/25 p-4">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-amber-100/45">
                    Aliases
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.hero.aliases.map((alias) => (
                      <span
                        key={alias}
                        className="rounded-full border border-zinc-700/50 bg-zinc-900/65 px-2.5 py-1 text-xs text-amber-100/80"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.hero.lenses.length > 0 && (
                <div className="rounded-xl border border-amber-900/25 bg-black/25 p-4">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-amber-100/45">
                    Lenses
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.hero.lenses.map((lens) => (
                      <span
                        key={lens}
                        className="rounded-full border border-amber-800/40 bg-amber-950/25 px-2.5 py-1 text-xs text-amber-100/80"
                      >
                        {lens}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {profile.sections.map((section) => {
        const visual = SECTION_VISUALS[section.id] || DEFAULT_SECTION_VISUAL;
        const SectionIcon = visual.icon;
        const totalValues = section.items.reduce((sum, item) => sum + item.values.length, 0);
        const totalSources = section.items.reduce((sum, item) => sum + item.sourceCount, 0);

        return (
          <section
            key={section.id}
            className={`rounded-2xl border p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)] ${visual.panelClass}`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SectionIcon className={`h-4 w-4 ${visual.accentClass}`} />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-100/75">
                {section.title}
              </h3>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-100/50">
                {totalValues} associations
              </span>
              {totalSources > 0 && (
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-100/40">
                  {totalSources} sources
                </span>
              )}
            </div>

            <div className={gridClass}>
              {section.items.map((item) => (
                <div key={item.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-amber-100/45">
                      {item.label}
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-100/35">
                      {item.values.length} items
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.values.map((value) => (
                      <span
                        key={value}
                        className={`rounded-full border px-2.5 py-1 text-xs ${visual.chipClass}`}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl border border-amber-900/20 bg-zinc-950/75 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-amber-500/70" />
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-100/75">
            Graph Connections
          </h3>
          <span className="rounded-full border border-zinc-700/70 bg-zinc-900/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-100/45">
            {profile.connections.total} total
          </span>
        </div>

        {profile.connections.byRelationship.length === 0 ? (
          <div className="text-sm italic text-amber-100/45">
            No linked entities are available yet for this node.
          </div>
        ) : (
          <div className="space-y-4">
            {profile.connections.byRelationship.map((group) => (
              <div key={group.id}>
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-amber-100/45">
                  {group.title}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectConnectionEntity?.(item)}
                      disabled={!onSelectConnectionEntity}
                      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                        onSelectConnectionEntity
                          ? "border-amber-700/40 bg-amber-950/25 text-amber-50 hover:border-amber-500/60 hover:bg-amber-900/40"
                          : "border-zinc-700/60 bg-zinc-900/60 text-amber-100/80"
                      }`}
                    >
                      <span>{item.entity.name}</span>
                      {item.entity.typeLabel && (
                        <span className="text-[10px] uppercase tracking-[0.14em] text-amber-100/45">
                          {item.entity.typeLabel}
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-[0.14em] text-amber-100/35">
                        {item.direction === "outgoing" ? "linked" : "backlinked"}
                      </span>
                      {onSelectConnectionEntity && (
                        <ArrowUpRight className="h-3 w-3 text-amber-200/70" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {profile.sources.length > 0 && (
        <section className="rounded-2xl border border-amber-900/20 bg-zinc-950/75 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
          <div className="mb-3 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-amber-500/70" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-100/75">
              Source Coverage
            </h3>
          </div>

          <div className="space-y-2">
            {profile.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/55 p-3"
              >
                <div>
                  <div className="text-sm text-amber-100/82">{source.title}</div>
                  <div className="text-xs text-amber-100/45">
                    {[source.author, source.citation, source.year].filter(Boolean).join(" • ")}
                  </div>
                </div>
                <div className="rounded-full border border-zinc-700/70 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-100/45">
                  {source.claimCount} claims
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
