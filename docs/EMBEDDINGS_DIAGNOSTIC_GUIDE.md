# Embeddings Diagnostic Guide

This guide helps you check which texts have embeddings and generate them for texts that are missing them.

## Quick Check: Which Texts Have Embeddings?

### Option 1: Check All Texts
```bash
# In your browser console or using curl (while logged in)
fetch('/api/convergence/embeddings-status')
  .then(r => r.json())
  .then(console.log)
```

### Option 2: Search for Specific Text
```bash
# Search for "The Secret Doctrine"
fetch('/api/convergence/embeddings-status?title=Secret%20Doctrine')
  .then(r => r.json())
  .then(console.log)
```

**Response Format:**
```json
{
  "texts": [
    {
      "id": "uuid",
      "title": "The Secret Doctrine Volume 1",
      "author": "Helena Blavatsky",
      "type": "book_esoteric",
      "hasContent": true,
      "hasEmbeddings": false,
      "chunkCount": 0
    }
  ],
  "summary": {
    "total": 10,
    "withEmbeddings": 5,
    "withoutEmbeddings": 5,
    "withContent": 10,
    "withoutContent": 0
  }
}
```

## Generate Embeddings for a Text

### Option 1: By Title (Easiest)
```bash
# Generate embeddings for "The Secret Doctrine"
fetch('/api/convergence/generate-embeddings-by-title', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Secret Doctrine' })
})
  .then(r => r.json())
  .then(console.log)
```

**Note:** This endpoint requires admin access.

### Option 2: By Text ID
```bash
# First, get the text ID from the status endpoint, then:
fetch('/api/convergence/generate-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ textId: 'your-text-id-here' })
})
  .then(r => r.json())
  .then(console.log)
```

## Generate Embeddings for All Texts

```bash
# Generate embeddings for all texts that don't have them
fetch('/api/convergence/generate-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    all: true,
    batchSize: 10,  // Optional: process 10 at a time
    maxTexts: 50    // Optional: limit to first 50 texts
  })
})
  .then(r => r.json())
  .then(console.log)
```

## Troubleshooting

### "Text not found"
- Check the exact title spelling
- Try a partial match (e.g., "Secret" instead of "The Secret Doctrine Volume 1")
- Use the status endpoint to see all available texts

### "Text has no content"
- The text exists but has no content uploaded
- You need to upload the text content first before generating embeddings

### "Already has embeddings"
- The text already has embeddings generated
- You can still regenerate them by deleting the chunks first (admin only)

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/convergence/embeddings-status` | GET | Check which texts have embeddings | User |
| `/api/convergence/generate-embeddings-by-title` | POST | Generate embeddings by title | Admin |
| `/api/convergence/generate-embeddings` | POST | Generate embeddings by ID or all | Admin |
