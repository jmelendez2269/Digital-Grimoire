import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  buildCourseGraphCandidateBundle,
  validateCourseGraphCandidateBundle,
  verifyCourseGraphSource,
} from "../src/lib/graph/course-graph-candidate";

function parseArgs() {
  const args = process.argv.slice(2);
  let input = "";
  let output = "";
  let source = "";

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index + 1];
    if ((args[index] === "--input" || args[index] === "-i") && value) {
      input = value;
      index += 1;
    } else if ((args[index] === "--output" || args[index] === "-o") && value) {
      output = value;
      index += 1;
    } else if (args[index] === "--source" && value) {
      source = value;
      index += 1;
    }
  }

  if (!input || !output) {
    throw new Error(
      "Usage: tsx scripts/build-course-graph-candidate.ts --input <candidate.md> --output <bundle.json> [--source <course.md>]",
    );
  }

  return {
    input: resolve(process.cwd(), input),
    output: resolve(process.cwd(), output),
    source: source ? resolve(process.cwd(), source) : "",
  };
}

function main() {
  const paths = parseArgs();
  const markdown = readFileSync(paths.input, "utf8");
  const bundle = buildCourseGraphCandidateBundle(markdown);
  const report = validateCourseGraphCandidateBundle(bundle);

  if (paths.source) {
    verifyCourseGraphSource(bundle, readFileSync(paths.source));
  }

  mkdirSync(dirname(paths.output), { recursive: true });
  writeFileSync(paths.output, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        output: paths.output,
        bundle: bundle.bundle_slug,
        sourceHashVerified: Boolean(paths.source),
        ...report,
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(
    "Course graph candidate build failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
