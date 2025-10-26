# Supabase Setup & Fix Guide

## Problem Summary

Your login button was disappearing because:
1. **User Profile Mismatch**: When users register via Supabase Auth, they get added to `auth.users` but NOT to your custom `users` table
2. **The Header component** was trying to query the `users` table, which was failing silently
3. **Schema Mismatch**: The database schema had different column names than the code expected

## Solution

We've fixed the code and created migrations to resolve these issues.

---

## Step 1: Run Database Migrations

Go to your Supabase project dashboard and run these SQL scripts in order:

### Migration 1: Base Schema (if not already run)
Run the entire `supabase-schema.sql` file to create all tables.

### Migration 2: Auto-Create User Profiles ⭐ **CRITICAL**
```sql
-- File: migrations/002_auto_create_user_profiles.sql
```
This creates triggers that automatically create a `users` table entry whenever someone signs up.

**To run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `migrations/002_auto_create_user_profiles.sql`
3. Click "Run"

### Migration 3: Update Texts Table for S3
```sql
-- File: migrations/003_update_texts_table_for_s3.sql
```
This updates the `texts` table schema to match the S3-based upload code.

**To run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `migrations/003_update_texts_table_for_s3.sql`
3. Click "Run"

---

## Step 2: Create Your First User Manually (For Existing Users)

If you already tried to register and the user exists in `auth.users` but NOT in `users`:

```sql
-- Check if you have auth users without profiles
SELECT id, email FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.users);

-- If you see your user, manually create the profile:
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) as name,
  'admin' as role,  -- Make yourself admin!
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'your-email@example.com';  -- Replace with your email
```

---

## Step 3: Verify the Fix

1. **Refresh your browser** or restart the dev server
2. **Go to the home page** - you should now see the "Sign In" and "Sign Up" buttons
3. **Try logging in** - if your user was created, it should work
4. **Check the browser console** - there should be no errors

---

## Step 4: Test New User Registration

1. **Sign out** (if logged in)
2. **Register a new account** with a different email
3. **Check Supabase Dashboard**:
   - Go to **Authentication → Users** - you should see the new user
   - Go to **Table Editor → users** - you should see a matching record
4. **The login button should remain visible** throughout

---

## Step 5: Update Environment Variables (If Needed)

I noticed a mismatch in your `.env.local`:
- Your `NEXT_PUBLIC_SUPABASE_URL` uses project `ukguqtghfglirszsqqdj`
- But your `SUPABASE_SERVICE_ROLE_KEY` is for project `uwlhjgcpeecdexvonmws`

**Fix:**
1. Go to your Supabase Dashboard → Settings → API
2. Copy the **Service Role Key** (secret, not the anon key)
3. Update `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=<your-correct-service-role-key>
   ```

---

## Testing Checklist

- [ ] Login button is visible on home page
- [ ] Register button is visible on home page
- [ ] Can register a new account
- [ ] User appears in both `auth.users` AND `public.users` tables
- [ ] Can log in with registered account
- [ ] After login, user menu appears in header (not login button)
- [ ] No errors in browser console
- [ ] No errors in terminal/dev server logs

---

## If You Still Have Issues

1. **Check Browser Console** (F12 → Console tab)
   - Look for any red errors
   - Look for warnings about Supabase queries

2. **Check Dev Server Logs**
   - Look for any errors when the page loads

3. **Verify Tables Exist**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'users';
   ```

4. **Check RLS Policies**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

5. **Verify Trigger Was Created**
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger 
   WHERE tgname IN ('on_auth_user_created', 'on_auth_user_updated');
   ```

---

## What We Fixed

### Code Changes:
1. **`Header.tsx`**: Added error handling for missing user profiles
2. **Created migrations**: To auto-create profiles and fix schema

### How It Works Now:
1. User registers → Supabase Auth creates entry in `auth.users`
2. **Trigger fires** → Automatically creates entry in `public.users`
3. User logs in → Header can query `users` table successfully
4. Login/signup buttons display correctly based on auth state

---

## Next Steps After Fix

Once everything is working:
1. ✅ Commit these changes to git
2. ✅ Document your Supabase project URL and setup
3. ✅ Consider adding email verification (currently optional)
4. ✅ Set up proper backup strategy for your database

Good luck! 🚀

