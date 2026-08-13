import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const FIXTURE_EMAIL = "lean-l5-03-wallet-ui@example.test";
const FIXTURE_MARKER = "lean-l5-03-wallet-ui-v1";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(url)) {
  throw new Error(`Refusing non-local Supabase URL: ${url}`);
}

const service = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const parts = [value.code, value.message, value.details, value.hint].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );
    if (parts.length) return parts.join(": ");
  }
  return "Fixture failed";
}

async function profile() {
  const { data, error } = await service
    .from("users")
    .select("id, email, role, subscription_status")
    .eq("email", FIXTURE_EMAIL)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ownedFixture() {
  const account = await profile();
  if (!account) return null;
  const { data, error } = await service.auth.admin.getUserById(account.id);
  if (error || !data.user) throw error ?? new Error("Fixture Auth user missing");
  if (data.user.user_metadata?.fixture_marker !== FIXTURE_MARKER) {
    throw new Error("Refusing unowned account with fixture email");
  }
  return account;
}

async function rpc(name: string, parameters: Record<string, unknown>) {
  const { data, error } = await service.rpc(name, parameters);
  if (error) throw error;
  return data;
}

async function setup() {
  const password = required("LEAN_L5_03_FIXTURE_PASSWORD");
  if (await profile()) throw new Error("Fixture already exists; clean it first");

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: FIXTURE_EMAIL,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: "LEAN L5 Wallet UI",
      fixture_marker: FIXTURE_MARKER,
    },
  });
  if (createError || !created.user) {
    throw createError ?? new Error("Fixture Auth user creation failed");
  }

  try {
    const { error: profileError } = await service.from("users").upsert({
      id: created.user.id,
      email: FIXTURE_EMAIL,
      name: "LEAN L5 Wallet UI",
      role: "user",
      subscription_status: "free",
      stripe_customer_id: null,
      stripe_subscription_id: null,
    });
    if (profileError) throw profileError;

    // Keep fixture effective times safely after database-side row creation.
    const started = new Date(Date.now() + 5_000);
    const at = (offsetSeconds: number) =>
      new Date(started.getTime() + offsetSeconds * 1000).toISOString();
    await rpc("sync_monthly_credit_grant_v1", {
      p_user_id: created.user.id,
      p_effective_at: at(0),
    });

    const committedRequest = randomUUID();
    const committedFingerprint = fingerprint(`${FIXTURE_MARKER}:committed`);
    await rpc("reserve_credits_v1", {
      p_user_id: created.user.id,
      p_request_id: committedRequest,
      p_request_fingerprint: committedFingerprint,
      p_action_code: "working.generate",
      p_quoted_credits: 1,
      p_effective_at: at(1),
    });
    await rpc("commit_credit_reservation_v1", {
      p_user_id: created.user.id,
      p_request_id: committedRequest,
      p_request_fingerprint: committedFingerprint,
      p_result_reference: `fixture:${FIXTURE_MARKER}:committed`,
      p_effective_at: at(2),
    });

    const returnedRequest = randomUUID();
    const returnedFingerprint = fingerprint(`${FIXTURE_MARKER}:returned`);
    await rpc("reserve_credits_v1", {
      p_user_id: created.user.id,
      p_request_id: returnedRequest,
      p_request_fingerprint: returnedFingerprint,
      p_action_code: "seven_lenses.standard",
      p_quoted_credits: 2,
      p_effective_at: at(3),
    });
    await rpc("release_credit_reservation_v1", {
      p_user_id: created.user.id,
      p_request_id: returnedRequest,
      p_request_fingerprint: returnedFingerprint,
      p_reason_code: "PROVIDER_ERROR",
      p_effective_at: at(4),
    });

    const pendingRequest = randomUUID();
    await rpc("reserve_credits_v1", {
      p_user_id: created.user.id,
      p_request_id: pendingRequest,
      p_request_fingerprint: fingerprint(`${FIXTURE_MARKER}:pending`),
      p_action_code: "seven_lenses.standard",
      p_quoted_credits: 2,
      p_effective_at: at(5),
    });

    const publicClient = createClient(
      url,
      required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: signIn, error: signInError } =
      await publicClient.auth.signInWithPassword({
        email: FIXTURE_EMAIL,
        password,
      });
    if (signInError || signIn.user?.id !== created.user.id) {
      throw signInError ?? new Error("Fixture password sign-in failed");
    }
    await publicClient.auth.signOut();

    console.log(JSON.stringify({
      result: "fixture-ready",
      userFingerprint: fingerprint(created.user.id).slice(0, 12),
      role: "user",
      plan: "reader",
      availableCredits: 7,
      reservedCredits: 2,
      historyStates: ["committed", "returned", "reserved"],
      localOnly: true,
    }));
  } catch (error) {
    await service.auth.admin.deleteUser(created.user.id);
    await service.from("users").delete().eq("id", created.user.id);
    throw error;
  }
}

async function cleanup() {
  const account = await ownedFixture();
  if (!account) {
    console.log(JSON.stringify({ result: "fixture-already-absent" }));
    return;
  }
  const userFingerprint = fingerprint(account.id).slice(0, 12);
  const { error: authError } = await service.auth.admin.deleteUser(account.id);
  if (authError) throw authError;
  const { error: profileError } = await service.from("users").delete().eq("id", account.id);
  if (profileError) throw profileError;
  if (await profile()) throw new Error("Fixture profile residue remains");

  for (const table of [
    "credit_accounts",
    "credit_grants",
    "credit_reservations",
    "credit_transactions",
  ]) {
    const { count, error } = await service
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", account.id);
    if (error) throw error;
    if ((count ?? 0) !== 0) throw new Error(`${table} fixture residue remains`);
  }

  console.log(JSON.stringify({
    result: "fixture-cleaned",
    userFingerprint,
    residue: 0,
  }));
}

async function main() {
  const command = process.argv[2];
  if (command === "setup") await setup();
  else if (command === "cleanup") await cleanup();
  else throw new Error("Usage: lean-l5-03-wallet-ui-fixture.ts setup|cleanup");
}

main().catch((error) => {
  console.error(safeErrorMessage(error));
  process.exitCode = 1;
});
