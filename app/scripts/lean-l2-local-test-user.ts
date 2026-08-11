import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const FIXTURE_EMAIL = "lean-l2-membership-reader@example.test";
const FIXTURE_MARKER = "lean-l2-local-membership-reader-v1";

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
    .select(
      "id, email, role, subscription_status, stripe_customer_id, stripe_subscription_id",
    )
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
  return { account, authUser: data.user };
}

async function setup() {
  const password = required("LEAN_L2_LOCAL_TEST_USER_PASSWORD");
  if (await profile()) {
    throw new Error("Fixture user already exists; run inspect or cleanup");
  }

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: FIXTURE_EMAIL,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: "LEAN L2 Membership Reader",
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
      name: "LEAN L2 Membership Reader",
      role: "user",
      subscription_status: "free",
      stripe_customer_id: null,
      stripe_subscription_id: null,
    });
    if (profileError) throw profileError;

    const fixture = await ownedFixture();
    if (
      !fixture ||
      fixture.account.role !== "user" ||
      fixture.account.subscription_status !== "free" ||
      fixture.account.stripe_customer_id !== null ||
      fixture.account.stripe_subscription_id !== null
    ) {
      throw new Error("Fixture profile failed the regular Reader checks");
    }

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
    if (signInError || signIn.user?.id !== fixture.account.id) {
      throw signInError ?? new Error("Fixture password sign-in failed");
    }
    await publicClient.auth.signOut();

    console.log(
      JSON.stringify(
        {
          result: "fixture-ready",
          localUrl: url,
          userFingerprint: fingerprint(fixture.account.id),
          role: fixture.account.role,
          subscription: fixture.account.subscription_status,
          admin: false,
          passwordSignInVerified: true,
          hasLegacyStripeCustomer: false,
          hasLegacyStripeSubscription: false,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await service.auth.admin.deleteUser(created.user.id);
    throw error;
  }
}

async function inspect() {
  const fixture = await ownedFixture();
  if (!fixture) throw new Error("Fixture user is missing");

  const { data: membership, error: membershipError } = await service
    .from("billing_memberships")
    .select("plan_code, stripe_status, billing_hold")
    .eq("user_id", fixture.account.id)
    .maybeSingle();
  if (membershipError) throw membershipError;

  console.log(
    JSON.stringify(
      {
        result: "fixture-inspected",
        localUrl: url,
        userFingerprint: fingerprint(fixture.account.id),
        role: fixture.account.role,
        subscription: fixture.account.subscription_status,
        admin: fixture.account.role === "admin",
        hasLegacyStripeCustomer: Boolean(fixture.account.stripe_customer_id),
        hasLegacyStripeSubscription: Boolean(
          fixture.account.stripe_subscription_id,
        ),
        billingProjection: membership ?? {
          plan_code: "reader",
          stripe_status: "none",
          billing_hold: false,
          source: "missing-row-default",
        },
      },
      null,
      2,
    ),
  );
}

async function cleanup() {
  const fixture = await ownedFixture();
  if (!fixture) {
    console.log(JSON.stringify({ result: "fixture-already-absent" }));
    return;
  }

  const { error: authError } = await service.auth.admin.deleteUser(
    fixture.account.id,
  );
  if (authError) throw authError;

  const { error: profileError } = await service
    .from("users")
    .delete()
    .eq("id", fixture.account.id);
  if (profileError) throw profileError;

  const remaining = await profile();
  if (remaining) throw new Error("Fixture profile residue remains");

  console.log(
    JSON.stringify({
      result: "fixture-cleaned",
      userFingerprint: fingerprint(fixture.account.id),
      residue: 0,
    }),
  );
}

async function main() {
  const [command] = process.argv.slice(2);
  if (command === "setup") return setup();
  if (command === "inspect") return inspect();
  if (command === "cleanup") return cleanup();
  throw new Error(
    "Usage: lean-l2-local-test-user.ts <setup|inspect|cleanup>",
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
