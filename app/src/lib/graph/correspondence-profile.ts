import { parsePropertyValue } from "./entity-utils";

export type CorrespondenceProfileEntity = {
  id: string;
  slug?: string;
  name: string;
  category: string | null;
  type?: {
    id?: string;
    slug?: string;
    label?: string;
    color?: string;
    icon?: string;
  } | null;
  aliases?: string[] | null;
  description?: string | null;
  lenses?: string[] | null;
};

export type CorrespondenceProfileClaimRow = {
  id: string;
  field_key: string;
  field_value?: string | null;
  source?: {
    id: string;
    title: string;
    author?: string | null;
    citation?: string | null;
    year?: string | null;
  } | null;
};

export type CorrespondenceProfileRelationshipRow = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight?: number | null;
  confidence?: string | null;
  source_citation?: string | null;
  notes?: string | null;
  relationship_type?: {
    id?: string;
    slug?: string;
    label?: string;
    color?: string;
    icon?: string;
  } | null;
  source?: any;
  target?: any;
};

export type CorrespondenceProfileSectionItem = {
  key: string;
  label: string;
  values: string[];
  sourceCount: number;
};

export type CorrespondenceProfileSection = {
  id: string;
  title: string;
  items: CorrespondenceProfileSectionItem[];
};

export type CorrespondenceProfileConnection = {
  id: string;
  direction: "outgoing" | "incoming";
  type: string;
  relationshipLabel: string;
  weight: number;
  confidence?: string | null;
  sourceCitation?: string | null;
  notes?: string | null;
  entity: {
    id: string;
    slug?: string;
    name: string;
    category?: string | null;
    typeLabel?: string | null;
    color?: string | null;
    icon?: string | null;
  };
};

export type CorrespondenceProfile = {
  entity: CorrespondenceProfileEntity;
  hero: {
    categoryLabel: string;
    typeLabel: string;
    aliases: string[];
    lenses: string[];
    description?: string | null;
  };
  sections: CorrespondenceProfileSection[];
  connections: {
    total: number;
    byRelationship: Array<{
      id: string;
      title: string;
      items: CorrespondenceProfileConnection[];
    }>;
  };
  sources: Array<{
    id: string;
    title: string;
    author?: string | null;
    citation?: string | null;
    year?: string | null;
    claimCount: number;
  }>;
};

type SectionConfig = {
  id: string;
  title: string;
  order: number;
};

const SECTION_BY_FIELD_KEY: Record<string, SectionConfig> = {
  solar_system: { id: "planets", title: "Planets", order: 10 },
  zodiac: { id: "zodiac", title: "Zodiac", order: 20 },
  moon_phase: { id: "moon-phases", title: "Moon Phases", order: 30 },
  moon_phases: { id: "moon-phases", title: "Moon Phases", order: 30 },
  full_moon: { id: "full-moons", title: "Full Moons", order: 40 },
  full_moons: { id: "full-moons", title: "Full Moons", order: 40 },
  season: { id: "seasons", title: "Seasons", order: 50 },
  seasons: { id: "seasons", title: "Seasons", order: 50 },
  day: { id: "days", title: "Days", order: 60 },
  days: { id: "days", title: "Days", order: 60 },
  time_of_day: { id: "times-of-day", title: "Times of Day", order: 70 },
  times_of_day: { id: "times-of-day", title: "Times of Day", order: 70 },
  celebration: { id: "celebrations", title: "Celebrations", order: 80 },
  celebrations: { id: "celebrations", title: "Celebrations", order: 80 },
  ogham: { id: "ogham", title: "Ogham", order: 90 },
  rune: { id: "runes", title: "Runes", order: 100 },
  runes: { id: "runes", title: "Runes", order: 100 },
  tarot: { id: "tarot", title: "Tarot", order: 110 },
  number: { id: "numbers", title: "Numbers", order: 120 },
  numbers: { id: "numbers", title: "Numbers", order: 120 },
  element: { id: "elements", title: "Elements", order: 130 },
  elements: { id: "elements", title: "Elements", order: 130 },
  energy: { id: "energies", title: "Energies", order: 140 },
  direction: { id: "directions", title: "Directions", order: 150 },
  directions: { id: "directions", title: "Directions", order: 150 },
  chakra: { id: "chakras", title: "Chakras", order: 160 },
  chakras: { id: "chakras", title: "Chakras", order: 160 },
  color: { id: "colors", title: "Colors", order: 170 },
  colors: { id: "colors", title: "Colors", order: 170 },
  issues_intentions_powers: { id: "uses", title: "Issues, Intentions & Powers", order: 180 },
  issue_intention_power: { id: "uses", title: "Issues, Intentions & Powers", order: 180 },
  goddess: { id: "goddesses", title: "Goddesses", order: 190 },
  goddesses: { id: "goddesses", title: "Goddesses", order: 190 },
  god: { id: "gods", title: "Gods", order: 200 },
  gods: { id: "gods", title: "Gods", order: 200 },
  angel: { id: "angels", title: "Angels", order: 210 },
  angels: { id: "angels", title: "Angels", order: 210 },
  magical: { id: "magical", title: "Magical", order: 220 },
  animals: { id: "animals", title: "Animals", order: 230 },
  animal: { id: "animals", title: "Animals", order: 230 },
  bird: { id: "birds", title: "Birds", order: 240 },
  birds: { id: "birds", title: "Birds", order: 240 },
  marine_life: { id: "marine-life", title: "Marine Life", order: 250 },
  reptile: { id: "reptiles", title: "Reptiles", order: 260 },
  reptiles: { id: "reptiles", title: "Reptiles", order: 260 },
  insect_misc: { id: "insects-misc", title: "Insects & Misc.", order: 270 },
  insects_misc: { id: "insects-misc", title: "Insects & Misc.", order: 270 },
  mythical: { id: "mythical", title: "Mythical", order: 280 },
  tree: { id: "trees", title: "Trees", order: 290 },
  trees: { id: "trees", title: "Trees", order: 290 },
  herb_garden: { id: "herbs-garden", title: "Herbs & Garden", order: 300 },
  gemstonemineral: { id: "crystals", title: "Crystals", order: 310 },
  gemstones_minerals: { id: "crystals", title: "Crystals", order: 310 },
  gemstones: { id: "crystals", title: "Crystals", order: 310 },
  gemstone_mineral: { id: "crystals", title: "Crystals", order: 310 },
  metal: { id: "metals", title: "Metals", order: 320 },
  metals: { id: "metals", title: "Metals", order: 320 },
  from_the_sea: { id: "sea-items", title: "From the Sea", order: 330 },
};

const FALLBACK_SECTION: SectionConfig = {
  id: "other",
  title: "Additional Associations",
  order: 999,
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeFieldKey(fieldKey: string) {
  return fieldKey.trim().toLowerCase();
}

function getSectionConfig(fieldKey: string) {
  return SECTION_BY_FIELD_KEY[normalizeFieldKey(fieldKey)] || FALLBACK_SECTION;
}

function getDisplayLabel(fieldKey: string) {
  return titleCase(normalizeFieldKey(fieldKey));
}

export function buildCorrespondenceProfile({
  entity,
  claims,
  relationships,
}: {
  entity: CorrespondenceProfileEntity;
  claims: CorrespondenceProfileClaimRow[];
  relationships: CorrespondenceProfileRelationshipRow[];
}): CorrespondenceProfile {
  const sectionMap = new Map<
    string,
    {
      config: SectionConfig;
      values: string[];
      sourceIds: Set<string>;
    }
  >();

  for (const claim of claims) {
    if (!claim.field_value?.trim()) continue;

    const normalizedKey = normalizeFieldKey(claim.field_key);
    const config = getSectionConfig(normalizedKey);
    const sectionEntry =
      sectionMap.get(config.id) ||
      {
        config,
        values: [],
        sourceIds: new Set<string>(),
      };

    const nextValues = parsePropertyValue(claim.field_value)
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index);

    sectionEntry.values = Array.from(new Set([...sectionEntry.values, ...nextValues]));
    if (claim.source?.id) {
      sectionEntry.sourceIds.add(claim.source.id);
    }
    sectionMap.set(config.id, sectionEntry);
  }

  const sections = Array.from(sectionMap.values())
    .sort((left, right) => left.config.order - right.config.order)
    .map((entry) => ({
      id: entry.config.id,
      title: entry.config.title,
      items: [
        {
          key: entry.config.id,
          label: entry.config.title,
          values: entry.values.sort((left, right) => left.localeCompare(right)),
          sourceCount: entry.sourceIds.size,
        },
      ],
    }))
    .filter((section) => section.items.length > 0);

  const connectionGroups = new Map<string, { id: string; title: string; items: CorrespondenceProfileConnection[] }>();

  for (const relationship of relationships) {
    const isOutgoing = relationship.source_id === entity.id;
    const related = isOutgoing ? relationship.target : relationship.source;
    if (!related?.id || related.id === entity.id) continue;

    const groupId = relationship.relationship_type?.slug || relationship.type || "linked";
    const groupTitle = relationship.relationship_type?.label || titleCase(groupId);
    const group =
      connectionGroups.get(groupId) || {
        id: groupId,
        title: groupTitle,
        items: [],
      };

    group.items.push({
      id: relationship.id,
      direction: isOutgoing ? "outgoing" : "incoming",
      type: relationship.type,
      relationshipLabel: groupTitle,
      weight: relationship.weight ?? 0.5,
      confidence: relationship.confidence,
      sourceCitation: relationship.source_citation,
      notes: relationship.notes,
      entity: {
        id: related.id,
        slug: related.slug,
        name: related.name,
        category: related.category,
        typeLabel: related.type?.label || related.category || null,
        color: related.type?.color || null,
        icon: related.type?.icon || null,
      },
    });

    connectionGroups.set(groupId, group);
  }

  const byRelationship = Array.from(connectionGroups.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) => right.weight - left.weight || left.entity.name.localeCompare(right.entity.name)),
    }))
    .sort((left, right) => right.items.length - left.items.length || left.title.localeCompare(right.title));

  const sourceMap = new Map<
    string,
    {
      id: string;
      title: string;
      author?: string | null;
      citation?: string | null;
      year?: string | null;
      claimCount: number;
    }
  >();

  for (const claim of claims) {
    if (!claim.source?.id) continue;
    const existing =
      sourceMap.get(claim.source.id) || {
        id: claim.source.id,
        title: claim.source.title,
        author: claim.source.author,
        citation: claim.source.citation,
        year: claim.source.year,
        claimCount: 0,
      };
    existing.claimCount += 1;
    sourceMap.set(claim.source.id, existing);
  }

  return {
    entity,
    hero: {
      categoryLabel: entity.category || entity.type?.slug || "correspondence",
      typeLabel: entity.type?.label || titleCase(entity.category || "correspondence"),
      aliases: (entity.aliases || []).filter(Boolean),
      lenses: (entity.lenses || []).filter(Boolean),
      description: entity.description,
    },
    sections,
    connections: {
      total: relationships.length,
      byRelationship,
    },
    sources: Array.from(sourceMap.values()).sort(
      (left, right) => right.claimCount - left.claimCount || left.title.localeCompare(right.title),
    ),
  };
}
