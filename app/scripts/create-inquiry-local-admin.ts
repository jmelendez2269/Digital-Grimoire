import { createClient } from "@supabase/supabase-js";
import { inquiryLocalEnv } from "./inquiry-local-env";

const EMAIL = "inquiry-admin@prismarium.local";
const PASSWORD = "Prismarium-Local-2026!";

async function main() {
  const env = inquiryLocalEnv();
  const service = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const users = await service.auth.admin.listUsers({ perPage: 1000 });
  if (users.error) throw users.error;

  let user = users.data.users.find(
    (candidate) => candidate.email?.toLowerCase() === EMAIL
  );

  if (user) {
    const updated = await service.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  } else {
    const created = await service.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    user = created.data.user;
  }

  const profile = await service.from("users").upsert({
    id: user.id,
    email: EMAIL,
    name: "Local Inquiry Curator",
    role: "admin",
  });
  if (profile.error) throw profile.error;

  console.log("Local inquiry account is ready.");
  console.log(`Email: ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
  console.log("Sign in at http://127.0.0.1:3027/login");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
