-- Quick Fix: Create or Update Your Admin User Profile
-- Run this in Supabase SQL Editor

-- Step 1: Check if your profile exists
-- Replace 'jmelendez2269@gmail.com' with your actual email
SELECT 
  au.id,
  au.email,
  pu.id as profile_exists,
  pu.role as current_role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'jmelendez2269@gmail.com';

-- Step 2: If profile doesn't exist, create it with admin role
-- Replace 'jmelendez2269@gmail.com' with your actual email
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'username', 
    au.raw_user_meta_data->>'display_name', 
    split_part(au.email, '@', 1)
  ) as name,
  'admin' as role,  -- Set as admin
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'jmelendez2269@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  )
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',  -- Update existing to admin if needed
  updated_at = NOW();

-- Step 3: If profile exists but isn't admin, update it
UPDATE public.users
SET 
  role = 'admin',
  updated_at = NOW()
WHERE email = 'jmelendez2269@gmail.com'
  AND role != 'admin';

-- Step 4: Verify the fix worked
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.users
WHERE email = 'jmelendez2269@gmail.com';

-- Success! After running this, refresh your browser and the admin buttons should appear.

