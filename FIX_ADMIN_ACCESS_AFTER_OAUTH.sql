-- Fix Admin Access After OAuth Account Linking
-- Run this in Supabase SQL Editor if you lost admin access after linking Gmail account
-- Replace 'jmelendez2269@gmail.com' with your actual email

-- Step 1: Check current status
SELECT 
  au.id as auth_user_id,
  au.email,
  pu.id as profile_id,
  pu.role as current_role,
  pu.email as profile_email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'jmelendez2269@gmail.com';

-- Step 2: Find all profiles with this email (in case there are duplicates)
SELECT 
  id,
  email,
  role,
  created_at
FROM public.users
WHERE email = 'jmelendez2269@gmail.com'
ORDER BY created_at DESC;

-- Step 3: Update ALL profiles with this email to admin (preserves admin across account linking)
UPDATE public.users
SET 
  role = 'admin',
  updated_at = NOW()
WHERE email = 'jmelendez2269@gmail.com'
  AND role != 'admin';

-- Step 4: Ensure the current auth user's profile has admin role
-- This handles the case where the auth.users entry exists but profile doesn't match
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'username', 
    au.raw_user_meta_data->>'display_name', 
    split_part(au.email, '@', 1)
  ) as name,
  'admin' as role,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'jmelendez2269@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  )
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  updated_at = NOW();

-- Step 5: Verify the fix worked
SELECT 
  id,
  email,
  name,
  role,
  created_at,
  updated_at
FROM public.users
WHERE email = 'jmelendez2269@gmail.com';

-- Success! After running this, refresh your browser and the admin buttons should appear.
-- The OAuth callback will now automatically preserve admin status for future account linking.

