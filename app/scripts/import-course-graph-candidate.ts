import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import * as dotenv from "dotenv";
import { createServiceClient } from "../src/lib/supabase/service";
import {
  CourseGraphCandidateBundle,
  validateCourseGraphCandidateBundle,
} from "../src/lib/graph/course-graph-candidate";

type ImportArgs = {
  input: string;
  envFile: string;
  expectedProjectRef: string;
  apply: boolean;
  allowProduction: boolean;
};

function parseArgs(): ImportArgs {
  const args = process.argv.slice(2);
  let input = "";
  let envFile = "";
  let expectedProjectRef = "";
  let apply = false;
  let allowProduction = false;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index + 1];
    if ((args[index] === "--input" || args[index] === "-i") && value) {
      input = value;
      index += 1;
    } else if (args[index] === "--env-file" && value) {
      envFile = value;
      index += 1;
    } else if (args[index] === "--expected-project-ref" && value) {
      expectedProjectRef = value;
      index += 1;
    } else if (args[index] === "--apply") {
      apply = true;
    } else if (args[index] === "--allow-production") {
      allowProduction = true;
    }
  }

  if (!input || !envFile) {
    throw new Error(
      "Usage: tsx scripts/import-course-graph-candidate.ts --input <bundle.json> --env-file <profile> [--expected-project-ref <ref>] [--apply] [--allow-production]",
    );
  }

  return {
    input: resolve(process.cwd(), input),
    envFile: resolve(process.cwd(), envFile),
    expectedProjectRef,
    apply,
    allowProduction,
  };
}

function projectRef(url: string) {
  return url.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1] || null;
}

function envValue(file: string, key: string) {
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${key}=`));
  if (!line) return null;
  return line.slice(key.length + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

function productionProjectRef() {
  const currentProfile = resolve(process.cwd(), ".env.local");
  const url = envValue(currentProfile, "NEXT_PUBLIC_SUPABASE_URL");
  return url ? projectRef(url) : null;
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function currentCounts(
  bundle: CourseGraphCandidateBundle,
) {
  const supabase = createServiceClient();
  const { data: imported, error: importError } = await supabase
    .from("course_graph_imports")
    .select("id, manifest_sha256, review_state")
    .eq("bundle_slug", bundle.bundle_slug)
    .maybeSingle();

  if (importError) {
    if (
      importError.code === "42P01" ||
      importError.message?.includes("course_graph_imports")
    ) {
      return {
        schemaReady: false,
        existing: null,
        entities: 0,
        edges: 0,
        evidence: 0,
        blockedInferences: 0,
      };
    }
    throw importError;
  }

  if (!imported) {
    return {
      schemaReady: true,
      existing: null,
      entities: 0,
      edges: 0,
      evidence: 0,
      blockedInferences: 0,
    };
  }

  const [
    { count: entities, error: entityError },
    { count: edges, error: edgeError },
    { count: evidence, error: evidenceError },
    { count: blockedInferences, error: blockedError },
  ] = await Promise.all([
    supabase
      .from("course_graph_entities")
      .select("id", { count: "exact", head: true })
      .eq("import_id", imported.id),
    supabase
      .from("course_graph_edges")
      .select("id", { count: "exact", head: true })
      .eq("import_id", imported.id),
    supabase
      .from("course_graph_evidence")
      .select("id", { count: "exact", head: true })
      .eq("import_id", imported.id),
    supabase
      .from("course_graph_blocked_inferences")
      .select("id", { count: "exact", head: true })
      .eq("import_id", imported.id),
  ]);

  for (const error of [entityError, edgeError, evidenceError, blockedError]) {
    if (error) throw error;
  }

  return {
    schemaReady: true,
    existing: imported,
    entities: entities || 0,
    edges: edges || 0,
    evidence: evidence || 0,
    blockedInferences: blockedInferences || 0,
  };
}

async function main() {
  const args = parseArgs();
  dotenv.config({ path: args.envFile, override: true, quiet: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const targetProjectRef = projectRef(url);
  const localTarget = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(`Missing Supabase credentials in ${args.envFile}`);
  }
  if (!localTarget && (!args.expectedProjectRef || targetProjectRef !== args.expectedProjectRef)) {
    throw new Error(
      `Remote target mismatch: expected=${args.expectedProjectRef || "(required)"}, actual=${targetProjectRef || "(unknown)"}`,
    );
  }

  const productionRef = productionProjectRef();
  if (
    targetProjectRef &&
    productionRef &&
    targetProjectRef === productionRef &&
    !args.allowProduction
  ) {
    throw new Error(
      "Production target refused. Candidate import requires a separate --allow-production approval.",
    );
  }

  const bundle = JSON.parse(
    readFileSync(args.input, "utf8"),
  ) as CourseGraphCandidateBundle;
  const validation = validateCourseGraphCandidateBundle(bundle);
  const before = await currentCounts(bundle);
  const preview = {
    mode: args.apply ? "apply" : "preview",
    target: localTarget ? "local" : targetProjectRef,
    envProfile: basename(args.envFile),
    schemaReady: before.schemaReady,
    bundle: bundle.bundle_slug,
    bundleHash: stableHash(bundle),
    incoming: validation,
    existing: {
      entities: before.entities,
      edges: before.edges,
      evidence: before.evidence,
      blockedInferences: before.blockedInferences,
    },
  };

  console.log(JSON.stringify(preview, null, 2));
  if (!args.apply) return;
  if (!before.schemaReady) {
    throw new Error("Candidate graph schema is not installed on the selected target");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("import_course_graph_candidate", {
    p_bundle: bundle,
  });
  if (error) throw error;

  const after = await currentCounts(bundle);
  if (
    after.entities !== validation.entities ||
    after.edges !== validation.edges ||
    after.evidence !== validation.evidence ||
    after.blockedInferences !== validation.blockedInferences
  ) {
    throw new Error(
      `Post-import count mismatch: ${JSON.stringify({
        expected: validation,
        actual: after,
      })}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        imported: data,
        verified: {
          entities: after.entities,
          edges: after.edges,
          evidence: after.evidence,
          blockedInferences: after.blockedInferences,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "Course graph candidate import failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
