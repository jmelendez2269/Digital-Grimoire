import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import {
  PUBLIC_CATALOG_SELECT,
  shapePublicCatalogCourse,
  type PublicCatalogRow,
} from "../src/lib/courses/public-catalog";

config({
  path: process.env.CATALOG_ENV_FILE || ".env.local",
  override: true,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase production credentials are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const startedAt = performance.now();
  const { data, error } = await supabase
    .from("courses")
    .select(PUBLIC_CATALOG_SELECT)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Catalog projection failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PublicCatalogRow[];
  const courses = rows.map(shapePublicCatalogCourse);
  const payloadBytes = Buffer.byteLength(JSON.stringify(courses));
  const maxPayloadBytes = 250_000;
  const fieldBytes = Object.fromEntries(
    Object.keys(rows[0] ?? {}).map((key) => [
      key,
      rows.reduce(
        (total, row) =>
          total +
          Buffer.byteLength(
            JSON.stringify((row as unknown as Record<string, unknown>)[key])
          ),
        0
      ),
    ])
  );

  console.log(
    JSON.stringify({
      courses: courses.length,
      payloadBytes,
      durationMs: Math.round(performance.now() - startedAt),
      maxPayloadBytes,
      fieldBytes,
    })
  );

  if (payloadBytes > maxPayloadBytes) {
    throw new Error(
      `Public catalog payload is ${payloadBytes} bytes; budget is ${maxPayloadBytes}`
    );
  }
}

void main();
