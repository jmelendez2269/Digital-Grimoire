import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { inquiryLocalEnv } from "./inquiry-local-env";
import type { DiscoveryResult } from "../src/lib/discovery/model";

// Exercises the real local wallet with injected provider failures: no AI calls.
async function main() {
  const env = inquiryLocalEnv();
  Object.assign(process.env, env);
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const list = await db.auth.admin.listUsers({ perPage: 1000 });
  if (list.error) throw list.error;
  const user = list.data.users.find(
    (u) =>
      u.email === "discovery-member@prismarium.local" &&
      u.user_metadata.fixture_marker === "member-discovery-local-v1"
  );
  assert.ok(user);
  const { executeMeteredDiscovery } = await import(
    "../src/lib/discovery/metered.server"
  );
  const { MeteringError } = await import(
    "../src/lib/membership/metering-adapter.server"
  );
  async function balance() {
    const result = await db
      .from("credit_accounts")
      .select("available_credits,reserved_credits")
      .eq("user_id", user!.id)
      .single();
    if (result.error) throw result.error;
    return result.data;
  }
  const before = await balance();
  assert.ok(before.available_credits >= 3 && before.reserved_credits === 0);
  const dependencies = {
    environment: { PRISMARIUM_METERING_MODE: "enforce" },
    authenticate: async () => ({
      id: user.id,
      emailConfirmedAt: user.email_confirmed_at!,
    }),
  };
  for (const mode of ["provider", "empty"]) {
    const id = randomUUID();
    await assert.rejects(
      executeMeteredDiscovery(
        { id, question: `Local ${mode} refund verification` },
        {
          usage: [],
          signal: new AbortController().signal,
          generate: async (): Promise<DiscoveryResult> => {
            assert.deepEqual(await balance(), {
              available_credits: before.available_credits - 3,
              reserved_credits: 3,
            });
            if (mode === "provider") throw new Error("Injected local failure");
            return {
              overview: [],
              connections: [],
              gaps: ["No evidence"],
              nextQuestions: [],
              sources: [],
              searched: [],
              warnings: [],
              usage: [],
            };
          },
          persist: async () => {
            throw new Error("Must not persist an unusable result");
          },
          replay: async () => {
            throw new Error("Unexpected replay");
          },
        },
        dependencies
      ),
      (error: unknown) =>
        error instanceof MeteringError &&
        error.code ===
          (mode === "provider"
            ? "METERING_PROVIDER_FAILED"
            : "METERING_EMPTY_RESULT")
    );
    assert.deepEqual(await balance(), before);
    const reservation: {
      data: { state: string; quoted_credits: number } | null;
      error: unknown;
    } = await db
      .from("credit_reservations")
      .select("state,quoted_credits")
      .eq("user_id", user.id)
      .eq("request_id", id)
      .single();
    assert.equal(reservation.error, null);
    assert.deepEqual(reservation.data, {
      state: "released",
      quoted_credits: 3,
    });
    console.log(
      `${mode}: 3 reserved, 3 returned, balance ${before.available_credits}`
    );
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
