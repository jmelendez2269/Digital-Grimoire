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

By default, Supabase Storage buckets are protected. You need to add policies:

1. In **Storage** → Click on **avatars** bucket
2. Go to **Policies** tab
3. Add these policies:

#### Policy 1: Allow Public Read Access
```sql
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

#### Policy 2: Allow Authenticated Users to Upload
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'avatars'
);
```

#### Policy 3: Allow Users to Update Their Own Avatar
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'avatars'
);
```

#### Policy 4: Allow Users to Delete Their Own Avatar
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
);
```

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

