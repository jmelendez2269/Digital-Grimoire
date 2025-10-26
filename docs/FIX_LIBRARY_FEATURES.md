# Fix Library Features - Database Migration Guide

## 🔍 Problem
The library features (Reading Progress, Collections, Annotations) are failing with `PGRST205` errors because the database tables don't exist yet.

## ✅ Solution
Run the complete library features migration in Supabase.

---

## 📋 Step-by-Step Instructions

### Option 1: Run Complete Migration (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: "Digital Grimoire"

2. **Navigate to SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click "New query"

3. **Copy the Migration SQL**
   - Open the file: `migrations/COMPLETE_LIBRARY_FEATURES.sql`
   - Copy the ENTIRE contents (Ctrl+A, Ctrl+C)

4. **Paste and Run**
   - Paste into the Supabase SQL Editor
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for confirmation: "✅ All library features created successfully!"

5. **Verify Tables Created**
   - In left sidebar, click "Table Editor"
   - You should now see these new tables:
     - ✅ `reading_progress`
     - ✅ `user_collections`
     - ✅ `collection_items`
     - ✅ `user_annotations`

6. **Refresh Your App**
   - Go back to your Digital Grimoire app
   - Refresh the library page (F5)
   - All features should now work! 🎉

---

### Option 2: Run Individual Migrations

If you prefer to run migrations one at a time:

1. **Reading Progress & Collections:**
   ```bash
   migrations/008_add_library_features.sql
   ```

2. **Annotations:**
   ```bash
   migrations/009_add_annotations_table.sql
   ```

---

## 🧪 Testing After Migration

Once the migration is complete, test these features:

### 1. Reading Progress (Sidebar)
- [ ] Reading progress card appears
- [ ] Can track progress
- [ ] Progress saves when you leave/return

### 2. Collections (Sidebar)
- [ ] Collections panel appears
- [ ] Can create new collection
- [ ] Can add document to collection
- [ ] Can view/delete collections in "My Library"

### 3. Annotations (Notes Tab)
- [ ] Click "Notes" tab
- [ ] Can add highlighted text
- [ ] Can add personal notes
- [ ] Can edit/delete annotations

### 4. Bookmarks
- [ ] Bookmark button works
- [ ] Bookmarks show in "My Library"

---

## 🎯 Expected Result

**BEFORE Migration:**
```
❌ Error: PGRST205 - Could not find table 'public.reading_progress'
❌ Error: PGRST205 - Could not find table 'public.user_collections'
❌ Error: PGRST205 - Could not find table 'public.user_annotations'
```

**AFTER Migration:**
```
✅ Reading Progress tracking works
✅ Collections can be created and managed
✅ Annotations and highlights work
✅ All sidebar features functional
```

---

## 🚨 Troubleshooting

### Issue: "relation already exists" errors
**Solution:** Tables are already created - just skip those errors and continue

### Issue: Still getting PGRST205 errors
**Solution:**
1. Verify tables exist in Supabase Table Editor
2. Check RLS policies are enabled
3. Ensure you're logged in to the app
4. Try hard refresh (Ctrl+Shift+R)

### Issue: Migration runs but features still don't work
**Solution:**
1. Check browser console for new errors
2. Verify you're authenticated (logged in)
3. Check API routes are running (restart dev server if needed)

---

## 📊 Database Schema Summary

### reading_progress
- Tracks user progress through documents
- Fields: current_page, total_pages, progress_percent, time_spent, completed

### user_collections  
- User-created document collections
- Fields: name, description, icon, color, is_public

### collection_items
- Documents in collections (many-to-many)
- Links collections ↔ texts

### user_annotations
- User highlights and notes
- Fields: quote, note, position

---

## ✅ Verification Checklist

After running migration:
- [ ] All 4 tables visible in Supabase Table Editor
- [ ] RLS policies showing as enabled
- [ ] No console errors in browser
- [ ] Sidebar components load without errors
- [ ] Can interact with all features

---

**Need Help?** Check the console logs for any remaining errors and let me know!

