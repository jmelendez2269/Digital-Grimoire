-- Diagnostic Script: Check Admin Status
-- Run this to verify your admin role is set correctly in the database
-- Replace 'jmelendez2269@gmail.com' with your actual email

-- Step 1: Check auth.users entry
SELECT 
  id as auth_user_id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'avatar_url' as avatar_url_metadata
FROM auth.users
WHERE email = 'jmelendez2269@gmail.com';

-- Step 2: Check public.users profile(s) - this is what determines admin status
SELECT 
  id,
  email,
  name,
  role,
  created_at,
  updated_at
FROM public.users
WHERE email = 'jmelendez2269@gmail.com'
ORDER BY created_at DESC;

-- Step 3: Check if auth user ID matches profile ID (critical for admin check)
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  pu.id as profile_id,
  pu.email as profile_email,
  pu.role as profile_role,
  CASE 
    WHEN au.id = pu.id THEN '✅ IDs MATCH - Admin check will work'
    WHEN pu.id IS NULL THEN '❌ NO PROFILE - Admin check will fail'
    ELSE '⚠️ IDs MISMATCH - Admin check may fail'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'jmelendez2269@gmail.com';

-- Step 4: If profile exists but role is not admin, fix it
UPDATE public.users
SET 
  role = 'admin',
  updated_at = NOW()
WHERE email = 'jmelendez2269@gmail.com'
  AND role != 'admin';

-- Step 5: Final verification
SELECT 
  'Final Status' as check_type,
  id,
  email,
  role,
  CASE 
    WHEN role = 'admin' THEN '✅ ADMIN - Features should appear after refresh'
    ELSE '❌ NOT ADMIN - Run the fix script'
  END as status
FROM public.users
WHERE email = 'jmelendez2269@gmail.com';

