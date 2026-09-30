import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

const PAGE_SIZE = 1000;

const ENTITY_SELECT =
  "id, slug, name, category, aliases, description, lenses, created_at, updated_at, type:correspondence_entity_types(id, slug, label, color, icon)";

const EDGE_SELECT =
  "id, source_id, target_id, type, weight, confidence, source_citation, notes, created_at, relationship_type:correspondence_relationship_types(id, slug, label, color, icon)";

async function fetchCorrespondenceTablePages<T>(
  table: "correspondences" | "correspondence_relationships",
  select: string,
): Promise<T[]> {
  const supabase = createServiceClient();
  const items: T[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data || []) as T[];
    items.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    offset += page.length;
  }

  return items;
}

export async function loadPublicCorrespondenceGraph() {
  const [entities, edges] = await Promise.all([
    fetchCorrespondenceTablePages<Record<string, unknown>>(
      "correspondences",
      ENTITY_SELECT,
    ),
    fetchCorrespondenceTablePages<Record<string, unknown>>(
      "correspondence_relationships",
      EDGE_SELECT,
    ),
  ]);

  return {
    entities,
    edges,
    entityCount: entities.length,
    edgeCount: edges.length,
  };
}
