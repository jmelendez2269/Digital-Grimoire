# Testing RLS Migration 027

## Quick Test Steps

### 1. Run the Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your "Digital Grimoire" project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Migration 027**
   - Open: `migrations/027_enable_rls_on_missing_tables.sql`
   - Copy the entire contents (Ctrl+A, Ctrl+C)
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Expected Result**
   - Should see: `RLS enabled and policies created for all missing tables! ✅`
   - No errors should appear

### 2. Verify RLS Status

1. **Run Verification Script**
   - Open: `migrations/027_verify_rls_status.sql`
   - Copy the entire contents
   - Paste into SQL Editor (new query)
   - Click "Run"

2. **Check Results**
   - **First Query**: Should show all 8 tables with `rls_enabled = true`
   - **Second Query**: Should show policies for each table
   - **Third Query**: Should show policy counts per table

### 3. Expected Verification Results

All 8 tables should have:
- ✅ RLS Enabled
- ✅ At least 2-4 policies per table (SELECT, INSERT, UPDATE, DELETE)

**Tables to verify:**
- `text_relationships` - Should have 4 policies
- `import_history` - Should have 4 policies
- `agent_logs` - Should have 5 policies (includes service_role)
- `text_chunks` - Should have 4 policies
- `convergence_queries` - Should have 4 policies
- `convergence_responses` - Should have 6 policies
- `correspondences` - Should have 4 policies
- `correspondence_relationships` - Should have 4 policies

### 4. Check Security Advisor

After running the migration:
1. Go to Supabase Dashboard → Security Advisor
2. The 8 errors for "RLS Disabled in Public" should be resolved
3. You should see 0 errors (or reduced errors if other issues exist)

## Troubleshooting

### Error: "relation does not exist"
- The table hasn't been created yet
- Run the appropriate migration that creates the table first
- Check `supabase-schema.sql` or earlier migrations

### Error: "policy already exists"
- This is OK! The migration uses `IF NOT EXISTS`
- The policy was already created
- Migration is idempotent - safe to run multiple times

### Error: "permission denied"
- Make sure you're using the SQL Editor (not a restricted role)
- You need admin/service role permissions

## Success Criteria

✅ All 8 tables show RLS enabled  
✅ Policies exist for all tables  
✅ Security Advisor shows 0 "RLS Disabled" errors  
✅ No SQL errors when running the migration  
