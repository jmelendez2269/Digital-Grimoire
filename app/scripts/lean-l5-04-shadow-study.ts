import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { chromium, type Browser, type Page } from "playwright-core";
import { parse as parseDotenv } from "dotenv";

import {
  canonicalJson,
  exactAsciiStringForCanonicalBytes,
  LEAN_L5_04_ACTIONS,
  LEAN_L5_04_REQUIRED_SUCCESSES,
  LEAN_L5_04_STUDY_BATCHES,
  scheduleForStudyBatch,
  type LeanL504Action,
  type LeanL504ScheduledRun,
} from "../src/lib/membership/lean-l5-04-shadow-study";

const FIXTURE_MARKER = "lean-l5-04-shadow-study-v1";
const ACCOUNT_LABELS = ["shadow-a", "shadow-b", "shadow-c"] as const;
const SOURCE_INTENTION_ID = "5a040000-0000-4000-8000-000000000010";
const SOURCE_CORRESPONDENCE_ID = "5a040000-0000-4000-8000-000000000020";
const SOURCE_LINK_ID = "5a040000-0000-4000-8000-000000000030";
const APP_PORT = 3017;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const HOSTED_PROJECT_REF = "ukguqtghfglirszsqqdj";
const EVIDENCE_DIR = resolve(
  process.cwd(),
  "../docs/audits/lean-l5-04-shadow-study",
);

const DEFAULT_WEIGHTS = {
  scientific: 30,
  psychological: 30,
  philosophical: 30,
  religious_spiritual: 30,
  historical_anthropological: 30,
  symbolic_occult: 30,
  mathematical: 30,
};

const MAXIMUM_WEIGHTS = Object.fromEntries(
  Object.keys(DEFAULT_WEIGHTS).map((key) => [key, 100]),
) as typeof DEFAULT_WEIGHTS;

type AccountLabel = (typeof ACCOUNT_LABELS)[number];
type FixtureAccount = { id: string; email: string; label: AccountLabel };

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`Missing ${name}`);
  return value.trim();
}

function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

function readConfig(): {
  localUrl: string;
  anonKey: string;
  serviceKey: string;
  anthropicKey: string;
  openRouterKey: string;
  openRouterModel: string;
} {
  const configText = readFileSync(resolve(process.cwd(), "../supabase/config.toml"), "utf8");
  const apiSection = /\[api\]([\s\S]*?)(?:\r?\n\[|$)/.exec(configText)?.[1] ?? "";
  const apiPort = /^port\s*=\s*(\d+)\s*$/m.exec(apiSection)?.[1];
  if (!apiPort) throw new Error("LEAN_L5_04_LOCAL_API_PORT_MISSING");
  const localUrl = `http://127.0.0.1:${apiPort}`;
  if (!isLoopbackUrl(localUrl)) throw new Error("LEAN_L5_04_REFUSED_NON_LOCAL_SUPABASE");

  const localEnv = parseDotenv(
    readFileSync(resolve(process.cwd(), ".env.local.local-supabase"), "utf8"),
  );
  const providerEnv = parseDotenv(
    readFileSync(resolve(process.cwd(), ".env.local"), "utf8"),
  );
  return {
    localUrl,
    anonKey: required(localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, "local anon key"),
    serviceKey: required(localEnv.SUPABASE_SERVICE_ROLE_KEY, "local service key"),
    anthropicKey: required(providerEnv.ANTHROPIC_API_KEY, "Anthropic key"),
    openRouterKey: required(providerEnv.OPENROUTER_API_KEY, "OpenRouter key"),
    openRouterModel: required(providerEnv.OPENROUTER_MODEL, "OpenRouter model"),
  };
}

function fixtureEmail(label: AccountLabel): string {
  return `lean-l5-04-${label}@example.test`;
}

function serviceClient(config: ReturnType<typeof readConfig>): SupabaseClient {
  return createClient(config.localUrl, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function assertLocalStack(config: ReturnType<typeof readConfig>): Promise<void> {
  const response = await fetch(`${config.localUrl}/auth/v1/health`, {
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null);
  if (!response?.ok) throw new Error("LEAN_L5_04_LOCAL_SUPABASE_NOT_RUNNING");
}

async function ownedAccount(
  service: SupabaseClient,
  label: AccountLabel,
): Promise<FixtureAccount | null> {
  const email = fixtureEmail(label);
  const { data: profile, error } = await service
    .from("users")
    .select("id, email, role, subscription_status")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;
  const { data, error: authError } = await service.auth.admin.getUserById(profile.id);
  if (authError || !data.user) throw authError ?? new Error("Fixture auth user missing");
  if (data.user.user_metadata?.fixture_marker !== FIXTURE_MARKER) {
    throw new Error(`LEAN_L5_04_REFUSED_UNOWNED_ACCOUNT:${label}`);
  }
  if (profile.role !== "user" || profile.subscription_status !== "free") {
    throw new Error(`LEAN_L5_04_INVALID_FIXTURE_PROFILE:${label}`);
  }
  return { id: profile.id, email, label };
}

async function ensureSourceFixture(service: SupabaseClient): Promise<void> {
  const { data: existingIntention, error: intentionReadError } = await service
    .from("intentions")
    .select("id, slug")
    .eq("slug", "clarity")
    .maybeSingle();
  if (intentionReadError) throw intentionReadError;
  let intentionId = existingIntention?.id as string | undefined;
  if (!intentionId) {
    const { error } = await service.from("intentions").insert({
      id: SOURCE_INTENTION_ID,
      slug: "clarity",
      label: "clarity",
      aliases: ["focus"],
    });
    if (error) throw error;
    intentionId = SOURCE_INTENTION_ID;
  }

  const { data: existingSource, error: sourceReadError } = await service
    .from("correspondences")
    .select("id, slug, description")
    .eq("id", SOURCE_CORRESPONDENCE_ID)
    .maybeSingle();
  if (sourceReadError) throw sourceReadError;
  if (existingSource && existingSource.slug !== "lean-l5-04-rosemary") {
    throw new Error("LEAN_L5_04_REFUSED_UNOWNED_SOURCE_FIXTURE");
  }
  if (!existingSource) {
    const { error } = await service.from("correspondences").insert({
      id: SOURCE_CORRESPONDENCE_ID,
      slug: "lean-l5-04-rosemary",
      name: "Rosemary",
      category: "herb_garden",
      description: `Local synthetic source fixture (${FIXTURE_MARKER}).`,
      lenses: ["scientific", "symbolic_occult"],
    });
    if (error) throw error;
  }
  const { error: linkError } = await service.from("entity_intentions").upsert({
    id: SOURCE_LINK_ID,
    entity_id: SOURCE_CORRESPONDENCE_ID,
    intention_id: intentionId,
    raw_value: "clarity",
  });
  if (linkError) throw linkError;
}

async function setupFixture(
  service: SupabaseClient,
): Promise<FixtureAccount[]> {
  await ensureSourceFixture(service);
  const accounts: FixtureAccount[] = [];
  for (const label of ACCOUNT_LABELS) {
    let account = await ownedAccount(service, label);
    if (!account) {
      const email = fixtureEmail(label);
      const { data, error } = await service.auth.admin.createUser({
        email,
        password: `${randomUUID()}Aa1!`,
        email_confirm: true,
        user_metadata: {
          display_name: `LEAN L5 Shadow ${label.toUpperCase()}`,
          fixture_marker: FIXTURE_MARKER,
          shadow_account: label,
        },
      });
      if (error || !data.user) throw error ?? new Error("Fixture user creation failed");
      const { error: profileError } = await service.from("users").upsert({
        id: data.user.id,
        email,
        name: `LEAN L5 Shadow ${label.toUpperCase()}`,
        role: "user",
        subscription_status: "free",
        stripe_customer_id: null,
        stripe_subscription_id: null,
      });
      if (profileError) throw profileError;
      account = { id: data.user.id, email, label };
    }
    const { error: grantError } = await service.rpc("sync_monthly_credit_grant_v1", {
      p_user_id: account.id,
      p_effective_at: new Date(Date.now() + 5_000).toISOString(),
    });
    if (grantError) throw grantError;
    accounts.push(account);
  }
  return accounts;
}

function appEnvironment(config: ReturnType<typeof readConfig>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: config.localUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: config.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: config.serviceKey,
    ANTHROPIC_API_KEY: config.anthropicKey,
    OPENROUTER_API_KEY: config.openRouterKey,
    OPENROUTER_MODEL: config.openRouterModel,
    PARALLAX_LENS_MODEL: config.openRouterModel,
    PARALLAX_SYNTHESIS_MODEL: config.openRouterModel,
    NEXT_PUBLIC_SITE_URL: APP_URL,
    PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED: "false",
    PRISMARIUM_ENABLED_MEMBERSHIP_OFFERS: "",
    PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS: "",
    PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG: "",
    PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS:
      "working_generation,seven_lenses_generation,seven_lenses_expansion",
    PRISMARIUM_CHECKOUT_ALLOWED_PRICE_IDS: "",
    PRISMARIUM_ENABLED_METERED_ACTIONS:
      "working.generate,seven_lenses.expand,seven_lenses.standard,seven_lenses.long",
    PRISMARIUM_METERING_MODE: "shadow",
    PRISMARIUM_METERING_ACTION_MODES: "",
    PRISMARIUM_METERING_GLOBAL_KILL_SWITCH: "false",
    PRISMARIUM_METERING_ACTION_KILL_SWITCHES: "",
  };
}

async function startApp(config: ReturnType<typeof readConfig>): Promise<{
  child: ChildProcess;
  stop: () => void;
}> {
  const recentLogs: string[] = [];
  const child = spawn(
    process.platform === "win32"
      ? required(process.env.ComSpec, "ComSpec")
      : "npm",
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd", "run", "dev", "--", "--port", String(APP_PORT)]
      : ["run", "dev", "--", "--port", String(APP_PORT)],
    {
      cwd: process.cwd(),
      env: appEnvironment(config),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const capture = (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/)) {
      if (line.trim()) recentLogs.push(line.replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]"));
    }
    while (recentLogs.length > 30) recentLogs.shift();
  };
  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`LEAN_L5_04_APP_EXITED:${recentLogs.join(" | ")}`);
    }
    const response = await fetch(`${APP_URL}/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(2_000),
    }).catch(() => null);
    if (response) {
      return {
        child,
        stop: () => {
          if (!child.pid) return;
          if (process.platform === "win32") {
            spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
              windowsHide: true,
              stdio: "ignore",
            });
          } else {
            child.kill("SIGTERM");
          }
        },
      };
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }
  throw new Error(`LEAN_L5_04_APP_START_TIMEOUT:${recentLogs.join(" | ")}`);
}

async function dismissCookieConsent(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Essential Only" });
  const appeared = await button.waitFor({ state: "visible", timeout: 1_500 })
    .then(() => true)
    .catch(() => false);
  if (appeared) await button.click();
}

async function signInPage(
  browser: Browser,
  account: FixtureAccount,
  password: string,
  config: ReturnType<typeof readConfig>,
): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1100, height: 850 } });
  const page = await context.newPage();
  const authStatuses: number[] = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.includes("/auth/v1/token")) {
      authStatuses.push(response.status());
    }
  });
  await page.goto(`${APP_URL}/login?redirect=%2Fseven-lenses`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const clientBundle = await page.locator("script[src]").evaluateAll(async (scripts) =>
    (await Promise.all(scripts.map((script) =>
      fetch((script as HTMLScriptElement).src).then((response) => response.text()),
    ))).join("\n"),
  );
  assert.match(clientBundle, new RegExp(config.localUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(clientBundle, new RegExp(HOSTED_PROJECT_REF));
  let signedIn = false;
  for (let attempt = 0; attempt < 3 && !signedIn; attempt += 1) {
    if (!page.url().includes("redirect=")) {
      await page.goto(`${APP_URL}/login?redirect=%2Fseven-lenses`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    }
    await dismissCookieConsent(page);
    await page.getByLabel("Email Address").fill(account.email);
    await page.getByLabel("Password").fill(password);
    const submit = page.getByRole("button", { name: /^Sign In/ });
    await submit.waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForFunction(() => {
      const button = document.querySelector<HTMLButtonElement>('button[type="submit"]');
      return button !== null && !button.disabled;
    });
    await page.waitForTimeout(750);
    await submit.click();
    signedIn = await page.waitForURL("**/seven-lenses**", { timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!signedIn) await page.waitForTimeout(1_000);
  }
  if (!signedIn) {
    const summary = (await page.locator("body").innerText().catch(() => ""))
      .replace(/\s+/g, " ")
      .slice(0, 400);
    throw new Error(
      `LEAN_L5_04_LOCAL_BROWSER_LOGIN_FAILED:authStatuses=${authStatuses.join(",") || "none"}:${summary}`,
    );
  }
  return page;
}

async function postJson(
  page: Page,
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  return page.evaluate(async ({ path: requestPath, body: requestBody }) => {
    const response = await fetch(requestPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    return { status: response.status, data: await response.json() as Record<string, unknown> };
  }, { path, body });
}

async function postSse(
  page: Page,
  body: Record<string, unknown>,
): Promise<{ status: number; events: Array<Record<string, unknown>> }> {
  return page.evaluate(async (requestBody) => {
    const response = await fetch("/api/parallax/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const text = await response.text();
    const events = text
      .split(/\n\n+/)
      .map((entry) => entry.replace(/^data:\s*/, "").trim())
      .filter(Boolean)
      .map((entry) => JSON.parse(entry) as Record<string, unknown>);
    return { status: response.status, events };
  }, body);
}

function maxWorkingIntention(): string {
  return exactAsciiStringForCanonicalBytes({
    prefix: "clarity ",
    maxBytes: 4_000,
    buildValue: (value) => ({ intention: value }),
  });
}

function sevenLensesInput(run: LeanL504ScheduledRun): {
  query: string;
  lensWeights: typeof DEFAULT_WEIGHTS;
  responseLength: "short" | "medium" | "long";
  canonicalBytes: number;
} {
  const responseLength = run.actionCode === "seven_lenses.long" ? "long" :
    run.inputProfile === "maximum" ? "medium" : "short";
  const lensWeights = run.inputProfile === "maximum" ? MAXIMUM_WEIGHTS : DEFAULT_WEIGHTS;
  const buildValue = (query: string) => ({ query, lensWeights, responseLength });
  const query = run.inputProfile === "maximum"
    ? exactAsciiStringForCanonicalBytes({
        prefix: "Examine this synthetic maximum-size question: ",
        maxBytes: 16_000,
        buildValue,
      })
    : "How can clarity and disciplined reflection improve a difficult decision?";
  return {
    query,
    lensWeights,
    responseLength,
    canonicalBytes: Buffer.byteLength(canonicalJson(buildValue(query)), "utf8"),
  };
}

async function executeRun(input: {
  page: Page;
  run: LeanL504ScheduledRun;
  parentId: string | null;
}): Promise<{ parentId: string | null; chargedCredits: number; canonicalBytes: number }> {
  if (input.run.actionCode === "working.generate") {
    const intention = input.run.inputProfile === "maximum"
      ? maxWorkingIntention()
      : "clarity";
    const response = await postJson(input.page, "/api/working/generate", {
      intention,
      requestId: randomUUID(),
    });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.chargedCredits, 0);
    assert.equal(response.data.replayed, false);
    return {
      parentId: input.parentId,
      chargedCredits: 0,
      canonicalBytes: Buffer.byteLength(canonicalJson({ intention }), "utf8"),
    };
  }

  if (input.run.actionCode === "seven_lenses.expand") {
    assert.ok(input.parentId, "Expansion requires the same account's saved parent");
    const response = await postJson(
      input.page,
      `/api/parallax/lens/${input.run.lensId ?? "scientific"}`,
      { parentResponseId: input.parentId, requestId: randomUUID() },
    );
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.chargedCredits, 0);
    assert.equal(response.data.replayed, false);
    return {
      parentId: input.parentId,
      chargedCredits: 0,
      canonicalBytes: Buffer.byteLength(canonicalJson({
        parentResponseId: input.parentId,
        lensId: input.run.lensId ?? "scientific",
      }), "utf8"),
    };
  }

  const request = sevenLensesInput(input.run);
  const response = await postSse(input.page, {
    query: request.query,
    lensWeights: request.lensWeights,
    responseLength: request.responseLength,
    requestId: randomUUID(),
  });
  assert.equal(response.status, 200);
  const errorEvent = response.events.find((event) => event.type === "error");
  assert.equal(errorEvent, undefined, JSON.stringify(errorEvent));
  const done = response.events.find((event) => event.type === "done");
  assert.ok(done, "Seven Lenses did not emit a durable done event");
  assert.equal(done.chargedCredits, 0);
  assert.equal(done.replayed, false);
  const result = done.response as Record<string, unknown>;
  assert.match(String(result.id), /^[0-9a-f-]{36}$/i);
  return {
    parentId:
      input.run.actionCode === "seven_lenses.standard"
        ? String(result.id)
        : input.parentId,
    chargedCredits: 0,
    canonicalBytes: request.canonicalBytes,
  };
}

interface EvidencePacket {
  studyBatch?: number;
  studyDay?: number;
  utcDate: string;
  recordedAt?: string;
  successCount: number;
  totalEstimatedProviderCostUsd: number;
  runs: Array<{
    actionCode: LeanL504Action;
    inputProfile: string;
    estimatedCostUsd: number;
  }>;
}

function evidencePackets(): EvidencePacket[] {
  if (!existsSync(EVIDENCE_DIR)) return [];
  return readdirSync(EVIDENCE_DIR)
    .filter((name) => /^\d{4}-\d{2}-\d{2}(?:-batch-\d{2})?\.json$/.test(name))
    .map((name) => JSON.parse(
      readFileSync(resolve(EVIDENCE_DIR, name), "utf8"),
    ) as EvidencePacket)
    .sort((left, right) =>
      (left.studyBatch ?? left.studyDay ?? 0) -
      (right.studyBatch ?? right.studyDay ?? 0),
    );
}

function expectedStudyBatch(): number {
  const packets = evidencePackets();
  for (const [index, packet] of packets.entries()) {
    if ((packet.studyBatch ?? packet.studyDay) !== index + 1) {
      throw new Error("LEAN_L5_04_EVIDENCE_BATCH_SEQUENCE_INVALID");
    }
  }
  const batchNumber = packets.length + 1;
  if (batchNumber > LEAN_L5_04_STUDY_BATCHES) {
    throw new Error("LEAN_L5_04_SUCCESS_MATRIX_ALREADY_COMPLETE");
  }
  return batchNumber;
}

async function countCreditArtifacts(service: SupabaseClient, userIds: string[]) {
  const result: Record<string, number> = {};
  for (const table of ["credit_transactions", "credit_reservations"] as const) {
    const { count, error } = await service
      .from(table)
      .select("*", { count: "exact", head: true })
      .in("user_id", userIds);
    if (error) throw error;
    result[table] = count ?? 0;
  }
  return result;
}

async function studyRowsSince(
  service: SupabaseClient,
  accounts: FixtureAccount[],
  startedAt: string,
) {
  const userIds = accounts.map((account) => account.id);
  const { data: requests, error: requestError } = await service
    .from("ai_metering_requests")
    .select("id,user_id,action_code,quoted_credits,mode,plan_code,estimated_cost_usd,actual_cost_usd,state,outcome,started_at,completed_at")
    .in("user_id", userIds)
    .gte("started_at", startedAt)
    .order("started_at", { ascending: true });
  if (requestError) throw requestError;
  const requestIds = (requests ?? []).map((row) => row.id);
  const { data: usages, error: usageError } = requestIds.length
    ? await service
        .from("ai_usage_events")
        .select("metering_request_id,provider,model,input_units,output_units,latency_ms,estimated_cost_usd,outcome,error_class")
        .in("metering_request_id", requestIds)
    : { data: [], error: null };
  if (usageError) throw usageError;
  return { requests: requests ?? [], usages: usages ?? [] };
}

async function runBatch(
  config: ReturnType<typeof readConfig>,
  service: SupabaseClient,
  accounts: FixtureAccount[],
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const batchNumber = expectedStudyBatch();
  const batchStartedAt =
    evidencePackets().at(-1)?.recordedAt ??
    new Date(Date.now() - 2_000).toISOString();
  const existing = await studyRowsSince(service, accounts, batchStartedAt);
  if (existing.requests.some((request) => request.outcome === "succeeded")) {
    throw new Error("LEAN_L5_04_UNRECORDED_DAY_SUCCESSES_EXIST");
  }
  const creditBefore = await countCreditArtifacts(service, accounts.map((account) => account.id));
  const passwords = new Map<AccountLabel, string>();
  for (const account of accounts) {
    const password = `${randomUUID()}Aa1!`;
    const { error } = await service.auth.admin.updateUserById(account.id, { password });
    if (error) throw error;
    const publicClient = createClient(config.localUrl, config.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: signInError } = await publicClient.auth.signInWithPassword({
      email: account.email,
      password,
    });
    if (signInError || signIn.user?.id !== account.id) {
      throw signInError ?? new Error("LEAN_L5_04_LOCAL_PASSWORD_PREFLIGHT_FAILED");
    }
    await publicClient.auth.signOut();
    passwords.set(account.label, password);
  }

  const app = await startApp(config);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      headless: true,
    });
    const pages = new Map<AccountLabel, Page>();
    let checkoutRequests = 0;
    for (const account of accounts) {
      const page = await signInPage(
        browser,
        account,
        required(passwords.get(account.label), "rotated fixture password"),
        config,
      );
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.toLowerCase().includes("checkout")) {
          checkoutRequests += 1;
        }
      });
      pages.set(account.label, page);
    }

    const schedule = scheduleForStudyBatch(batchNumber);
    const parents = new Map<AccountLabel, string>();
    const plannedRuns: Array<{
      actionCode: LeanL504Action;
      account: AccountLabel;
      inputProfile: string;
      canonicalInputBytes: number;
      chargedCredits: number;
    }> = [];
    for (const run of schedule) {
      console.log(JSON.stringify({
        result: "shadow-run-start",
        studyBatch: batchNumber,
        run: plannedRuns.length + 1,
        totalRuns: schedule.length,
        account: accounts[run.accountOffset].label,
        actionCode: run.actionCode,
        inputProfile: run.inputProfile,
      }));
      const account = accounts[run.accountOffset];
      const page = pages.get(account.label);
      assert.ok(page);
      const executed = await executeRun({
        page,
        run,
        parentId: parents.get(account.label) ?? null,
      });
      if (executed.parentId) parents.set(account.label, executed.parentId);
      plannedRuns.push({
        actionCode: run.actionCode,
        account: account.label,
        inputProfile: run.inputProfile,
        canonicalInputBytes: executed.canonicalBytes,
        chargedCredits: executed.chargedCredits,
      });
    }
    assert.equal(checkoutRequests, 0);

    const rows = await studyRowsSince(service, accounts, batchStartedAt);
    const successfulRequests = rows.requests.filter((row) => row.outcome === "succeeded");
    const successfulRequestIds = new Set(successfulRequests.map((row) => row.id));
    const successfulUsages = rows.usages.filter((row) =>
      successfulRequestIds.has(row.metering_request_id),
    );
    const excludedRequests = rows.requests.filter((row) => row.outcome !== "succeeded");
    assert.equal(
      successfulRequests.length,
      schedule.length,
      `Expected exactly ${schedule.length} shadow successes`,
    );
    assert.equal(
      successfulUsages.length,
      schedule.length,
      `Expected exactly ${schedule.length} successful usage rows`,
    );
    assert.ok(successfulRequests.every((row) =>
      row.mode === "shadow" && row.state === "completed" && row.outcome === "succeeded" &&
      row.plan_code === "reader" && row.actual_cost_usd !== null,
    ));
    assert.ok(successfulUsages.every((row) =>
      row.outcome === "succeeded" && row.error_class === null,
    ));
    const creditAfter = await countCreditArtifacts(service, accounts.map((account) => account.id));
    assert.deepEqual(creditAfter, creditBefore, "Shadow runs must not reserve or commit credits");
    assert.equal(creditAfter.credit_reservations, 0);

    const labelById = new Map(accounts.map((account) => [account.id, account.label]));
    const usageByRequest = new Map(rows.usages.map((usage) => [usage.metering_request_id, usage]));
    const queues = new Map<LeanL504Action, typeof plannedRuns>();
    for (const run of plannedRuns) {
      const queue = queues.get(run.actionCode) ?? [];
      queue.push(run);
      queues.set(run.actionCode, queue);
    }
    const evidenceRuns = successfulRequests.map((request) => {
      const actionCode = request.action_code as LeanL504Action;
      const planned = queues.get(actionCode)?.shift();
      assert.ok(planned, `Unexpected completed action ${actionCode}`);
      assert.equal(labelById.get(request.user_id), planned.account);
      const usage = usageByRequest.get(request.id);
      assert.ok(usage, "Missing usage row");
      return {
        account: planned.account,
        actionCode,
        inputProfile: planned.inputProfile,
        canonicalInputBytes: planned.canonicalInputBytes,
        quotedCredits: request.quoted_credits,
        chargedCredits: planned.chargedCredits,
        provider: usage.provider,
        model: usage.model,
        inputUnits: usage.input_units,
        outputUnits: usage.output_units,
        latencyMs: usage.latency_ms,
        estimatedCostUsd: Number(usage.estimated_cost_usd),
        requestActualCostUsd: Number(request.actual_cost_usd),
        outcome: request.outcome,
      };
    });
    const excludedHarnessAttempts = excludedRequests.map((request) => {
      const usage = usageByRequest.get(request.id);
      return {
        actionCode: request.action_code,
        outcome: request.outcome,
        provider: usage?.provider ?? null,
        model: usage?.model ?? null,
        errorClass: usage?.error_class ?? null,
        estimatedCostUsd: Number(usage?.estimated_cost_usd ?? request.actual_cost_usd ?? 0),
        countedAsSuccess: false,
        countedInFailureAbortRetryMatrix: false,
      };
    });

    mkdirSync(EVIDENCE_DIR, { recursive: true });
    const path = resolve(
      EVIDENCE_DIR,
      `${today}-batch-${String(batchNumber).padStart(2, "0")}.json`,
    );
    if (existsSync(path)) throw new Error("LEAN_L5_04_REFUSED_EVIDENCE_OVERWRITE");
    const totalCostUsd = evidenceRuns.reduce((sum, run) => sum + run.estimatedCostUsd, 0);
    writeFileSync(path, `${JSON.stringify({
      schemaVersion: 1,
      packet: "LEAN-L5-04",
      studyBatch: batchNumber,
      utcDate: today,
      recordedAt: new Date().toISOString(),
      environment: {
        application: APP_URL,
        supabase: config.localUrl,
        localOnly: true,
        meteringMode: "shadow",
        paidSalesEnabled: false,
        checkoutEnabled: false,
        courseReleaseChanged: false,
        billingOperationPerformed: false,
        productionCreditActionPerformed: false,
        productionMeteredRouteChanged: false,
      },
      priceSnapshot: {
        verifiedOn: "2026-08-12",
        anthropicHaiku45UsdPerMillion: { input: 1, output: 5 },
        openRouterQwen3Next80bObservedListUsdPerMillion: { input: 0.09, output: 1.1 },
        stripeUsCard: { percent: 2.9, fixedUsd: 0.3 },
        stripeBillingPercent: 0.7,
        vercel: {
          invocationUsd: 0.0000006,
          activeCpuUsdPerHourFrom: 0.128,
          provisionedMemoryUsdPerGbHourFrom: 0.0106,
        },
      },
      successCount: evidenceRuns.length,
      totalEstimatedProviderCostUsd:
        Math.round(totalCostUsd * 1_000_000) / 1_000_000,
      runs: evidenceRuns,
      separateFailureAbortRetryCount: 0,
      excludedHarnessAttempts,
      privacy: {
        promptsOrResponsesRecorded: false,
        rawUserIdsRecorded: false,
        providerRequestIdsRecorded: false,
      },
    }, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
      result: "shadow-batch-recorded",
      studyBatch: batchNumber,
      utcDate: today,
      successes: evidenceRuns.length,
      accounts: ACCOUNT_LABELS,
      totalEstimatedProviderCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
      shadowCreditMutations: 0,
      checkoutRequests,
      evidence: path,
    }));
  } finally {
    await browser?.close().catch(() => undefined);
    app.stop();
  }
}

async function status(): Promise<void> {
  const packets = evidencePackets();
  const successes = packets.flatMap((packet) => packet.runs);
  const byAction = Object.fromEntries(
    LEAN_L5_04_ACTIONS
      .map((action) => [action, successes.filter((row) => row.actionCode === action).length]),
  );
  const maximumCoverage = {
    working: successes.some((run) =>
      run.actionCode === "working.generate" && run.inputProfile === "maximum"),
    expansion: successes.some((run) =>
      run.actionCode === "seven_lenses.expand" &&
      run.inputProfile === "maximum-derived-parent"),
    standard: successes.some((run) =>
      run.actionCode === "seven_lenses.standard" && run.inputProfile === "maximum"),
    long: successes.some((run) =>
      run.actionCode === "seven_lenses.long" && run.inputProfile === "maximum"),
  };
  const successMatrixComplete =
    packets.length === LEAN_L5_04_STUDY_BATCHES &&
    successes.length >= LEAN_L5_04_REQUIRED_SUCCESSES &&
    Object.values(byAction).every((count) => count >= 5) &&
    Object.values(maximumCoverage).every(Boolean);
  console.log(JSON.stringify({
    result: "shadow-study-status",
    recordedBatches: packets.map((packet) => ({
      batch: packet.studyBatch ?? packet.studyDay,
      utcDate: packet.utcDate,
      successes: packet.successCount,
    })),
    successes: successes.length,
    byAction,
    maximumCoverage,
    totalEstimatedProviderCostUsd: Math.round(
      successes.reduce((sum, row) => sum + Number(row.estimatedCostUsd), 0) * 1_000_000,
    ) / 1_000_000,
    successMatrixComplete,
  }));
}

async function unrecordedStatus(
  service: SupabaseClient,
  accounts: FixtureAccount[],
): Promise<void> {
  const since = evidencePackets().at(-1)?.recordedAt ?? "1970-01-01T00:00:00.000Z";
  const rows = await studyRowsSince(service, accounts, since);
  const usageByRequest = new Map(rows.usages.map((usage) => [usage.metering_request_id, usage]));
  console.log(JSON.stringify({
    result: "shadow-unrecorded-attempt-status",
    since,
    attempts: rows.requests.map((request) => {
      const usage = usageByRequest.get(request.id);
      return {
        actionCode: request.action_code,
        state: request.state,
        outcome: request.outcome,
        provider: usage?.provider ?? null,
        errorClass: usage?.error_class ?? null,
        estimatedCostUsd: Number(usage?.estimated_cost_usd ?? request.actual_cost_usd ?? 0),
        startedAt: request.started_at,
        completedAt: request.completed_at,
      };
    }),
  }));
}

async function cleanup(service: SupabaseClient): Promise<void> {
  const accounts = (await Promise.all(
    ACCOUNT_LABELS.map((label) => ownedAccount(service, label)),
  )).filter((account): account is FixtureAccount => account !== null);
  const userIds = accounts.map((account) => account.id);
  if (userIds.length) {
    for (const table of [
      "convergence_lens_expansions",
      "convergence_responses",
      "workings",
      "ai_usage_events",
      "ai_metering_requests",
      "credit_transactions",
      "credit_reservations",
      "credit_grants",
      "credit_accounts",
      "billing_memberships",
    ]) {
      const { error } = await service.from(table).delete().in("user_id", userIds);
      if (error) throw error;
    }
    for (const account of accounts) {
      const { error } = await service.auth.admin.deleteUser(account.id);
      if (error) throw error;
      await service.from("users").delete().eq("id", account.id);
    }
  }
  await service.from("entity_intentions").delete().eq("id", SOURCE_LINK_ID);
  await service.from("correspondences").delete().eq("id", SOURCE_CORRESPONDENCE_ID);
  await service.from("intentions").delete().eq("id", SOURCE_INTENTION_ID);
  const residue = (await Promise.all(
    ACCOUNT_LABELS.map((label) => ownedAccount(service, label)),
  )).filter(Boolean).length;
  if (residue !== 0) throw new Error("LEAN_L5_04_FIXTURE_RESIDUE_REMAINS");
  console.log(JSON.stringify({ result: "shadow-fixture-cleaned", residue: 0 }));
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "status") {
    await status();
    return;
  }
  const config = readConfig();
  await assertLocalStack(config);
  const service = serviceClient(config);
  if (command === "setup") {
    const accounts = await setupFixture(service);
    console.log(JSON.stringify({
      result: "shadow-fixture-ready",
      accounts: accounts.map((account) => account.label),
      localSupabase: config.localUrl,
      productionMutation: false,
    }));
    return;
  }
  if (command === "cleanup") {
    await cleanup(service);
    return;
  }
  const accounts = await setupFixture(service);
  if (command === "unrecorded-status") {
    await unrecordedStatus(service, accounts);
    return;
  }
  if (command === "run-batch") {
    await runBatch(config, service, accounts);
    return;
  }
  throw new Error(
    "Usage: lean-l5-04-shadow-study.ts setup|run-batch|status|unrecorded-status|cleanup",
  );
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const safe = [value.code, value.message, value.details, value.hint]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(": ")
      .replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]")
      .slice(0, 700);
    console.error(safe || "LEAN_L5_04_FAILED");
  } else {
    console.error("LEAN_L5_04_FAILED");
  }
  process.exitCode = 1;
});
