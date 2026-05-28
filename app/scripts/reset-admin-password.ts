/**
 * Emergency password reset using the Supabase service role.
 *
 * Use when email delivery is broken and you're locked out of your own staging
 * project. Targets whichever Supabase project `app/.env.local` points to —
 * the script prints the URL up front so you can sanity-check before running.
 *
 * Usage:
 *   pnpm exec tsx scripts/reset-admin-password.ts --email you@example.com --password 'something-new'
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type Args = { email: string | null; password: string | null };

function parseArgs(argv: string[]): Args {
  const out: Args = { email: null, password: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--email') {
      out.email = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--password') {
      out.password = argv[i + 1] ?? null;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(`Reset a Supabase user's password directly via the admin API.

Usage:
  pnpm exec tsx scripts/reset-admin-password.ts --email you@example.com --password '<new>'
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.password) {
    throw new Error('Both --email and --password are required.');
  }
  if (args.password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local');
  }

  console.log(`⚠️  Targeting Supabase project: ${url}`);
  console.log(`    Resetting password for:    ${args.email}`);
  console.log('');

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // supabase-js doesn't have getByEmail, so we page through users until we find one.
  // For staging this is fine; for very large prod user tables this would need a more
  // targeted approach, but if you're locked out of prod you probably want a stronger
  // process anyway.
  let userId: string | null = null;
  let page = 1;
  const perPage = 200;
  while (!userId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    if (!data.users || data.users.length === 0) break;
    const match = data.users.find((u) => (u.email ?? '').toLowerCase() === args.email!.toLowerCase());
    if (match) {
      userId = match.id;
      break;
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  if (!userId) {
    throw new Error(`No user found with email ${args.email} in this project.`);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password: args.password,
  });
  if (updateError) {
    throw new Error(`updateUserById failed: ${updateError.message}`);
  }

  console.log(`✅ Password updated for ${args.email} (user id ${userId}).`);
  console.log(`   You can now sign in normally.`);
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
