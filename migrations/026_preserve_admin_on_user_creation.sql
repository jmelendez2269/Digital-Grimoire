-- Migration: Preserve Admin Role When Creating User Profiles
-- This ensures that if a user with admin role signs in via OAuth, the trigger preserves their admin status

-- Update the handle_new_user function to check for existing admin profiles with same email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_admin_role TEXT;
BEGIN
  -- Check if there's an existing admin profile with the same email
  SELECT role INTO existing_admin_role
  FROM public.users
  WHERE email = NEW.email AND role = 'admin'
  LIMIT 1;

  -- If an admin profile exists with this email, create new profile as admin
  -- Otherwise, create as regular user
  INSERT INTO public.users (id, email, name, email_verified, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at,
    COALESCE(existing_admin_role, 'user'), -- Use 'admin' if found, otherwise 'user'
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = NEW.email,
    email_verified = NEW.email_confirmed_at,
    -- Preserve admin role if it exists, or set to admin if email has admin profile
    role = CASE 
      WHEN public.users.role = 'admin' THEN 'admin' -- Keep existing admin
      WHEN existing_admin_role = 'admin' THEN 'admin' -- Upgrade to admin if email has admin
      ELSE public.users.role -- Keep existing role
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'User profile creation trigger updated to preserve admin status!' as message;

