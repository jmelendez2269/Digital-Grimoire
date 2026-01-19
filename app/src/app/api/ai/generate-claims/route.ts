import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logMetadataExtractionUsage } from "@/lib/usage-tracker";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Field options mapping (same as in EntityModal)
const DEFAULT_CORRESPONDENCE_FIELDS = [
  { value: "notes", label: "Notes" },
  { value: "planet", label: "Planet" },
  { value: "secondary_planets", label: "Secondary Planets" },
  { value: "element", label: "Element" },
  { value: "zodiac", label: "Zodiac" },
  { value: "chakra", label: "Chakra" },
  { value: "color", label: "Color" },
  { value: "gemstone", label: "Gemstone/Crystal" },
  { value: "herb", label: "Herb" },
  { value: "incense", label: "Incense" },
  { value: "symbol", label: "Symbol" },
  { value: "offerings", label: "Offerings" },
  { value: "taboos", label: "Taboos" },
];

const CORRESPONDENCE_FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  herb: [
    { value: "scientific_name", label: "Scientific Name" },
    { value: "common_name", label: "Common Name" },
    { value: "dominant_planet", label: "Dominant Planet" },
    { value: "secondary_planets", label: "Secondary Planets" },
    { value: "notes", label: "Notes" },
  ],
  angel: [
    { value: "other_names", label: "Other Names" },
    { value: "helps_with", label: "Helps With" },
    { value: "meditation", label: "Meditation" },
    { value: "verse", label: "Verse" },
    { value: "scripture", label: "Scripture" },
    { value: "sefirah", label: "Sefirah" },
    { value: "celestial_sphere", label: "Celestial Sphere" },
    { value: "color", label: "Color" },
    { value: "element", label: "Element" },
    { value: "gemstone", label: "Gemstone" },
    { value: "herb", label: "Herb" },
    { value: "incense", label: "Traditional Incense" },
    { value: "circle_of_fifths", label: "Circle of Fifths" },
    { value: "appearance", label: "Appearance" },
    { value: "role_function", label: "Role/Function" },
    { value: "ability_tags", label: "Ability Tags" },
    { value: "notes", label: "Notes" },
  ],
  deity: [
    { value: "meaning", label: "Meaning" },
    { value: "domain", label: "Domain" },
    { value: "type", label: "Type" },
    { value: "colors", label: "Colors" },
    { value: "other_names", label: "Other Names" },
    { value: "about", label: "About" },
    { value: "personality", label: "Personality" },
    { value: "children", label: "Children/Followers" },
    { value: "symbol", label: "Symbol" },
    { value: "manifestation", label: "Manifestation" },
    { value: "catholic_synonym", label: "Catholic Synonym" },
    { value: "offerings", label: "Offerings" },
    { value: "zodiac", label: "Zodiac" },
    { value: "crystal", label: "Crystal" },
    { value: "herbs", label: "Herbs" },
    { value: "chakra", label: "Chakra" },
    { value: "animal", label: "Animal" },
    { value: "taboos", label: "Taboos" },
    { value: "day", label: "Day" },
    { value: "feast_day", label: "Feast Day" },
    { value: "notes", label: "Notes" },
    { value: "references", label: "References" },
  ],
  stone: [
    { value: "subtitle", label: "Subtitle" },
    { value: "other_name", label: "Other Name" },
    { value: "material", label: "Type of Material" },
    { value: "element", label: "Element" },
    { value: "musical_note", label: "Musical Note" },
    { value: "zodiac", label: "Zodiac Sign" },
    { value: "planets", label: "Planets" },
    { value: "chakras", label: "Chakras" },
    { value: "deity", label: "God/Goddess/Deity" },
    { value: "angel", label: "Angel" },
    { value: "energies", label: "Energies" },
    { value: "magical_uses", label: "Magical Uses" },
    { value: "spiritual_energy", label: "Spiritual Energy" },
    { value: "healing_properties", label: "Healing Properties" },
    { value: "divination", label: "Divination" },
    { value: "meditation", label: "Meditation" },
    { value: "color_energy", label: "Color Energy" },
    { value: "feng_shui_category", label: "Feng Shui Category" },
    { value: "feng_shui_details", label: "Feng Shui Details" },
    { value: "amulet_category", label: "Amulet Category" },
    { value: "amulet_details", label: "Amulet Details" },
    { value: "history_lore", label: "History & Lore" },
    { value: "additional_applications", label: "Additional Applications" },
    { value: "notes", label: "Notes" },
    { value: "references", label: "References" },
  ],
  chakra: [
    { value: "chakra_symbol", label: "Chakra Symbol" },
    { value: "petals", label: "Petals" },
    { value: "sanskrit", label: "Sanskrit Name" },
    { value: "tantric_names", label: "Tantric Names" },
    { value: "location", label: "Location" },
    { value: "seed_mantra", label: "Seed Mantra" },
    { value: "musical_note", label: "Musical Note" },
    { value: "mudra", label: "Mudra" },
    { value: "yoga_poses", label: "Yoga Poses" },
    { value: "sephiroth", label: "Sephiroth" },
    { value: "guna", label: "Guna" },
    { value: "affirmation", label: "Affirmation" },
    { value: "association", label: "Association" },
    { value: "characterization", label: "Characterization" },
    { value: "psychological_function", label: "Psychological Function" },
    { value: "body_parts", label: "Body Parts" },
    { value: "glands", label: "Glands" },
    { value: "senses", label: "Senses" },
    { value: "function", label: "Function" },
    { value: "balanced", label: "Balanced Chakra" },
    { value: "underactive", label: "Underactive Chakra" },
    { value: "overactive", label: "Overactive Chakra" },
    { value: "illness", label: "Illness" },
    { value: "emotional_imbalance", label: "Emotional Imbalance" },
    { value: "color", label: "Color" },
    { value: "aromatherapy", label: "Aromatherapy" },
    { value: "essential_oil", label: "Essential Oil" },
    { value: "foods", label: "Foods" },
    { value: "astrology", label: "Astrology" },
    { value: "element", label: "Element" },
    { value: "metals", label: "Metals" },
    { value: "gemstones", label: "Gemstones" },
    { value: "crystals", label: "Crystals" },
    { value: "deities", label: "Deities" },
    { value: "archangel", label: "Archangel" },
    { value: "orishas", label: "Orishas" },
    { value: "sacred_geometry", label: "Sacred Geometry" },
    { value: "notes", label: "Notes" },
  ],
};

const CONVERGENCE_FIELDS = [
  { value: "definition", label: "Definition" },
  { value: "era", label: "Era" },
  { value: "primary_sources", label: "Primary Sources" },
  { value: "tags", label: "Tags" },
  { value: "notes", label: "Notes" },
];

function getClaimFieldOptions(graphType: string, category?: string) {
  if (graphType === "convergence") return CONVERGENCE_FIELDS;
  const categoryKey = category?.toLowerCase() || "other";
  const categoryFields = CORRESPONDENCE_FIELD_OPTIONS[categoryKey];
  
  // If category has specific fields, merge with default correspondence fields
  // This ensures entities get both category-specific AND standard correspondence fields
  if (categoryFields) {
    // Create a map to avoid duplicates
    const fieldMap = new Map<string, { value: string; label: string }>();
    
    // Add default correspondence fields first (planet, element, zodiac, color, gemstone, etc.)
    DEFAULT_CORRESPONDENCE_FIELDS.forEach(field => {
      fieldMap.set(field.value, field);
    });
    
    // Add category-specific fields (may override defaults with more specific labels)
    categoryFields.forEach(field => {
      fieldMap.set(field.value, field);
    });
    
    return Array.from(fieldMap.values());
  }
  
  return DEFAULT_CORRESPONDENCE_FIELDS;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      entityName,
      entityCategory,
      tradition,
      entityDescription,
      graphType,
    } = body || {};

    if (!entityName || !graphType) {
      return NextResponse.json(
        { error: "entityName and graphType are required" },
        { status: 400 }
      );
    }

    // Get field options for this entity type
    const fieldOptions = getClaimFieldOptions(
      graphType,
      graphType === "correspondences" ? entityCategory : undefined
    );

    const entityType = graphType === "correspondences" ? entityCategory : tradition;
    const fieldsList = fieldOptions.map((f) => `${f.label} (${f.value})`).join(", ");

    const userPrompt = `Generate knowledge claims for the entity "${entityName}" in the context of ${graphType === "correspondences" ? `category: ${entityCategory}` : `tradition: ${tradition}`}.

${entityDescription ? `Entity description: ${entityDescription}\n\n` : ""}For each of the following fields, provide appropriate values if they are relevant to this entity. IMPORTANT: Generate values for ALL fields that are applicable to this entity, not just a few. Include standard correspondence fields (planet, element, zodiac, color, gemstone/crystal, etc.) as well as any category-specific fields that are relevant.

Available fields: ${fieldsList}

Example format:
{
  "claims": [
    {"field_key": "planet", "field_value": "Mars"},
    {"field_key": "element", "field_value": "Fire"},
    {"field_key": "color", "field_value": "Red, Orange"},
    {"field_key": "zodiac", "field_value": "Aries"},
    {"field_key": "gemstone", "field_value": "Ruby, Carnelian"}
  ]
}

Return only the JSON object, no additional text. Generate claims for as many relevant fields as possible.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a knowledge base assistant. Generate factual, neutral knowledge claims for entities. Return only valid JSON objects with a 'claims' array.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const output = completion.choices?.[0]?.message?.content?.trim() || "";

    // Parse the JSON response
    let claims: Array<{ field_key: string; field_value: string }> = [];
    try {
      // Try parsing as JSON object first (in case AI wraps it)
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        claims = parsed;
      } else if (parsed.claims && Array.isArray(parsed.claims)) {
        claims = parsed.claims;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        claims = parsed.data;
      } else {
        // Try to extract array from object
        const values = Object.values(parsed);
        if (values.length > 0 && Array.isArray(values[0])) {
          claims = values[0] as Array<{ field_key: string; field_value: string }>;
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON array from text
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          claims = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse AI response:", e);
        }
      }
    }

    // Validate and filter claims
    const validClaims = claims
      .filter(
        (c) =>
          c &&
          typeof c.field_key === "string" &&
          typeof c.field_value === "string" &&
          c.field_key.trim() &&
          c.field_value.trim()
      )
      .map((c) => ({
        field_key: c.field_key.trim(),
        field_value: c.field_value.trim(),
      }));

    await logMetadataExtractionUsage({
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
      userId: user.id,
      success: true,
      model: "gpt-4o-mini",
    });

    return NextResponse.json({ claims: validClaims });
  } catch (error) {
    console.error("Error in AI generate-claims endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
