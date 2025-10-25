# 🔧 QUICK FIX - Login Button Disappeared

## **Immediate Action Required** ⚡

### **1. Run This SQL in Supabase** (2 minutes)

Go to: **Supabase Dashboard → SQL Editor**

Copy and paste **BOTH** of these scripts:

#### Script 1: Auto-Create User Profiles
```sql
-- From: migrations/002_auto_create_user_profiles.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, email_verified, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at,
    'user',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Script 2: Update Texts Table
```sql
-- From: migrations/003_update_texts_table_for_s3.sql

ALTER TABLE texts RENAME COLUMN blob_url TO s3_key;
ALTER TABLE texts RENAME COLUMN processing_status TO status;
ALTER TABLE texts DROP CONSTRAINT IF EXISTS texts_status_check;
ALTER TABLE texts ADD CONSTRAINT texts_status_check 
  CHECK (status IN ('processing', 'ready', 'error'));
ALTER TABLE texts ALTER COLUMN status SET DEFAULT 'processing';
ALTER TABLE texts RENAME COLUMN document_type TO type;
```

### **2. Create Your Admin User**

**Replace** `your-email@example.com` with your actual email:

```sql
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) as name,
  'admin' as role,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### **3. Refresh Browser**

Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

---

## ✅ **You Should Now See:**

- ✅ "Sign In" and "Sign Up" buttons on home page
- ✅ No errors in browser console (F12)
- ✅ Can log in successfully
- ✅ User menu appears after login

---

## 🐛 **Still Broken?**

Check the full guide: [`SUPABASE_FIX_GUIDE.md`](./SUPABASE_FIX_GUIDE.md)

Or message me with:
1. Screenshot of browser console (F12 → Console)
2. Screenshot of Supabase Dashboard → Table Editor → users

---

**The Problem Was:** Auth users weren't being added to your custom `users` table.  
**The Fix:** Added triggers to auto-create profiles + better error handling in the code.

