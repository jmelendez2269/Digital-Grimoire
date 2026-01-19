import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { createServiceClient } from "../src/lib/supabase/service";

// Try multiple paths for .env.local (since __dirname can be unreliable with tsx)
const envPaths = [
  path.join(process.cwd(), ".env.local"), // Current working directory (app/)
  path.join(__dirname, "../.env.local"),  // One level up from scripts/
  path.join(__dirname, "../../.env.local"), // Two levels up (fallback)
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn("⚠️  .env.local not found in expected locations");
}

type CsvRecord = Record<string, string>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeHeader = (value: string) =>
  value.replace(/^\uFEFF/, "").trim();

const detectSchema = (headers: string[]) => {
  if (headers.includes("Scientific Name")) return "plants";
  if (headers.includes("Sefirah") && headers.includes("Celestial Sphere")) return "angels";
  if (headers.includes("Orisha Name")) return "orishas";
  if (headers.includes("Role and Attributes")) return "gods";
  if (headers.includes("Type of Material")) return "crystals";
  if (headers.includes("Chakra Name")) return "chakras";
  return "unknown";
};

const schemaConfig: Record<
  string,
  { typeSlug: string; nameField: string; fieldMap: Record<string, string> }
> = {
  plants: {
    typeSlug: "herb",
    nameField: "Common Name",
    fieldMap: {
      "Scientific Name": "scientific_name",
      "Common Name": "common_name",
      "Dominant Planet": "dominant_planet",
      "Secondary Planets": "secondary_planets",
      Notes: "notes",
    },
  },
  angels: {
    typeSlug: "angel",
    nameField: "Name",
    fieldMap: {
      "Other Names": "other_names",
      "Helps With": "helps_with",
      Meditation: "meditation",
      Verse: "verse",
      Scripture: "scripture",
      Sefirah: "sefirah",
      "Celestial Sphere": "celestial_sphere",
      Color: "color",
      Element: "element",
      Gemstone: "gemstone",
      Herb: "herb",
      "Traditional Incense": "incense",
      "Circle of Fifths": "circle_of_fifths",
      Appearance: "appearance",
      "Role/Function": "role_function",
      "Ability Tags": "ability_tags",
      Notes: "notes",
    },
  },
  orishas: {
    typeSlug: "deity",
    nameField: "Orisha Name",
    fieldMap: {
      Meaning: "meaning",
      Domain: "domain",
      Type: "type",
      Colors: "colors",
      "Other Names": "other_names",
      About: "about",
      Personality: "personality",
      Children: "children",
      Symbol: "symbol",
      Manifestation: "manifestation",
      "Catholic Synonym": "catholic_synonym",
      Offerings: "offerings",
      Zodiac: "zodiac",
      Crystal: "crystal",
      Herbs: "herbs",
      "Chakra Correspondences": "chakra",
      Animal: "animal",
      Taboos: "taboos",
      Day: "day",
      "Feast Day": "feast_day",
      References: "references",
      Notes: "notes",
    },
  },
  gods: {
    typeSlug: "deity",
    nameField: "Name",
    fieldMap: {
      Type: "type",
      Origin: "origin",
      "Role and Attributes": "role_attributes",
    },
  },
  crystals: {
    typeSlug: "stone",
    nameField: "Name",
    fieldMap: {
      Type: "type",
      Subtitle: "subtitle",
      "Other Name": "other_name",
      "Type of Material": "material",
      Element: "element",
      "Musical Note": "musical_note",
      "Zodiac Sign": "zodiac",
      Planets: "planets",
      Chakras: "chakras",
      "God/Goddess/Deity": "deity",
      Angel: "angel",
      Energies: "energies",
      "Magical Uses": "magical_uses",
      "Spiritual Energy": "spiritual_energy",
      "Healing Properties": "healing_properties",
      Divination: "divination",
      Meditation: "meditation",
      "Color Energy": "color_energy",
      "Fung Shui Category": "feng_shui_category",
      "Fung Shui Details": "feng_shui_details",
      "Amulet and Talisman Category": "amulet_category",
      "Amulet and Talisman Details": "amulet_details",
      "History and Lore": "history_lore",
      "Additional Applications": "additional_applications",
      Notes: "notes",
      References: "references",
    },
  },
  chakras: {
    typeSlug: "chakra",
    nameField: "Chakra Name ",
    fieldMap: {
      "Chakra Symbol": "chakra_symbol",
      Petals: "petals",
      "Chakra Sanscript": "sanskrit",
      "Tantric Names": "tantric_names",
      "Chakra Location": "location",
      "Seed Mantra": "seed_mantra",
      "Musical Note": "musical_note",
      Mudra: "mudra",
      "Yoga Poses": "yoga_poses",
      Sephiroth: "sephiroth",
      Guna: "guna",
      Affirmation: "affirmation",
      Association: "association",
      Characterization: "characterization",
      "Psychological Function": "psychological_function",
      "Body Parts": "body_parts",
      Glands: "glands",
      Senses: "senses",
      Function: "function",
      "Balanced Chakra": "balanced",
      "Underactive Chakra": "underactive",
      "Overactive Chakra": "overactive",
      Illness: "illness",
      "Emotional Imbalance": "emotional_imbalance",
      Color: "color",
      Aromatherapy: "aromatherapy",
      Incense: "incense",
      "Essential Oil": "essential_oil",
      Foods: "foods",
      Astrology: "astrology",
      Element: "element",
      Metals: "metals",
      Gemstones: "gemstones",
      Crystals: "crystals",
      Deities: "deities",
      Archangel: "archangel",
      Orishas: "orishas",
      "Sacred Geometry": "sacred_geometry",
      Notes: "notes",
    },
  },
};

async function ensureType(typeSlug: string) {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("correspondence_entity_types")
    .select("id, slug")
    .eq("slug", typeSlug)
    .single();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("correspondence_entity_types")
    .insert({ slug: typeSlug, label: typeSlug.replace(/_/g, " ") })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function upsertEntity(name: string, slug: string, typeId: string, category: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("correspondences")
    .upsert({ name, slug, type_id: typeId, category }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createSource(title: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("knowledge_sources")
    .insert({ title })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function insertClaim(entityId: string, sourceId: string, fieldKey: string, value: string) {
  const supabase = createServiceClient();
  if (!value || !value.trim()) return;
  const { error } = await supabase.from("knowledge_claims").insert({
    entity_type: "correspondence",
    entity_id: entityId,
    source_id: sourceId,
    field_key: fieldKey,
    field_value: value,
  });
  if (error) throw error;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: tsx scripts/import-knowledge-csv.ts <path-to-csv>");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(filePath, "utf-8");
  const records: CsvRecord[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  if (!records.length) {
    console.log("No rows found.");
    return;
  }

  const headers = Object.keys(records[0]).map(normalizeHeader);
  const schema = detectSchema(headers);
  const config = schemaConfig[schema];
  if (!config) {
    console.error("Unknown schema. Headers:", headers);
    return;
  }

  const normalizedRecords = records.map((row) => {
    const next: CsvRecord = {};
    for (const [key, value] of Object.entries(row)) {
      next[normalizeHeader(key)] = value;
    }
    return next;
  });

  const typeId = await ensureType(config.typeSlug);
  const sourceId = await createSource(path.basename(filePath));

  for (const row of normalizedRecords) {
    const rawName = row[config.nameField] || row["Name"] || row["Orisha Name"] || "";
    const name = rawName?.trim();
    if (!name) continue;
    const slug = slugify(name);
    const entityId = await upsertEntity(name, slug, typeId, config.typeSlug);

    for (const [csvField, claimKey] of Object.entries(config.fieldMap)) {
      const value = row[csvField];
      if (value && value.toString().trim()) {
        await insertClaim(entityId, sourceId, claimKey, value.toString().trim());
      }
    }
  }

  console.log(`Imported ${records.length} rows from ${filePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
