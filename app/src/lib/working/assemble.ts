import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The Working — palette assembly.
 *
 * Given a practitioner intention, query the correspondence graph for aligned
 * components and return a balanced, category-grouped palette, each item carrying
 * its approved narrative (grounding for synthesis). Intentions resolve through
 * their synonym aliases (money <- wealth/prosperity/abundance), and a one-hop
 * relationship traversal reaches patrons (deities/planets) that rarely carry
 * direct intention claims.
 *
 * Design of record: docs/planning/THE_WORKING_PLAN.md
 */

export type PaletteItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  typeLabel: string | null;
  narrative: string | null;
  matchedVia: string[]; // intention labels that surfaced this item
  related?: boolean; // reached via one-hop traversal, not a direct intention match
};

export type PaletteGroup = {
  key: string;
  title: string;
  items: PaletteItem[];
};

export type ResolvedIntention = {
  slug: string;
  label: string;
  aliases: string[];
  matchedFrom: "slug" | "label" | "alias" | "fuzzy";
};

export type AssembledPalette = {
  intention: ResolvedIntention;
  groups: PaletteGroup[];
  patrons: PaletteItem[];
  stats: {
    intentionSlugsUnioned: string[];
    totalMatched: number;
    totalReturned: number;
  };
};

// Category → display bucket. Order here is the order groups render in.
const GROUPS: Array<{ key: string; title: string; categories: string[] }> = [
  { key: "timing", title: "Timing", categories: ["moon_phase", "full_moon", "day", "weekday", "season", "time_of_day", "celebration", "zodiac_sign"] },
  { key: "materials", title: "Materials", categories: ["stone", "herb_garden", "plant_misc", "tree", "metal", "sea_item", "from_the_sea"] },
  { key: "symbols", title: "Symbols", categories: ["rune", "ogham", "tarot", "number_symbol"] },
  { key: "energetics", title: "Energetics", categories: ["color", "chakra", "element"] },
  { key: "beings", title: "Patrons & Beings", categories: ["deity", "goddess", "god", "angel", "planetary_body", "planet", "magical_being", "mythical_being"] },
];

const GROUP_BY_CATEGORY = new Map<string, { key: string; title: string }>();
for (const g of GROUPS) for (const c of g.categories) GROUP_BY_CATEGORY.set(c, { key: g.key, title: g.title });
const FALLBACK_GROUP = { key: "other", title: "Other Associations" };

// Patron categories reached via one-hop traversal.
const PATRON_CATEGORIES = new Set(["deity", "goddess", "god", "angel", "planetary_body", "planet"]);

const PER_GROUP_CAP = 8;

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function chunkedIn<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: any }>,
  size = 100,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += size) {
    const { data, error } = await fetchChunk(ids.slice(i, i + size));
    if (error) throw error;
    out.push(...(data || []));
  }
  return out;
}

const STOPWORDS = new Set([
  "a", "an", "the", "to", "for", "of", "and", "or", "my", "me", "i", "with",
  "attract", "bring", "gain", "want", "need", "seek", "find", "get", "more",
  "some", "in", "on", "into", "toward", "towards", "help", "call",
]);

function asResolved(row: any, matchedFrom: ResolvedIntention["matchedFrom"]): ResolvedIntention {
  return { slug: row.slug, label: row.label, aliases: row.aliases || [], matchedFrom };
}

/** Try a single term against slug / label / alias (exact), returning the canonical intention. */
async function matchTerm(supabase: SupabaseClient, term: string): Promise<ResolvedIntention | null> {
  const slug = slugify(term);
  if (!slug) return null;
  const lower = term.toLowerCase();

  const { data: bySlug } = await supabase.from("intentions").select("slug, label, aliases").eq("slug", slug).limit(1);
  if (bySlug?.[0]) return asResolved(bySlug[0], "slug");

  const { data: byLabel } = await supabase.from("intentions").select("slug, label, aliases").ilike("label", lower).limit(1);
  if (byLabel?.[0]) return asResolved(byLabel[0], "label");

  const { data: byAlias } = await supabase.from("intentions").select("slug, label, aliases").contains("aliases", [slug]).limit(1);
  if (byAlias?.[0]) return asResolved(byAlias[0], "alias");

  return null;
}

/**
 * Resolve free text or a slug to a canonical intention, honoring aliases.
 * Tries the whole phrase first, then individual significant words (so
 * "attract prosperity" → money via the "prosperity" alias).
 */
export async function resolveIntention(
  supabase: SupabaseClient,
  input: string,
): Promise<ResolvedIntention | null> {
  const raw = input.trim();
  if (!raw) return null;

  // 1) whole phrase against slug/label/alias
  const whole = await matchTerm(supabase, raw);
  if (whole) return whole;

  // 2) per-word, longest (most specific) first, skipping stopwords
  const words = Array.from(new Set(raw.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))));
  words.sort((a, b) => b.length - a.length);
  for (const w of words) {
    const hit = await matchTerm(supabase, w);
    if (hit) return hit;
  }

  // 3) fuzzy contains on label — shortest (closest) concept wins
  const { data: fuzzy } = await supabase
    .from("intentions")
    .select("slug, label, aliases")
    .ilike("label", `%${raw.toLowerCase()}%`)
    .limit(10);
  if (fuzzy && fuzzy.length > 0) {
    const best = [...fuzzy].sort((a, b) => a.label.length - b.label.length)[0];
    return asResolved(best, "fuzzy");
  }

  return null;
}

export async function assemblePalette(
  supabase: SupabaseClient,
  input: string,
): Promise<AssembledPalette | null> {
  const intention = await resolveIntention(supabase, input);
  if (!intention) return null;

  // Union the canonical intention with its aliases.
  const unionSlugs = Array.from(new Set([intention.slug, ...intention.aliases]));

  const { data: intentionRows, error: intErr } = await supabase
    .from("intentions")
    .select("id, slug, label")
    .in("slug", unionSlugs);
  if (intErr) throw intErr;
  const intentionLabelById = new Map((intentionRows || []).map((r: any) => [r.id, r.label] as const));
  const intentionIds = (intentionRows || []).map((r: any) => r.id);
  if (intentionIds.length === 0) {
    return { intention, groups: [], patrons: [], stats: { intentionSlugsUnioned: unionSlugs, totalMatched: 0, totalReturned: 0 } };
  }

  // Entities tagged with any of these intentions.
  const links = await chunkedIn<{ entity_id: string; intention_id: string }>(
    intentionIds,
    (c) => supabase.from("entity_intentions").select("entity_id, intention_id").in("intention_id", c),
  );

  const matchedViaByEntity = new Map<string, Set<string>>();
  for (const l of links) {
    const label = intentionLabelById.get(l.intention_id);
    if (!label) continue;
    const set = matchedViaByEntity.get(l.entity_id) || new Set<string>();
    set.add(label);
    matchedViaByEntity.set(l.entity_id, set);
  }
  const entityIds = Array.from(matchedViaByEntity.keys());

  // Load entity details (with narrative grounding).
  const entities = await chunkedIn<any>(
    entityIds,
    (c) =>
      supabase
        .from("correspondences")
        .select("id, slug, name, category, description, type:correspondence_entity_types(slug, label)")
        .in("id", c),
  );

  const items: PaletteItem[] = entities.map((e) => ({
    id: e.id,
    slug: e.slug,
    name: e.name,
    category: e.category,
    typeLabel: e.type?.label || null,
    narrative: e.description || null,
    matchedVia: Array.from(matchedViaByEntity.get(e.id) || []),
  }));

  // One-hop traversal → patrons (deities/planets) related to matched entities.
  const patrons = await assemblePatrons(supabase, entityIds, new Set(entityIds));

  // Group + balance.
  const grouped = new Map<string, PaletteGroup>();
  for (const item of items) {
    const g = GROUP_BY_CATEGORY.get(item.category) || FALLBACK_GROUP;
    const group = grouped.get(g.key) || { key: g.key, title: g.title, items: [] };
    group.items.push(item);
    grouped.set(g.key, group);
  }

  // Sort within a group (narrative first, then more intention matches, then name) and cap.
  const rank = (a: PaletteItem, b: PaletteItem) =>
    Number(!!b.narrative) - Number(!!a.narrative) ||
    b.matchedVia.length - a.matchedVia.length ||
    a.name.localeCompare(b.name);

  const groups = GROUPS.map((g) => grouped.get(g.key))
    .filter((g): g is PaletteGroup => !!g && g.items.length > 0)
    .map((g) => ({ ...g, items: g.items.sort(rank).slice(0, PER_GROUP_CAP) }));

  // Append the fallback group last if present.
  const fallback = grouped.get(FALLBACK_GROUP.key);
  if (fallback && fallback.items.length > 0) {
    groups.push({ ...fallback, items: fallback.items.sort(rank).slice(0, PER_GROUP_CAP) });
  }

  return {
    intention,
    groups,
    patrons,
    stats: {
      intentionSlugsUnioned: unionSlugs,
      totalMatched: items.length,
      totalReturned: groups.reduce((n, g) => n + g.items.length, 0),
    },
  };
}

async function assemblePatrons(
  supabase: SupabaseClient,
  sourceIds: string[],
  excludeIds: Set<string>,
): Promise<PaletteItem[]> {
  if (sourceIds.length === 0) return [];

  // Relationships where a matched entity points at (or is pointed at by) a patron.
  const rels = await chunkedIn<any>(
    sourceIds,
    (c) =>
      supabase
        .from("correspondence_relationships")
        .select(
          "weight, source_id, target_id, " +
            "source:correspondences!correspondence_relationships_source_id_fkey(id, slug, name, category, description, type:correspondence_entity_types(slug, label)), " +
            "target:correspondences!correspondence_relationships_target_id_fkey(id, slug, name, category, description, type:correspondence_entity_types(slug, label))",
        )
        .or(`source_id.in.(${c.join(",")}),target_id.in.(${c.join(",")})`),
  );

  const byId = new Map<string, { item: PaletteItem; weight: number }>();
  for (const r of rels) {
    for (const side of [r.source, r.target]) {
      if (!side?.id || excludeIds.has(side.id)) continue;
      if (!PATRON_CATEGORIES.has(side.category)) continue;
      const existing = byId.get(side.id);
      const weight = Number(r.weight ?? 0.5);
      if (!existing || weight > existing.weight) {
        byId.set(side.id, {
          weight,
          item: {
            id: side.id,
            slug: side.slug,
            name: side.name,
            category: side.category,
            typeLabel: side.type?.label || null,
            narrative: side.description || null,
            matchedVia: [],
            related: true,
          },
        });
      }
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.weight - a.weight || a.item.name.localeCompare(b.item.name))
    .slice(0, 6)
    .map((x) => x.item);
}
