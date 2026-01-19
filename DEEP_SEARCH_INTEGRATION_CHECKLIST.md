# Deep Search Integration Checklist

## 🎯 What You Need to Get Deep Search Working

Deep search requires several components to be set up. Follow this checklist in order:

---

## ✅ Step 1: Database Migrations

### Required Migrations (Run in Supabase SQL Editor):

1. **Migration 021: Convergence Machine Schema**
   - **File:** `migrations/021_add_convergence_machine_schema.sql`
   - **Creates:**
     - `text_chunks` table (stores chunked text with embeddings)
     - `convergence_queries` table (rate limiting)
     - `convergence_responses` table (conversation history)
     - pgvector extension
     - Indexes for vector search

2. **Migration 030: Vector Search RPC Function**
   - **File:** `migrations/030_add_match_text_chunks_rpc.sql`
   - **Creates:**
     - `match_text_chunks()` RPC function for efficient vector similarity search
   - **Why:** Makes vector search 10-100x faster than manual calculation

3. **Migration 019: Convergence Concepts** (Already done ✅)
   - **File:** `migrations/019_add_convergence_concepts.sql`
   - **Creates:** `convergence_concepts` table

### How to Run Migrations:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of each migration file
3. Paste and click **Run**
4. Verify success message appears

---

## ✅ Step 2: Environment Variables

### Required in `.env.local`:

```bash
# OpenAI API Key (REQUIRED for embeddings and related terms)
OPENAI_API_KEY=sk-...

# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Why:** 
- Deep search uses OpenAI to generate embeddings (vector representations) of text
- Also uses GPT-4o to generate related terms

---

## ✅ Step 3: Generate Text Embeddings

**Critical:** Texts must have embeddings before they can be found in deep search!

### Option A: Generate Embeddings via API (Recommended)

1. **Check which texts need embeddings:**
   ```
   GET /api/convergence/embeddings-status
   ```
   - Shows which texts have embeddings and which don't

2. **Generate embeddings for a specific text:**
   ```
   POST /api/convergence/generate-embeddings-by-title
   Body: { "title": "The Secret Doctrine" }
   ```
   - Or use the text ID:
   ```
   POST /api/convergence/generate-embeddings
   Body: { "textId": "uuid-here" }
   ```

3. **Generate embeddings for ALL texts:**
   - Use the backfill function in the embeddings API
   - ⚠️ **Warning:** This can take a long time and cost money (OpenAI API usage)

### Option B: Generate via Admin UI (If Available)

- Check if there's an admin page for generating embeddings
- Look for `/admin/embeddings` or similar route

### What Happens During Embedding Generation:

1. Text is split into chunks (~500 tokens each)
2. Each chunk gets an embedding (1536-dimensional vector)
3. Embeddings stored in `text_chunks` table
4. Enables semantic similarity search

---

## ✅ Step 4: Verify Setup

### Check Database Tables Exist:

Run in Supabase SQL Editor:
```sql
-- Check if text_chunks table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'text_chunks'
);

-- Check if RPC function exists
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'match_text_chunks'
);

-- Check if pgvector extension is enabled
SELECT EXISTS (
  SELECT FROM pg_extension 
  WHERE extname = 'vector'
);
```

All should return `true`.

### Check Embeddings Status:

```bash
# Via API
curl http://localhost:3000/api/convergence/embeddings-status

# Or visit in browser
http://localhost:3000/api/convergence/embeddings-status
```

**Expected Response:**
```json
{
  "summary": {
    "total": 100,
    "withEmbeddings": 50,
    "withoutEmbeddings": 50
  },
  "texts": [...]
}
```

---

## ✅ Step 5: Test Deep Search

Once embeddings are generated:

1. **Go to Deep Search Panel** (usually on dashboard)
2. **Search for a concept** like "Alchemy"
3. **Expected Results:**
   - Related terms appear (e.g., "Hermetic", "Transmutation")
   - Books with relevant passages appear
   - Passages are highlighted
   - Results sorted by relevance

---

## 🔧 Troubleshooting

### Issue: "No results found"

**Possible Causes:**
1. ❌ No embeddings generated → Generate embeddings for texts
2. ❌ `text_chunks` table empty → Run embedding generation
3. ❌ Query too specific → Try broader terms

**Fix:**
```bash
# Check embeddings status
GET /api/convergence/embeddings-status

# Generate embeddings for a text
POST /api/convergence/generate-embeddings-by-title
{ "title": "Your Text Title" }
```

### Issue: "RPC function not found"

**Fix:**
- Run Migration 030: `migrations/030_add_match_text_chunks_rpc.sql`
- The system will fallback to manual calculation (slower but works)

### Issue: "OpenAI API error"

**Fix:**
- Check `OPENAI_API_KEY` is set in `.env.local`
- Verify API key is valid and has credits
- Check rate limits (3000 requests/minute)

### Issue: "Table 'text_chunks' does not exist"

**Fix:**
- Run Migration 021: `migrations/021_add_convergence_machine_schema.sql`

---

## 📊 Current Status Check

Run this query in Supabase to see your current setup:

```sql
-- Check all required components
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'text_chunks') as has_text_chunks,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'match_text_chunks') as has_rpc_function,
  (SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector') as has_pgvector,
  (SELECT COUNT(*) FROM text_chunks WHERE embedding IS NOT NULL) as chunks_with_embeddings,
  (SELECT COUNT(DISTINCT text_id) FROM text_chunks WHERE embedding IS NOT NULL) as texts_with_embeddings;
```

**Expected:**
- `has_text_chunks`: 1
- `has_rpc_function`: 1  
- `has_pgvector`: 1
- `chunks_with_embeddings`: > 0 (if you've generated embeddings)
- `texts_with_embeddings`: > 0 (if you've generated embeddings)

---

## 🚀 Quick Start (Minimal Setup)

To get deep search working with just one text:

1. ✅ Run migrations 021 and 030
2. ✅ Set `OPENAI_API_KEY` in `.env.local`
3. ✅ Generate embeddings for at least one text:
   ```bash
   POST /api/convergence/generate-embeddings-by-title
   { "title": "The Secret Doctrine" }
   ```
4. ✅ Test search for that text's content

---

## 📝 Summary

**Minimum Requirements:**
- ✅ Migrations 021, 030, 019 run
- ✅ `OPENAI_API_KEY` set
- ✅ At least one text has embeddings generated

**For Full Functionality:**
- ✅ All texts have embeddings
- ✅ RPC function exists (faster search)
- ✅ pgvector extension enabled

Once these are done, deep search should work! 🎉
