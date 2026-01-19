"use client";

import { useEffect, useState } from "react";
import { X, Plus, Save, Trash2 } from "lucide-react";

type TypeKind = "entity" | "relationship" | "tradition";

interface TypeRecord {
  id: string;
  slug: string;
  label: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

interface TypeManagerModalProps {
  kind: TypeKind;
  onClose: () => void;
  onUpdated: () => void;
}

const TYPE_KIND_LABELS: Record<TypeKind, string> = {
  entity: "Correspondence Entity Types",
  relationship: "Correspondence Relationship Types",
  tradition: "Convergence Traditions",
};

const TYPE_KIND_ENDPOINTS: Record<TypeKind, string> = {
  entity: "/api/graph/types/entities",
  relationship: "/api/graph/types/relationships",
  tradition: "/api/concepts/traditions",
};

export default function TypeManagerModal({ kind, onClose, onUpdated }: TypeManagerModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<TypeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Omit<TypeRecord, "id">>({
    slug: "",
    label: "",
    color: "",
    icon: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  const endpoint = TYPE_KIND_ENDPOINTS[kind];

  useEffect(() => {
    fetchItems();
  }, [kind]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to load types");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load types");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (id: string, patch: Partial<TypeRecord>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleSave = async (id: string) => {
    try {
      setSaving(true);
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Failed to update type");
      onUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to update type");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this type? This may affect existing entities.")) return;
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete type");
      await fetchItems();
      onUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to delete type");
    }
  };

  const handleCreate = async () => {
    if (!newItem.slug || !newItem.label) {
      setError("slug and label are required");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) throw new Error("Failed to create type");
      setNewItem({
        slug: "",
        label: "",
        color: "",
        icon: "",
        description: "",
        sort_order: 0,
        is_active: true,
      });
      await fetchItems();
      onUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to create type");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-amber-900/30 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-amber-900/30 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-amber-100">{TYPE_KIND_LABELS[kind]}</h2>
          <button
            onClick={onClose}
            className="text-amber-100/60 hover:text-amber-100 transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Create new type */}
          <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-100/80 mb-3 uppercase tracking-wide">
              Add New Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Slug (e.g., planet)"
                value={newItem.slug}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
                  }))
                }
                className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
              />
              <input
                type="text"
                placeholder="Label (e.g., Planet)"
                value={newItem.label}
                onChange={(e) => setNewItem((prev) => ({ ...prev, label: e.target.value }))}
                className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
              />
              <input
                type="text"
                placeholder="Color (hex)"
                value={newItem.color || ""}
                onChange={(e) => setNewItem((prev) => ({ ...prev, color: e.target.value }))}
                className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
              />
              <input
                type="text"
                placeholder="Icon (emoji or text)"
                value={newItem.icon || ""}
                onChange={(e) => setNewItem((prev) => ({ ...prev, icon: e.target.value }))}
                className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
              />
              <input
                type="text"
                placeholder="Description"
                value={newItem.description || ""}
                onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
                className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
              />
              <input
                type="number"
                placeholder="Sort order"
                value={newItem.sort_order || 0}
                onChange={(e) => setNewItem((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Type
            </button>
          </div>

          {/* Existing types */}
          <div>
            <h3 className="text-sm font-semibold text-amber-100/80 mb-3 uppercase tracking-wide">
              Existing Types
            </h3>
            {loading ? (
              <div className="text-amber-100/60">Loading types...</div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={item.slug}
                        onChange={(e) => updateItem(item.id, { slug: e.target.value })}
                        className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                      />
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateItem(item.id, { label: e.target.value })}
                        className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                      />
                      <input
                        type="text"
                        value={item.color || ""}
                        onChange={(e) => updateItem(item.id, { color: e.target.value })}
                        className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                      />
                      <input
                        type="text"
                        value={item.icon || ""}
                        onChange={(e) => updateItem(item.id, { icon: e.target.value })}
                        className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                      />
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                      />
                      <input
                        type="number"
                        value={item.sort_order || 0}
                        onChange={(e) => updateItem(item.id, { sort_order: Number(e.target.value) })}
                        className="px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <label className="flex items-center gap-2 text-sm text-amber-100/70">
                        <input
                          type="checkbox"
                          checked={item.is_active ?? true}
                          onChange={(e) => updateItem(item.id, { is_active: e.target.checked })}
                          className="rounded"
                        />
                        Active
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(item.id)}
                          disabled={saving}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-2 bg-zinc-800 hover:bg-red-900/50 text-amber-100 rounded-lg flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-amber-100/60 text-sm">No types yet.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
