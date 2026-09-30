# Local Staging Setup Guide for Research + Concept Map

**Status**: Docker not available on current VM - manual setup required

## Prerequisites
- Docker and Docker Compose
- Supabase CLI (`npm install -g supabase` or download binary)
- Node.js 18+ and pnpm
- Port 54321 (Supabase API), 54322 (DB), 54323 (Studio) available

## Step 1: Start Local Supabase

```bash
cd /workspace/supabase

# Start Supabase (this will use config.toml)
supabase start

# Verify it's running
supabase status

# Expected output:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
# anon key: eyJh... (long JWT)
# service_role key: eyJh... (long JWT)
```

## Step 2: Verify Pre-existing Migrations

```bash
# Check migration status
supabase migration list

# Confirm these are applied:
# ✓ 20260813000000_paid_only_membership_credits.sql
# ✓ 20260813150000_make_workings_owner_private.sql
```

## Step 3: Apply Research Migrations (1-4)

```bash
# The migrations should auto-apply on start, but if needed:
supabase db reset  # Resets and applies all migrations

# OR apply manually:
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f /workspace/supabase/migrations/20260915120000_inquiry_knowledge.sql

psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f /workspace/supabase/migrations/20260915123000_inquiry_search_suggestions.sql

psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f /workspace/supabase/migrations/20260916120000_research_discovery.sql

psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f /workspace/supabase/migrations/20260921120000_member_research.sql
```

## Step 4: Verify Schema

```bash
# Check tables exist
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename LIKE 'research_%'
  ORDER BY tablename;
"

# Expected tables:
# research_discoveries
# research_entities
# research_findings
# research_inquiries

# Check RLS is enabled
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename LIKE 'research_%';
"

# All should show: rowsecurity | t

# Check anon/authenticated have NO grants
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
  SELECT grantee, table_name, privilege_type 
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' 
  AND table_name LIKE 'research_%'
  AND grantee IN ('anon', 'authenticated');
"

# Should return: (0 rows)

# Check functions exist
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
  SELECT proname FROM pg_proc 
  WHERE proname IN ('transition_research_finding', 'search_knowledge_suggestions', 'move_research_finding')
  ORDER BY proname;
"
```

## Step 5: Run SQL Test Scripts

```bash
cd /workspace/app

# Test inquiry workflow (review, publish, authorization)
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f tests/inquiry-knowledge.sql

# Expected output:
# ROLLBACK
# Inquiry database authorization, review, publication, stale revision, and ordering checks passed.

# Test member research namespaces
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f tests/member-research.sql

# Expected output:
# ROLLBACK
# (test passes if no errors)
```

## Step 6: Create Local Test Users

Set fixture password in environment:

```bash
export PRISMARIUM_LOCAL_FIXTURE_PASSWORD="TestPassword2026!"
```

### Option A: Use Repo Script

```bash
cd /workspace/app
pnpm exec tsx scripts/create-discovery-local-members.ts
```

### Option B: Manual Creation

```bash
# Get service role key from supabase status
SERVICE_ROLE_KEY=$(supabase status --output json | jq -r '.service_role_key')

# Create Admin
curl -X POST "http://localhost:54321/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@local.test",
    "password": "'"$PRISMARIUM_LOCAL_FIXTURE_PASSWORD"'",
    "email_confirm": true,
    "user_metadata": {"fixture_marker": "staging-v1"}
  }'

# Then insert into users table with role=admin
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
  INSERT INTO public.users (id, email, name, role)
  SELECT id, email, 'Local Admin', 'admin'
  FROM auth.users WHERE email = 'admin@local.test'
  ON CONFLICT (id) DO UPDATE SET role = 'admin';
"

# Create Reader (free)
curl -X POST "http://localhost:54321/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reader@local.test",
    "password": "'"$PRISMARIUM_LOCAL_FIXTURE_PASSWORD"'",
    "email_confirm": true,
    "user_metadata": {"fixture_marker": "staging-v1"}
  }'

psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "
  INSERT INTO public.users (id, email, name, role)
  SELECT id, email, 'Local Reader', 'user'
  FROM auth.users WHERE email = 'reader@local.test'
  ON CONFLICT (id) DO UPDATE SET role = 'user';
"

# Create Paid Student with comped membership
STUDENT_USER_ID=$(psql "postgresql://postgres:postgres@localhost:54322/postgres" -t -c "SELECT id FROM auth.users WHERE email = 'student@local.test'")

# Create membership
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
  DO \$\$
  DECLARE
    v_user_id uuid;
    v_now timestamptz := now();
    v_period_start timestamptz := date_trunc('month', v_now);
    v_period_end timestamptz := date_trunc('month', v_now) + interval '1 month';
  BEGIN
    -- Create student user
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
    VALUES ('student@local.test', crypt('$PRISMARIUM_LOCAL_FIXTURE_PASSWORD', gen_salt('bf')), v_now)
    ON CONFLICT (email) DO UPDATE SET email_confirmed_at = v_now
    RETURNING id INTO v_user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (v_user_id, 'student@local.test', 'Local Student', 'user')
    ON CONFLICT (id) DO UPDATE SET role = 'user';
    
    -- Create comped membership
    INSERT INTO public.billing_memberships (
      user_id, plan_code, stripe_status, pricing_cohort, offer_code,
      billing_interval, stripe_customer_id, stripe_subscription_id,
      current_period_start, current_period_end, access_until,
      billing_hold, last_stripe_event_id, last_stripe_event_created
    ) VALUES (
      v_user_id, 'student', 'active', 'founding', 'student_founding_monthly',
      'month', 'cus_localStudent', 'sub_localStudent',
      v_period_start, v_period_end, v_period_end,
      false, 'evt_localStudent', extract(epoch from v_now)::integer
    ) ON CONFLICT (user_id) DO UPDATE SET
      plan_code = 'student',
      stripe_status = 'active',
      current_period_end = v_period_end,
      access_until = v_period_end;
    
    -- Grant 30 credits
    PERFORM sync_monthly_credit_grant_v1(v_user_id, v_now);
  END \$\$;
EOF
```

## Step 7: Configure App Environment

Create `/workspace/app/.env.local`:

```bash
# Local Supabase (get values from: supabase status)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...  # From supabase status
SUPABASE_SERVICE_ROLE_KEY=eyJh...      # From supabase status

# OpenRouter (NOT AVAILABLE - use mocks)
# OPENROUTER_API_KEY=  # Not set - discovery routes will use test mocks

# Commercial actions
PRISMARIUM_ENABLED_COMMERCIAL_ACTIONS=checkout,working_generation,seven_lenses_generation,seven_lenses_expansion,deep_search_generation,research_generation

# Metering
PRISMARIUM_ENABLED_METERED_ACTIONS=working.generate,seven_lenses.expand,seven_lenses.standard,seven_lenses.long,research.investigate
PRISMARIUM_METERING_MODE=enforce

# Paid membership
PRISMARIUM_PAID_MEMBERSHIP_SALES_ENABLED=true
PRISMARIUM_MEMBER_RELEASED_COURSE_SLUGS=c01-how-humans-know-what-they-know
PRISMARIUM_STUDENT_LAUNCH_COURSE_SLUG=c01-how-humans-know-what-they-know

# Stripe (fake for local)
PRISMARIUM_STRIPE_PRICE_STUDENT_FOUNDING_MONTHLY=price_localStudent
PRISMARIUM_STRIPE_PRICE_SCHOLAR_MONTHLY=price_localScholar
PRISMARIUM_STRIPE_PRICE_ADEPT_MONTHLY=price_localAdept

# OpenAI for embeddings (if available)
# OPENAI_API_KEY=  # Optional

# Fixture password
PRISMARIUM_LOCAL_FIXTURE_PASSWORD=TestPassword2026!
```

## Step 8: Start the App

```bash
cd /workspace/app
pnpm dev
```

Open: http://localhost:3000

## Staging Checklist (Scope Doc §7, steps 3-7)

### 3. Anonymous User
- [ ] `/graph?type=research` loads with empty state
- [ ] `/api/knowledge/map` returns 200, no private fields (no `notes`, `provenance.query`, `inquiry_id`, `reviewer`)
- [ ] `/research` shows "join CTA" (paid-required state)
- [ ] Concept map items show "Sign in to save" button

### 4. Reader (Free, Signed In)
- [ ] `/research` shows paid-required state
- [ ] Generate attempt returns 402, no charge to credit ledger
- [ ] Save from Concept map works
- [ ] Saved item appears under Journal → Research
- [ ] 50-page Journal cap unaffected

### 5. Paid Student
- [ ] Wallet shows 30 credits initially
- [ ] One Research run: 30 → 27 credits (⚠️ NEEDS OPENROUTER KEY OR MOCK)
- [ ] Duplicate request (same `requestId`) is not charged again
- [ ] Failed run releases reservation (⚠️ NEEDS FAILURE INJECTION)
- [ ] Unverified email gets 403 when trying charged run

### 6. Admin
- [ ] Research run shows "Admin research · No credits deducted"
- [ ] Save → review → publish workflow
- [ ] Published connection appears on `/graph?type=research` immediately
- [ ] Return-to-draft removes it from public map
- [ ] 21st run in a day gets 429 rate limit

### 7. Regression
- [ ] Seven Lenses shows correct availability in wallet UI
- [ ] Concept Search works (not metered)
- [ ] The Working shows correct availability
- [ ] Wallet UI displays all tools correctly

## Screenshot Artifacts Needed

1. Concept map empty state (anonymous)
2. Concept map with one published connection
3. Reader "Save to my Journal" button
4. Reader Journal → Research with saved item
5. Paid student wallet before/after run
6. Admin review/publish UI

## Known Limitations Without OpenRouter Key

These checks require a live API key or mocked provider:
- Paid student: actual Research run (can test reservation/commit flow with mocked provider)
- Failed run release (can inject failure in test)
- Admin: actual run content

Can be tested with mocks from `discovery-metered.test.ts`:
- Mock provider that returns success
- Mock provider that throws error
- Verify credit reservation/commit/release flow
