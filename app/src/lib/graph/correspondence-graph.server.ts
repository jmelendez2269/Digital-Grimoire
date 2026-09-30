import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import {
  projectPublicCorrespondenceGraph,
  type PublicCorrespondenceGraphWire,
} from "@/lib/graph/correspondence-graph-public";

const PAGE_SIZE = 1000;

/** Pagination only — omitted from the public CDN payload. */
const ENTITY_SELECT =
  "id, slug, name, category, aliases, created_at, type:correspondence_entity_types(slug, label, color, icon)";

const EDGE_SELECT = "id, source_id, target_id, type, weight, created_at";

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

export async function loadPublicCorrespondenceGraph(): Promise<PublicCorrespondenceGraphWire> {
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

  return projectPublicCorrespondenceGraph(
    entities as Parameters<typeof projectPublicCorrespondenceGraph>[0],
    edges as Parameters<typeof projectPublicCorrespondenceGraph>[1],
  );
}
