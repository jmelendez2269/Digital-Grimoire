"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, Plus, Trash2, Edit } from "lucide-react";
import ConvertPropertyModal from "@/components/admin/ConvertPropertyModal";

type GraphType = "correspondences" | "convergence";

interface CorrespondenceEntity {
  id?: string;
  slug: string;
  name: string;
  category: string;
  aliases?: string[];
  description?: string;
  lenses?: string[];
}

interface ConvergenceConcept {
  id?: string;
  slug: string;
  name: string;
  tradition: string;
  era?: string;
  short_definition?: string;
  primary_sources?: string[];
  tags?: string[];
}

interface KnowledgeSource {
  id: string;
  title: string;
  author?: string | null;
  year?: string | null;
  citation?: string | null;
  url?: string | null;
}

interface KnowledgeClaim {
  id: string;
  entity_type: "correspondence" | "convergence";
  entity_id: string;
  source_id?: string | null;
  field_key: string;
  field_value?: string | null;
  field_value_json?: any;
  confidence?: string | null;
  notes?: string | null;
  source?: KnowledgeSource | null;
}

type Entity = CorrespondenceEntity | ConvergenceConcept;

interface EntityModalProps {
  entity: Entity | null;
  graphType: GraphType;
  onClose: () => void;
  onSave: () => void;
}

interface TypeRecord {
  id: string;
  slug: string;
  label: string;
  color?: string | null;
  icon?: string | null;
}

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

export default function EntityModal({ entity, graphType, onClose, onSave }: EntityModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Correspondence fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("planet");
  const [typeId, setTypeId] = useState<string | null>(null);
  const [aliases, setAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState("");
  const [description, setDescription] = useState("");
  const [lenses, setLenses] = useState<string[]>([]);
  const [newLens, setNewLens] = useState("");

  // Convergence fields
  const [tradition, setTradition] = useState("Buddhist");
  const [traditionId, setTraditionId] = useState<string | null>(null);
  const [era, setEra] = useState("");
  const [shortDefinition, setShortDefinition] = useState("");
  const [primarySources, setPrimarySources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const [entityTypes, setEntityTypes] = useState<TypeRecord[]>([]);
  const [traditions, setTraditions] = useState<TypeRecord[]>([]);
  const [aiLoadingField, setAiLoadingField] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [claims, setClaims] = useState<KnowledgeClaim[]>([]);
  const [claimSourceId, setClaimSourceId] = useState("");
  const [claimFieldKey, setClaimFieldKey] = useState("");
  const [claimValue, setClaimValue] = useState("");
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);

  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceAuthor, setNewSourceAuthor] = useState("");
  const [newSourceYear, setNewSourceYear] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceCitation, setNewSourceCitation] = useState("");
  const [convertModalClaim, setConvertModalClaim] = useState<KnowledgeClaim | null>(null);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        if (graphType === "correspondences") {
          const res = await fetch("/api/graph/types/entities");
          const data = await res.json();
          setEntityTypes(data.items || []);
        } else {
          const res = await fetch("/api/concepts/traditions");
          const data = await res.json();
          setTraditions(data.items || []);
        }
      } catch (err) {
        // Silent fail - fallback to free text
      }
    };
    loadTypes();
  }, [graphType]);

  useEffect(() => {
    const loadSourcesAndClaims = async () => {
      if (!entity?.id) return;
      try {
        const [sourcesRes, claimsRes] = await Promise.all([
          fetch("/api/knowledge/sources"),
          fetch(
            `/api/knowledge/claims?entityType=${
              graphType === "correspondences" ? "correspondence" : "convergence"
            }&entityId=${entity.id}`
          ),
        ]);
        const sourcesData = await sourcesRes.json();
        const claimsData = await claimsRes.json();
        setSources(sourcesData.items || []);
        setClaims(claimsData.items || []);
      } catch (err) {
        // ignore
      }
    };
    loadSourcesAndClaims();
  }, [entity?.id, graphType]);

  useEffect(() => {
    if (entity) {
      // Editing existing entity
      setName(entity.name);
      setSlug(entity.slug);

      if (graphType === "correspondences") {
        const e = entity as CorrespondenceEntity;
        setCategory(e.category);
        setTypeId((e as any).type_id || (e as any).type?.id || null);
        setAliases(e.aliases || []);
        setDescription(e.description || "");
        setLenses(e.lenses || []);
      } else {
        const e = entity as ConvergenceConcept;
        setTradition(e.tradition);
        setTraditionId((e as any).tradition_id || (e as any).tradition_ref?.id || null);
        setEra(e.era || "");
        setShortDefinition(e.short_definition || "");
        setPrimarySources(e.primary_sources || []);
        setTags(e.tags || []);
      }
    } else {
      // Creating new entity - generate slug from name
      const handleNameChange = (newName: string) => {
        setName(newName);
        if (!entity) {
          setSlug(
            newName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
          );
        }
      };
      // This will be handled in the name input onChange
    }
  }, [entity, graphType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = graphType === "correspondences" ? "/api/graph/entities" : "/api/concepts";
      const method = entity ? "PATCH" : "POST";

      const body: any = {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
      };

      if (graphType === "correspondences") {
        body.category = category;
        body.typeId = typeId;
        body.aliases = aliases;
        body.description = description;
        body.lenses = lenses;
      } else {
        body.tradition = tradition;
        body.traditionId = traditionId;
        body.era = era;
        body.short_definition = shortDefinition;
        body.primary_sources = primarySources;
        body.tags = tags;
      }

      const url = entity ? `${endpoint}/${entity.id}` : endpoint;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save entity");
      }

      onSave();
    } catch (err: any) {
      setError(err.message || "Failed to save entity");
    } finally {
      setLoading(false);
    }
  };

  const addAlias = () => {
    if (newAlias.trim() && !aliases.includes(newAlias.trim())) {
      setAliases([...aliases, newAlias.trim()]);
      setNewAlias("");
    }
  };

  const removeAlias = (alias: string) => {
    setAliases(aliases.filter((a) => a !== alias));
  };

  const addLens = () => {
    if (newLens.trim() && !lenses.includes(newLens.trim())) {
      setLenses([...lenses, newLens.trim()]);
      setNewLens("");
    }
  };

  const removeLens = (lens: string) => {
    setLenses(lenses.filter((l) => l !== lens));
  };

  const addSource = () => {
    if (newSource.trim() && !primarySources.includes(newSource.trim())) {
      setPrimarySources([...primarySources, newSource.trim()]);
      setNewSource("");
    }
  };

  const removeSource = (source: string) => {
    setPrimarySources(primarySources.filter((s) => s !== source));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAIRewrite = async (
    fieldKey: string,
    fieldLabel: string,
    currentValue: string,
    setter: (value: string) => void
  ) => {
    try {
      setAiError(null);
      setAiLoadingField(fieldKey);
      const mode = currentValue.trim() ? "rewrite" : "generate";
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentValue,
          field: fieldLabel,
          entityName: name,
          entityType: graphType === "correspondences" ? category : tradition,
          mode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI request failed");
      }

      const data = await res.json();
      if (typeof data.text === "string") {
        setter(data.text);
      }
    } catch (err: any) {
      setAiError(err.message || "AI request failed");
    } finally {
      setAiLoadingField(null);
    }
  };

  const getClaimFieldOptions = () => {
    if (graphType === "convergence") return CONVERGENCE_FIELDS;
    const categoryKey = category?.toLowerCase() || "other";
    return CORRESPONDENCE_FIELD_OPTIONS[categoryKey] || DEFAULT_CORRESPONDENCE_FIELDS;
  };

  const handleCreateSource = async () => {
    if (!newSourceTitle.trim()) {
      setAiError("Source title is required");
      return;
    }
    try {
      const res = await fetch("/api/knowledge/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSourceTitle.trim(),
          author: newSourceAuthor.trim() || null,
          year: newSourceYear.trim() || null,
          url: newSourceUrl.trim() || null,
          citation: newSourceCitation.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create source");
      }
      const data = await res.json();
      setSources((prev) => [data.source, ...prev]);
      setNewSourceTitle("");
      setNewSourceAuthor("");
      setNewSourceYear("");
      setNewSourceUrl("");
      setNewSourceCitation("");
    } catch (err: any) {
      setAiError(err.message || "Failed to create source");
    }
  };

  const handleSaveClaim = async () => {
    if (!entity?.id) return;
    if (!claimFieldKey) {
      setAiError("Select a field for the claim");
      return;
    }
    try {
      const payload = {
        entityType: graphType === "correspondences" ? "correspondence" : "convergence",
        entityId: entity.id,
        sourceId: claimSourceId || null,
        field_key: claimFieldKey,
        field_value: claimValue,
      };
      const url = editingClaimId
        ? `/api/knowledge/claims/${editingClaimId}`
        : "/api/knowledge/claims";
      const method = editingClaimId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save claim");
      }
      const data = await res.json();
      if (editingClaimId) {
        setClaims((prev) =>
          prev.map((c) => (c.id === editingClaimId ? { ...c, ...data.claim } : c))
        );
      } else {
        setClaims((prev) => [data.claim, ...prev]);
      }
      setClaimSourceId("");
      setClaimFieldKey("");
      setClaimValue("");
      setEditingClaimId(null);
    } catch (err: any) {
      setAiError(err.message || "Failed to save claim");
    }
  };

  const handleEditClaim = (claim: KnowledgeClaim) => {
    setEditingClaimId(claim.id);
    setClaimSourceId(claim.source_id || "");
    setClaimFieldKey(claim.field_key);
    setClaimValue(claim.field_value || "");
  };

  const handleDeleteClaim = async (claimId: string) => {
    if (!confirm("Delete this claim?")) return;
    try {
      const res = await fetch(`/api/knowledge/claims/${claimId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete claim");
      }
      setClaims((prev) => prev.filter((c) => c.id !== claimId));
    } catch (err: any) {
      setAiError(err.message || "Failed to delete claim");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-amber-900/30 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-amber-900/30 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-amber-100">
            {entity ? "Edit" : "Create"}{" "}
            {graphType === "correspondences" ? "Correspondence Entity" : "Convergence Concept"}
          </h2>
          <button
            onClick={onClose}
            className="text-amber-100/60 hover:text-amber-100 transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          {aiError && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 text-amber-100/80 text-sm">
              {aiError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!entity) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "")
                  );
                }
              }}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-amber-100/80 mb-1">
              Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="[a-z0-9-]+"
              className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
            />
            <p className="text-xs text-amber-100/50 mt-1">URL-friendly identifier (lowercase, hyphens only)</p>
          </div>

          {graphType === "correspondences" ? (
            <>
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
              Entity Type *
                </label>
            {entityTypes.length > 0 ? (
              <select
                value={typeId || ""}
                onChange={(e) => {
                  const nextId = e.target.value || null;
                  setTypeId(nextId);
                  const selected = entityTypes.find((t) => t.id === nextId);
                  if (selected) {
                    setCategory(selected.slug);
                  }
                }}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              >
                <option value="">Select a type...</option>
                {entityTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.icon ? `${type.icon} ` : ""}{type.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              />
            )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-amber-100/80">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleAIRewrite("description", "description", description, setDescription)
                    }
                    disabled={aiLoadingField === "description" || !name}
                    className="text-xs px-2 py-1 rounded bg-amber-900/30 text-amber-100/80 hover:bg-amber-900/50 disabled:opacity-50 flex items-center gap-1"
                    title="Generate or rewrite with AI"
                  >
                    <Sparkles className="w-3 h-3" />
                    {aiLoadingField === "description" ? "Working..." : "AI"}
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                />
              </div>

              {/* Aliases */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Aliases
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAlias();
                      }
                    }}
                    placeholder="Add alias..."
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                  />
                  <button
                    type="button"
                    onClick={addAlias}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aliases.map((alias) => (
                    <span
                      key={alias}
                      className="px-2 py-1 bg-zinc-800 rounded text-sm text-amber-100/80 flex items-center gap-1"
                    >
                      {alias}
                      <button
                        type="button"
                        onClick={() => removeAlias(alias)}
                        className="text-amber-100/40 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Lenses */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Lenses
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newLens}
                    onChange={(e) => setNewLens(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLens();
                      }
                    }}
                    placeholder="Add lens..."
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                  />
                  <button
                    type="button"
                    onClick={addLens}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lenses.map((lens) => (
                    <span
                      key={lens}
                      className="px-2 py-1 bg-zinc-800 rounded text-sm text-amber-100/80 flex items-center gap-1"
                    >
                      {lens}
                      <button
                        type="button"
                        onClick={() => removeLens(lens)}
                        className="text-amber-100/40 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Tradition */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Tradition *
                </label>
            {traditions.length > 0 ? (
              <select
                value={traditionId || ""}
                onChange={(e) => {
                  const nextId = e.target.value || null;
                  setTraditionId(nextId);
                  const selected = traditions.find((t) => t.id === nextId);
                  if (selected) {
                    setTradition(selected.label);
                  }
                }}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              >
                <option value="">Select a tradition...</option>
                {traditions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon ? `${t.icon} ` : ""}{t.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={tradition}
                onChange={(e) => setTradition(e.target.value)}
                required
                placeholder="e.g., Buddhist, Christian, Taoist, Quantum"
                className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
              />
            )}
              </div>

              {/* Era */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Era
                </label>
                <input
                  type="text"
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                  placeholder="e.g., Ancient, Medieval, Modern"
                  className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                />
              </div>

              {/* Short Definition */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-amber-100/80">
                    Short Definition
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleAIRewrite("short_definition", "short definition", shortDefinition, setShortDefinition)
                    }
                    disabled={aiLoadingField === "short_definition" || !name}
                    className="text-xs px-2 py-1 rounded bg-amber-900/30 text-amber-100/80 hover:bg-amber-900/50 disabled:opacity-50 flex items-center gap-1"
                    title="Generate or rewrite with AI"
                  >
                    <Sparkles className="w-3 h-3" />
                    {aiLoadingField === "short_definition" ? "Working..." : "AI"}
                  </button>
                </div>
                <textarea
                  value={shortDefinition}
                  onChange={(e) => setShortDefinition(e.target.value)}
                  rows={4}
                  placeholder="Brief description of the concept..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                />
              </div>

              {/* Primary Sources */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Primary Sources
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSource();
                      }
                    }}
                    placeholder="Add source..."
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                  />
                  <button
                    type="button"
                    onClick={addSource}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {primarySources.map((source) => (
                    <span
                      key={source}
                      className="px-2 py-1 bg-zinc-800 rounded text-sm text-amber-100/80 flex items-center gap-1"
                    >
                      {source}
                      <button
                        type="button"
                        onClick={() => removeSource(source)}
                        className="text-amber-100/40 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-amber-100/80 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-zinc-800 rounded text-sm text-amber-100/80 flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-amber-100/40 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Sources & Claims */}
          <div className="border-t border-amber-900/30 pt-4">
            <h3 className="text-sm font-semibold text-amber-100/80 mb-3 uppercase tracking-wide">
              Sources & Claims
            </h3>
            {!entity?.id ? (
              <div className="text-sm text-amber-100/60">
                Save this entity first to add sources and claims.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Add Source */}
                <div className="bg-zinc-900/40 border border-amber-900/20 rounded-lg p-3">
                  <div className="text-sm font-medium text-amber-100/80 mb-2">Add Source</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Title *"
                      value={newSourceTitle}
                      onChange={(e) => setNewSourceTitle(e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                    />
                    <input
                      type="text"
                      placeholder="Author"
                      value={newSourceAuthor}
                      onChange={(e) => setNewSourceAuthor(e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                    />
                    <input
                      type="text"
                      placeholder="Year"
                      value={newSourceYear}
                      onChange={(e) => setNewSourceYear(e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                    />
                    <input
                      type="text"
                      placeholder="Citation"
                      value={newSourceCitation}
                      onChange={(e) => setNewSourceCitation(e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 md:col-span-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateSource}
                    className="mt-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Source
                  </button>
                </div>

                {/* Add Claim */}
                <div className="bg-zinc-900/40 border border-amber-900/20 rounded-lg p-3">
                  <div className="text-sm font-medium text-amber-100/80 mb-2">
                    {editingClaimId ? "Edit Claim" : "Add Claim"}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select
                      value={claimSourceId}
                      onChange={(e) => setClaimSourceId(e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                    >
                      <option value="">Select source (optional)</option>
                      {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.title}
                          {source.author ? ` — ${source.author}` : ""}
                        </option>
                      ))}
                    </select>
                    <select
                      value={claimFieldKey}
                      onChange={(e) => setClaimFieldKey(e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                    >
                      <option value="">Select field</option>
                      {getClaimFieldOptions().map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSaveClaim}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
                    >
                      {editingClaimId ? "Update Claim" : "Add Claim"}
                    </button>
                  </div>
                  <textarea
                    value={claimValue}
                    onChange={(e) => setClaimValue(e.target.value)}
                    placeholder="Claim value..."
                    rows={3}
                    className="mt-2 w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                  />
                </div>

                {/* Claims List */}
                <div className="space-y-2">
                  {claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="bg-zinc-900/40 border border-amber-900/20 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-amber-100/90">
                          <span className="font-medium">{claim.field_key}</span>
                          {claim.source?.title ? (
                            <span className="text-amber-100/50"> — {claim.source.title}</span>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          {claim.field_value && (
                            <button
                              type="button"
                              onClick={() => setConvertModalClaim(claim)}
                              className="text-amber-600 hover:text-amber-500"
                              title="Convert to Entity"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditClaim(claim)}
                            className="text-amber-100/60 hover:text-amber-100"
                            title="Edit claim"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClaim(claim.id)}
                            className="text-amber-100/60 hover:text-red-400"
                            title="Delete claim"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {claim.field_value && (
                        <div className="text-sm text-amber-100/70 mt-2 whitespace-pre-wrap">
                          {claim.field_value}
                        </div>
                      )}
                    </div>
                  ))}
                  {claims.length === 0 && (
                    <div className="text-sm text-amber-100/50">
                      No claims yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-amber-900/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : entity ? "Update" : "Create"}
            </button>
          </div>
        </form>

        {/* Convert Property Modal */}
        {convertModalClaim && entity && graphType === "correspondences" && (
          <ConvertPropertyModal
            claim={convertModalClaim}
            originalEntityName={(entity as CorrespondenceEntity).name}
            originalEntityCategory={(entity as CorrespondenceEntity).category}
            originalEntityId={entity.id}
            onClose={() => setConvertModalClaim(null)}
            onSuccess={() => {
              // Refresh claims after conversion
              const loadSourcesAndClaims = async () => {
                if (!entity?.id) return;
                try {
                  const [sourcesRes, claimsRes] = await Promise.all([
                    fetch("/api/knowledge/sources"),
                    fetch(
                      `/api/knowledge/claims?entityType=${
                        graphType === "correspondences" ? "correspondence" : "convergence"
                      }&entityId=${entity.id}`
                    ),
                  ]);
                  const sourcesData = await sourcesRes.json();
                  const claimsData = await claimsRes.json();
                  setSources(sourcesData.items || []);
                  setClaims(claimsData.items || []);
                } catch (err) {
                  // ignore
                }
              };
              loadSourcesAndClaims();
              setConvertModalClaim(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
