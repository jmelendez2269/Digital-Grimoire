import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const FIXTURE_EMAIL = "lean-l5-02-account-ui@example.test";
const FIXTURE_MARKER = "lean-l5-02-account-ui-v1";

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
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
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
  if (error || !data.user)
    throw error ?? new Error("Fixture Auth user missing");
  if (data.user.user_metadata?.fixture_marker !== FIXTURE_MARKER) {
    throw new Error("Refusing unowned account with fixture email");
  }
  return account;
}

async function setup() {
  const password = required("LEAN_L5_02_FIXTURE_PASSWORD");
  if (await profile())
    throw new Error("Fixture already exists; clean it first");

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: FIXTURE_EMAIL,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: "LEAN L5 Account UI",
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
      name: "LEAN L5 Account UI",
      role: "user",
      subscription_status: "free",
      stripe_customer_id: null,
      stripe_subscription_id: null,
    });
    if (profileError) throw profileError;

    const { error: membershipError } = await service
      .from("billing_memberships")
      .insert({
        user_id: created.user.id,
        plan_code: "student",
        stripe_status: "active",
        pricing_cohort: "founding",
        offer_code: "student_founding_monthly",
        billing_interval: "month",
        stripe_customer_id: "cus_LeanL502AccountUi",
        stripe_subscription_id: "sub_LeanL502AccountUi",
        current_period_start: "2026-08-01T00:00:00.000Z",
        current_period_end: "2026-09-01T00:00:00.000Z",
        cancel_at_period_end: true,
        access_until: "2026-09-01T00:00:00.000Z",
        billing_hold: false,
      });
    if (membershipError) throw membershipError;

    const publicClient = createClient(
      url,
      required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
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

    console.log(
      JSON.stringify({
        result: "fixture-ready",
        userFingerprint: fingerprint(created.user.id),
        role: "user",
        plan: "student",
        cohort: "founding",
        status: "active",
        cancellationScheduled: true,
        localOnly: true,
      })
    );
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

  const userFingerprint = fingerprint(account.id);
  const { error: authError } = await service.auth.admin.deleteUser(account.id);
  if (authError) throw authError;
  const { error: profileError } = await service
    .from("users")
    .delete()
    .eq("id", account.id);
  if (profileError) throw profileError;
  if (await profile()) throw new Error("Fixture profile residue remains");

  console.log(
    JSON.stringify({
      result: "fixture-cleaned",
      userFingerprint,
      residue: 0,
    })
  );
}

async function main() {
  const command = process.argv[2];
  if (command === "setup") await setup();
  else if (command === "cleanup") await cleanup();
  else throw new Error("Usage: lean-l5-02-account-ui-fixture.ts setup|cleanup");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Fixture failed");
  process.exitCode = 1;
});
