import { createClient } from "@supabase/supabase-js";
import { inquiryLocalEnv } from "./inquiry-local-env";

const marker = "member-discovery-local-v1";
const password = "Prismarium-Member-2026!";
async function main() {
  const env = inquiryLocalEnv();
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const list = await db.auth.admin.listUsers({ perPage: 1000 });
  if (list.error) throw list.error;
  for (const kind of ["member", "reader"]) {
    const email = `discovery-${kind}@prismarium.local`;
    let user = list.data.users.find((u) => u.email === email);
    if (user && user.user_metadata.fixture_marker !== marker)
      throw new Error("Fixture name belongs to another account");
    if (!user) {
      const created = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { fixture_marker: marker },
      });
      if (created.error) throw created.error;
      user = created.data.user;
      const profile = await db
        .from("users")
        .upsert({
          id: user.id,
          email,
          name: `Local discovery ${kind}`,
          role: "user",
        });
      if (profile.error) throw profile.error;
    }
    if (kind === "member") {
      const now = new Date();
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      ).toISOString();
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
      ).toISOString();
      const billing = await db.from("billing_memberships").upsert({
        user_id: user.id,
        plan_code: "student",
        stripe_status: "active",
        pricing_cohort: "founding",
        offer_code: "student_founding_monthly",
        billing_interval: "month",
        stripe_customer_id: "cus_localDiscoveryMember",
        stripe_subscription_id: "sub_localDiscoveryMember",
        current_period_start: start,
        current_period_end: end,
        access_until: end,
        billing_hold: false,
        last_stripe_event_id: "evt_localDiscoveryMember",
        last_stripe_event_created: Math.floor(now.getTime() / 1000),
      });
      if (billing.error) throw billing.error;
    }
    const grant = await db.rpc("sync_monthly_credit_grant_v1", {
      p_user_id: user.id,
      p_effective_at: new Date().toISOString(),
    });
    if (grant.error) throw grant.error;
    console.log(JSON.stringify({ email, id: user.id, grant: grant.data }));
  }
  console.log(`Local-only password: ${password}`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
