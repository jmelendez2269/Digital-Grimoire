import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";

export function inquiryLocalEnv(research = false) {
  const output = execSync("npx.cmd --yes supabase status -o env", {
    cwd: resolve(process.cwd(), ".."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const status: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    if (match) status[match[1]] = match[2];
  }
  const url = status.API_URL;
  if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw new Error("Inquiry verification requires local Supabase.");
  if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY)
    throw new Error("Local Supabase credentials are unavailable.");
  // Only opt-in live research reads provider settings. Database and auth always
  // come from the verified local Supabase instance above.
  const providers = research ? parse(readFileSync(resolve(".env.local"))) : {};
  return {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_COOKIE_NAME: "inquiry-local-auth",
    PRISMARIUM_BUILD_DIR: ".next-inquiry",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3027",
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3027",
    OPENAI_API_KEY: "",
    OPENROUTER_API_KEY: research ? providers.OPENROUTER_API_KEY || "" : "",
    OPENROUTER_MODEL: research ? providers.OPENROUTER_MODEL || "" : "",
    DISCOVERY_MODEL: research ? providers.DISCOVERY_MODEL || "" : "",
    PRISMARIUM_METERING_MODE: "off",
    PRISMARIUM_METERING_ACTION_MODES: research
      ? "deep_search.fresh=enforce"
      : "",
    PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED: research ? "true" : "false",
    PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS: "",
    PRISMARIUM_ENABLED_METERED_ACTIONS: research ? "deep_search.fresh" : "",
    PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS:
      "c01-how-humans-know-what-they-know",
    PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: "c01-how-humans-know-what-they-know",
    PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS: research
      ? "deep_search_generation"
      : "",
    ANTHROPIC_API_KEY: "",
  };
}
