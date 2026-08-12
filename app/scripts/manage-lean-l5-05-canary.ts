/**
 * Guarded LEAN-L5-05 production canary identity helper.
 *
 * This script never lists users and never emits email, UUID, credentials, or
 * Stripe identifiers. Inspect is read-only. setup-admin and cleanup require a
 * separate --apply flag in addition to exact production/project confirmation.
 */

import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CANARY_MARKER = "lean-l5-05-production-canary-v1";
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FINGERPRINT_PATTERN = /^[a-f0-9]{12}$/;
const TERMINAL_STRIPE_STATUSES = new Set(["canceled", "incomplete_expired"]);

type CanaryAction = "inspect" | "setup-admin" | "cleanup";

export interface CanaryArguments {
  action: CanaryAction;
  apply: boolean;
  confirmProduction: boolean;
  expectedProjectRef: string;
  expectedUserFingerprint: string | null;
}

interface CanaryProfile {
  id: string;
  email: string;
  role: string;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_required_environment:${name}`);
  return value;
}

export function parseCanaryArguments(argv: string[]): CanaryArguments {
  const [actionValue, ...rest] = argv;
  if (
    actionValue !== "inspect" &&
    actionValue !== "setup-admin" &&
    actionValue !== "cleanup"
  ) {
    throw new Error("invalid_action");
  }

  const values = new Map<string, string>();
  let apply = false;
  let confirmProduction = false;
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--apply") {
      apply = true;
      continue;
    }
    if (argument === "--confirm-production") {
      confirmProduction = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error("invalid_argument");
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) throw new Error("missing_argument_value");
    values.set(argument, value.trim());
    index += 1;
  }

  const expectedProjectRef = values.get("--expected-project-ref") ?? "";
  const expectedUserFingerprint =
    values.get("--expected-user-fingerprint")?.toLowerCase() ?? null;
  if (!confirmProduction || !/^[a-z]{20}$/.test(expectedProjectRef)) {
    throw new Error("production_confirmation_required");
  }
  if (actionValue !== "inspect" && !apply) {
    throw new Error("apply_required_for_mutation");
  }
  if (
    actionValue === "cleanup" &&
    (!expectedUserFingerprint ||
      !FINGERPRINT_PATTERN.test(expectedUserFingerprint))
  ) {
    throw new Error("expected_user_fingerprint_required");
  }

  return {
    action: actionValue,
    apply,
    confirmProduction,
    expectedProjectRef,
    expectedUserFingerprint,
  };
}

export function projectRefFromSupabaseUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const match = /^([a-z]{20})\.supabase\.co$/i.exec(url.hostname);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

async function exactProfileByEmail(
  service: SupabaseClient,
  email: string,
): Promise<CanaryProfile | null> {
  const result = await service
    .from("users")
    .select(
      "id,email,role,subscription_status,stripe_customer_id,stripe_subscription_id",
    )
    .eq("email", email)
    .limit(2);
  if (result.error) throw new Error(`profile_lookup_failed:${result.error.code}`);
  if ((result.data ?? []).length > 1) throw new Error("profile_lookup_ambiguous");
  return (result.data?.[0] as CanaryProfile | undefined) ?? null;
}

async function exactOwnedCanary(
  service: SupabaseClient,
  email: string,
): Promise<CanaryProfile | null> {
  const profile = await exactProfileByEmail(service, email);
  if (!profile) return null;
  if (!UUID_V4_PATTERN.test(profile.id)) throw new Error("profile_id_invalid");

  const auth = await service.auth.admin.getUserById(profile.id);
  if (auth.error || !auth.data.user) throw new Error("auth_user_lookup_failed");
  const authEmail = auth.data.user.email?.trim().toLowerCase();
  if (
    authEmail !== email ||
    !auth.data.user.email_confirmed_at ||
    auth.data.user.user_metadata?.fixture_marker !== CANARY_MARKER ||
    profile.role !== "user" ||
    profile.subscription_status !== "free" ||
    profile.stripe_customer_id !== null ||
    profile.stripe_subscription_id !== null
  ) {
    throw new Error("canary_ownership_or_reader_contract_failed");
  }
  return profile;
}

async function safeUserCount(
  service: SupabaseClient,
  table: string,
  userId: string,
): Promise<{ table: string; available: boolean; count: number | null }> {
  const result = await service
    .from(table)
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);
  return {
    table,
    available: !result.error,
    count: result.error ? null : (result.count ?? 0),
  };
}

async function inspectCanary(
  service: SupabaseClient,
  email: string,
  projectRef: string,
): Promise<void> {
  const profile = await exactOwnedCanary(service, email);
  if (!profile) {
    console.log(
      JSON.stringify({
        result: "canary-absent",
        projectRefMatches: true,
        targetEmailFingerprint: fingerprint(email),
        rawIdentityEmitted: false,
        externalMutations: 0,
      }),
    );
    return;
  }

  const counts = await Promise.all(
    [
      "billing_memberships",
      "billing_checkout_requests",
      "credit_accounts",
      "credit_grants",
      "credit_reservations",
      "credit_transactions",
      "ai_usage_events",
      "course_enrollments",
      "course_progress",
      "journal_pages",
    ].map((table) => safeUserCount(service, table, profile.id)),
  );
  console.log(
    JSON.stringify(
      {
        result: "canary-inspected",
        projectRef,
        projectRefMatches: true,
        userFingerprint: fingerprint(profile.id),
        targetEmailFingerprint: fingerprint(email),
        role: profile.role,
        emailVerified: true,
        legacyBillingIdentifiersAbsent: true,
        ownedMarker: true,
        counts,
        rawIdentityEmitted: false,
        externalMutations: 0,
      },
      null,
      2,
    ),
  );
}

async function setupAdminCanary(
  service: SupabaseClient,
  email: string,
): Promise<void> {
  if (await exactProfileByEmail(service, email)) {
    throw new Error("refusing_existing_profile");
  }
  const password = requiredEnvironment("LEAN_L5_05_CANARY_PASSWORD");
  if (password.length < 20) throw new Error("canary_password_too_short");

  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: "Prismarium Production Canary",
      fixture_marker: CANARY_MARKER,
    },
  });
  if (created.error || !created.data.user) throw new Error("auth_create_failed");

  try {
    const profile = await service.from("users").upsert({
      id: created.data.user.id,
      email,
      name: "Prismarium Production Canary",
      role: "user",
      subscription_status: "free",
      stripe_customer_id: null,
      stripe_subscription_id: null,
    });
    if (profile.error) throw new Error(`profile_create_failed:${profile.error.code}`);

    const verified = await exactOwnedCanary(service, email);
    if (!verified || verified.id !== created.data.user.id) {
      throw new Error("created_canary_verification_failed");
    }
    console.log(
      JSON.stringify({
        result: "canary-created",
        userFingerprint: fingerprint(verified.id),
        role: "user",
        emailVerified: true,
        legacyBillingIdentifiersAbsent: true,
        rawIdentityEmitted: false,
        externalMutations: 2,
      }),
    );
  } catch (error) {
    await service.auth.admin.deleteUser(created.data.user.id);
    throw error;
  }
}

async function cleanupCanary(
  service: SupabaseClient,
  email: string,
  expectedFingerprint: string,
): Promise<void> {
  const profile = await exactOwnedCanary(service, email);
  if (!profile) throw new Error("canary_missing");
  const actualFingerprint = fingerprint(profile.id);
  if (actualFingerprint !== expectedFingerprint) {
    throw new Error("canary_fingerprint_mismatch");
  }

  const memberships = await service
    .from("billing_memberships")
    .select("stripe_status,billing_hold")
    .eq("user_id", profile.id)
    .limit(2);
  if (memberships.error) {
    throw new Error(`membership_terminal_check_failed:${memberships.error.code}`);
  }
  if ((memberships.data ?? []).length > 1) {
    throw new Error("membership_ambiguous");
  }
  const membership = memberships.data?.[0];
  if (
    membership &&
    (!TERMINAL_STRIPE_STATUSES.has(membership.stripe_status) ||
      membership.billing_hold !== false)
  ) {
    throw new Error("membership_not_terminal");
  }

  const deletion = await service.auth.admin.deleteUser(profile.id);
  if (deletion.error) throw new Error("auth_delete_failed");
  const residue = await exactProfileByEmail(service, email);
  if (residue) throw new Error("profile_residue_after_auth_delete");

  console.log(
    JSON.stringify({
      result: "canary-cleaned",
      userFingerprint: actualFingerprint,
      terminalMembershipVerified: true,
      profileResidue: 0,
      stripeFinancialHistoryDeleted: false,
      rawIdentityEmitted: false,
      externalMutations: 1,
    }),
  );
}

async function main(): Promise<void> {
  const args = parseCanaryArguments(process.argv.slice(2));
  const supabaseUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const projectRef = projectRefFromSupabaseUrl(supabaseUrl);
  if (!projectRef || projectRef !== args.expectedProjectRef) {
    throw new Error("supabase_project_mismatch");
  }
  const email = requiredEnvironment("LEAN_L5_05_CANARY_EMAIL").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("canary_email_invalid");
  }

  const service = createClient(
    supabaseUrl,
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  if (args.action === "inspect") {
    return inspectCanary(service, email, projectRef);
  }
  if (args.action === "setup-admin") {
    return setupAdminCanary(service, email);
  }
  return cleanupCanary(
    service,
    email,
    args.expectedUserFingerprint as string,
  );
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (entrypoint === import.meta.url) {
  void main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        result: "blocked",
        reason: error instanceof Error ? error.message : "unknown_error",
        rawIdentityEmitted: false,
      }),
    );
    process.exitCode = 1;
  });
}
