# 🖼️ Supabase Storage Setup for Avatars

## Quick Setup Steps

### 1. Create the Avatars Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Configure the bucket:
   - **Name:** `avatars`
   - **Public:** ✅ Yes (so avatar URLs are publicly accessible)
   - **File size limit:** 2MB (optional but recommended)
   - **Allowed MIME types:** `image/*` (optional but recommended)

### 2. Set Up RLS (Row Level Security) Policies

By default, Supabase Storage buckets are protected. You need to add 4 policies using the Supabase UI:

1. In **Storage** → Click on **avatars** bucket
2. Go to **Policies** tab
3. Click **"New Policy"** for each policy below

---

#### Policy 1: Allow Public Read Access ✅

**What to enter in the Supabase UI:**
- **Policy name:** `Allow Public Read Access`
- **Allowed operation:** ✅ SELECT only (uncheck INSERT, UPDATE, DELETE)
- **Target roles:** Defaults to all (public) roles
- **Policy definition:** 
  ```
  bucket_id = 'avatars'
  ```

**What this does:** Anyone can view/download avatar images (needed for public profiles)

---

#### Policy 2: Allow Authenticated Users to Upload 📤

**What to enter in the Supabase UI:**
- **Policy name:** `Allow Authenticated Users to Upload`
- **Allowed operation:** ✅ INSERT only (uncheck SELECT, UPDATE, DELETE)
- **Target roles:** authenticated
- **Policy definition:** 
  ```
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars'
  ```

**What this does:** Logged-in users can upload new avatar images

---

#### Policy 3: Allow Users to Update Their Own Avatar 🔄

**What to enter in the Supabase UI:**
- **Policy name:** `Allow Users to Update Their Own Avatar`
- **Allowed operation:** ✅ UPDATE only (uncheck SELECT, INSERT, DELETE)
- **Target roles:** authenticated
- **Policy definition (USING clause):** 
  ```
  bucket_id = 'avatars' AND owner = auth.uid()
  ```
- **WITH CHECK clause (if shown):**
  ```
  bucket_id = 'avatars'
  ```

**What this does:** Users can replace their own avatar (not others')

---

#### Policy 4: Allow Users to Delete Their Own Avatar 🗑️

**What to enter in the Supabase UI:**
- **Policy name:** `Allow Users to Delete Their Own Avatar`
- **Allowed operation:** ✅ DELETE only (uncheck SELECT, INSERT, UPDATE)
- **Target roles:** authenticated
- **Policy definition:** 
  ```
  bucket_id = 'avatars' AND owner = auth.uid()
  ```

**What this does:** Users can remove their own avatar (not others')

---

**⚠️ Important Note:** The Supabase UI only wants the **condition expression** in "Policy definition", NOT the full `CREATE POLICY` statement!

### 3. Test the Upload

1. Navigate to `/profile` in your app
2. Click the camera icon on your avatar
3. Select an image (max 2MB)
4. Watch it upload! ✨

## Troubleshooting

### "No such bucket" error
- Make sure the bucket name is exactly `avatars` (lowercase)
- Verify the bucket is created in your Supabase project

### "Policy violation" error
- Check that RLS policies are created correctly
- Make sure you're logged in when uploading

### Avatar not showing
- Verify the bucket is set to **Public**
- Check browser console for CORS errors
- Ensure the avatar URL is saved in user metadata

## Next Steps

Once storage is set up, consider:
- [ ] Adding image compression before upload
- [ ] Supporting image cropping/resizing
- [ ] Adding a "Remove avatar" button
- [ ] Cleaning up old avatars when new ones are uploaded

