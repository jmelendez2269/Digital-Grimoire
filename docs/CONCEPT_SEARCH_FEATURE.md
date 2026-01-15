# Concept Search Feature

## Overview

**Concept Search** (also called "Deep Search") is an advanced semantic search feature that finds every book in the library discussing a specific concept, highlights the top 3 most relevant passages from each book, and provides related terms for exploration.

**Implemented:** December 2024  
**Version:** 1.0  
**Status:** Active Development

---

## Features

### ✅ Implemented (v1.0)

#### 1. Semantic Vector Search
- **Deep semantic understanding** - Uses OpenAI embeddings to find conceptually related content, not just keyword matches
- **Cross-book discovery** - Searches across all books in the library simultaneously
- **Top 3 passages per book** - Automatically selects the 3 most relevant passages from each matching book
- **Similarity scoring** - Ranks results by semantic relevance (cosine similarity)

#### 2. Related Concepts Generation
- **AI-generated related terms** - Uses GPT-4o to generate 5 semantically related concepts
- **Clickable exploration** - Click any related term to search for it
- **Context-aware suggestions** - Related terms are tailored to the search query

#### 3. Book Results Display
- **Book cards** - Each result shows book title, author, and top 3 passages
- **Clickable passages** - Click any passage to jump directly to that page in the library
- **Similarity scores** - Visual indicators of relevance
- **Empty state handling** - Helpful messages when no results are found

#### 4. User Experience
- **Beautiful UI** - Dark Academia themed interface with gradient effects
- **Real-time search** - Instant results as you type and submit
- **Error handling** - Clear error messages with actionable guidance
- **Loading states** - Visual feedback during search operations

---

## Technical Architecture

### API Endpoint

**POST** `/api/convergence/deep-search`

**Request:**
```json
{
  "query": "Parabrahman"
}
```

**Response:**
```json
{
  "relatedTerms": [
    "Advaita Vedanta",
    "Brahman",
    "Non-duality",
    "Hindu philosophy",
    "Ultimate reality"
  ],
  "books": [
    {
      "text_id": "uuid",
      "title": "The Secret Doctrine Volume 1",
      "author": "Helena Blavatsky",
      "chunks": [
        {
          "chunk_id": "uuid",
          "content": "Passage text...",
          "similarity": 0.85,
          "chunk_index": 42
        }
      ]
    }
  ]
}
```

### Components

#### `DeepSearchPanel.tsx`
Main search interface component with:
- Search input with submit button
- Related terms display
- Book results grid
- Error and loading states

#### `RelatedTerms.tsx`
Displays clickable related concept tags

#### `BookResultCard.tsx`
Displays individual book results with passages

### Backend Implementation

#### Vector Search (`vector-search.ts`)
- Uses OpenAI `text-embedding-3-small` model (1536 dimensions)
- Searches `text_chunks` table with pgvector
- Supports manual similarity calculation (fallback)
- RPC function support for efficient database queries

#### Deep Search Route (`deep-search/route.ts`)
- Generates related terms via GPT-4o
- Performs vector search across all chunks
- Groups results by book (text_id)
- Selects top 3 chunks per book
- Sorts books by highest similarity score

---

## Prerequisites

### Required Setup

1. **Text Embeddings** - Texts must have embeddings generated before they can be found
   - Use `/api/convergence/generate-embeddings` endpoint
   - Or use `/api/convergence/generate-embeddings-by-title` for easier access
   - Check status with `/api/convergence/embeddings-status`

2. **Database Schema** - Requires:
   - `text_chunks` table with `embedding` column (vector(1536))
   - `texts` table with text metadata
   - pgvector extension enabled

3. **Environment Variables**:
   - `OPENAI_API_KEY` - Required for embeddings and related terms generation

### Embedding Generation

Texts need to be processed into chunks with embeddings:

```bash
# Check which texts have embeddings
GET /api/convergence/embeddings-status?title=Secret%20Doctrine

# Generate embeddings for a specific text by title
POST /api/convergence/generate-embeddings-by-title
{
  "title": "The Secret Doctrine"
}

# Or generate for all texts
POST /api/convergence/generate-embeddings
{
  "all": true,
  "batchSize": 10
}
```

---

## Usage

### Basic Search

1. Navigate to the homepage
2. Click the "Concept Search" tab
3. Enter a concept (e.g., "Parabrahman", "Alchemy", "Non-duality")
4. Click search or press Enter
5. Browse results showing books and passages

### Exploring Related Terms

1. After a search, review the "Related Concepts" section
2. Click any related term to search for it
3. The search input updates with the clicked term
4. Submit to see new results

### Navigating to Passages

1. Click any passage in a book result card
2. You'll be taken directly to that page in the library
3. The passage will be highlighted in context

---

## Search Algorithm

### Vector Similarity Search

1. **Query Embedding** - Convert search query to 1536-dimensional vector
2. **Chunk Retrieval** - Fetch up to 500 chunks from database
3. **Similarity Calculation** - Compute cosine similarity for each chunk
4. **Threshold Filtering** - Filter chunks with similarity ≥ 0.3
5. **Book Grouping** - Group chunks by `text_id`
6. **Top 3 Selection** - Select top 3 chunks per book by similarity
7. **Book Ranking** - Sort books by highest single chunk score

### Related Terms Generation

1. **GPT-4o Query** - Send search query to GPT-4o
2. **Semantic Analysis** - AI generates 5 related concepts
3. **JSON Parsing** - Extract array of terms from response
4. **Display** - Show as clickable tags

---

## Performance Considerations

### Search Performance

- **Vector Search**: ~100-500ms depending on database size
- **Related Terms**: ~1-2s (GPT-4o API call)
- **Total Response Time**: ~1-2.5s for complete results

### Optimization Strategies

1. **RPC Functions** - Use PostgreSQL RPC for faster vector search (if available)
2. **Indexing** - IVFFlat indexes on embedding columns
3. **Caching** - Consider caching related terms for common queries
4. **Batch Processing** - Generate embeddings in batches

### Scalability

- **Current Limit**: 500 chunks per search
- **Database**: Scales with pgvector performance
- **API Rate Limits**: OpenAI rate limits apply (3000 RPM for embeddings)

---

## Error Handling

### Common Issues

1. **"No books found"**
   - **Cause**: Texts don't have embeddings generated
   - **Solution**: Generate embeddings using diagnostic endpoints

2. **"OpenAI API key not configured"**
   - **Cause**: Missing `OPENAI_API_KEY` environment variable
   - **Solution**: Add API key to environment variables

3. **"Unauthorized"**
   - **Cause**: User not authenticated
   - **Solution**: Sign in to use concept search

4. **"Vector search failed"**
   - **Cause**: Database connection or embedding issues
   - **Solution**: Check database connection and embedding generation

### Error Messages

All errors are user-friendly and actionable:
- Clear descriptions of what went wrong
- Suggestions for how to fix the issue
- Development mode includes stack traces

---

## Future Enhancements

### Planned Features

1. **Advanced Filtering**
   - Filter by tradition/lens
   - Filter by document type
   - Filter by date range

2. **Search History**
   - Save recent searches
   - Quick access to previous queries

3. **Export Results**
   - Export book list to CSV
   - Export passages to Markdown

4. **Similarity Threshold Control**
   - User-adjustable similarity threshold
   - Fine-tune result precision

5. **Hybrid Search**
   - Combine vector search with full-text search
   - Better keyword + semantic matching

6. **Result Caching**
   - Cache common searches
   - Faster response times

---

## Integration Points

### Homepage Integration

- Concept Search tab in `DashboardSearchHub`
- Accessible from homepage search interface
- Part of the main navigation flow

### Library Integration

- Results link directly to library pages
- Passages navigate to exact locations
- Seamless user experience

### Convergence Machine

- Uses same embedding system
- Shares vector search infrastructure
- Consistent semantic understanding

---

## Testing

### Manual Testing

1. **Test with embeddings**:
   ```bash
   # Generate embeddings for test text
   POST /api/convergence/generate-embeddings-by-title
   { "title": "The Secret Doctrine" }
   
   # Search for concept
   POST /api/convergence/deep-search
   { "query": "Parabrahman" }
   ```

2. **Test error handling**:
   - Search without embeddings
   - Search with invalid query
   - Test authentication requirements

3. **Test UI**:
   - Search flow
   - Related terms clicking
   - Passage navigation

### Automated Testing

- Unit tests for vector search
- Integration tests for API endpoints
- E2E tests for search flow

---

## Documentation

### Related Documentation

- `EMBEDDINGS_DIAGNOSTIC_GUIDE.md` - How to check and generate embeddings
- `MASTER_DEVELOPMENT_PLAN.md` - Overall project architecture
- `FEATURE_BACKLOG.md` - Feature priorities and roadmap

### API Documentation

- `/api/convergence/deep-search` - Main search endpoint
- `/api/convergence/embeddings-status` - Diagnostic endpoint
- `/api/convergence/generate-embeddings-by-title` - Embedding generation

---

## Support

### Troubleshooting

1. Check embeddings status: `/api/convergence/embeddings-status`
2. Generate missing embeddings: `/api/convergence/generate-embeddings-by-title`
3. Check console logs for detailed error messages
4. Verify OpenAI API key is configured

### Getting Help

- Check error messages in UI
- Review browser console for details
- Check server logs for backend errors
- Use diagnostic endpoints to verify setup

---

**Last Updated:** December 2024  
**Maintainer:** Development Team  
**Status:** Active Development
