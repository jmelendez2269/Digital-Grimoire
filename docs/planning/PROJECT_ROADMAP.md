# CONVERGENCE - DETAILED PROJECT ROADMAP

**Sprint Duration:** 2 weeks  
**Total Timeline:** 48 weeks (12 months)  
**Team Size:** Solo developer with AI pair programming (Cursor)  
**Note:** All time estimates assume AI-assisted development. Velocity comparable to 2-3 person team due to AI assistance.

---

## MILESTONE GATES

### Phase 1 → Phase 2 Gate:
- 200 registered users
- 15 premium subscribers ($225 MRR)
- Public library with 20+ texts
- Revenue covers Phase 2 costs ($100-200/month)
- Don't upgrade infrastructure until this gate is hit

### Phase 2 → Phase 3 Gate:
- 1000 registered users
- 50 premium subscribers ($750 MRR)
- Monthly costs covered with margin
- Don't build advanced features until this gate is hit

### Phase 3 → Phase 4 Gate:
- 2500 registered users
- 125 premium subscribers ($1875 MRR)
- All costs covered + 60% margin
- Revenue supports growth investments

---

## PRE-PRODUCTION DEPLOYMENT CHECKLIST

### Email Infrastructure Setup
**Priority:** P0 (Blocking production launch)  
**Time Estimate:** 4-6 hours  
**Documentation:** See `docs/SUPABASE_PASSWORD_RESET_SETUP.md`

**Tasks:**
- [ ] **P0: Create SendGrid Account**
  - Sign up at sendgrid.com
  - Verify domain for email sending (SPF/DKIM/DMARC)
  - Generate API key (save securely)

- [ ] **P0: Configure SendGrid SMTP in Supabase**
  - Navigate to: Project Settings → Auth → SMTP Settings
  - Enable custom SMTP
  - Configure SendGrid credentials:
    - SMTP Host: `smtp.sendgrid.net`
    - SMTP Port: `587`
    - SMTP Username: `apikey`
    - SMTP Password: `[SendGrid API Key]`
    - Sender Email: `noreply@yourdomain.com`
    - Sender Name: `Convergence`

- [ ] **P0: Test Email Delivery**
  - Test password reset flow
  - Test email verification flow
  - Verify emails arrive in inbox (not spam)
  - Test on multiple providers (Gmail, Outlook, Yahoo)

- [ ] **P1: Customize Email Templates**
  - Update welcome email with branding
  - Customize password reset email (see SUPABASE_PASSWORD_RESET_SETUP.md)
  - Update verification email with theme
  - Add Convergence dark academia aesthetic

- [ ] **P1: Set Up Email Monitoring**
  - Configure SendGrid webhooks for events
  - Monitor bounce rates in dashboard
  - Monitor delivery rates
  - Set up alerts for delivery failures

**Note:** Supabase default email service is limited to 3 emails/hour - NOT suitable for production. This must be completed before public launch.

**Cost:** SendGrid Free tier (100 emails/day) → Essentials ($19.95/mo for 50K emails/month)

---

## PHASE 1: MVP FOUNDATION (Sprints 1-4, Weeks 1-8)

### Sprint 1: Infrastructure & Setup (Weeks 1-2)

#### Tasks (Priority: P0 = Critical, P1 = Important, P2 = Nice-to-have)

**Development Environment**
- [x] P0: Install Node.js 20+, pnpm, Git
- [x] P0: Set up VS Code with extensions (ESLint, Prettier, Tailwind)
- [x] P0: Create GitHub repository with README
- [x] P0: Set up .gitignore and .env.example
- [ ] P1: Configure GitHub branch protection rules
- [ ] P1: Set up GitHub Projects for task tracking

**AWS Configuration**
- [x] P0: Create AWS account
- [x] P0: Create S3 bucket: `digital-grimoire-library`
- [x] P0: Configure S3 CORS for web uploads
- [x] P0: Create IAM user with S3 + Lambda + Textract permissions
- [x] P0: Generate access keys and store securely
- [x] P1: Set up AWS CLI on local machine
- [ ] P1: Create Lambda execution role
- [ ] P2: Set up CloudWatch log groups

**Supabase Setup**
- [x] P0: Create Supabase project
- [x] P0: Run `supabase-schema.sql` in SQL Editor
- [x] P0: Enable pgvector extension
- [x] P0: Configure Supabase Auth (email/password)
- [x] P1: Set up RLS policies
- [x] P1: Create service role API key
- [ ] P2: Configure email templates

**Next.js Project**
- [x] P0: Initialize Next.js 14 with TypeScript: `npx create-next-app@latest`
- [x] P0: Install dependencies:
  - `@supabase/supabase-js`
  - `@supabase/auth-helpers-nextjs`
  - `tailwindcss`
  - `@aws-sdk/client-s3`
  - `@aws-sdk/client-textract`
- [x] P0: Configure Tailwind CSS
- [x] P0: Set up environment variables
- [x] P1: Configure TypeScript paths (@/ alias)
- [x] P1: Set up ESLint + Prettier
- [ ] P2: Add Husky for pre-commit hooks

**Deliverables:**
- ✅ GitHub repo with initial commit
- ✅ Next.js app running on localhost:3000
- ✅ Database schema deployed
- ✅ AWS resources provisioned

**Time Estimate:** 40 hours  
**Actual Time:** 1h 53m ⚡ (20x velocity with AI assistance!)

---

### Sprint 2: Authentication & Core UI (Weeks 3-4)

#### Tasks

**Authentication System**
- [x] P0: Create `/login` and `/register` pages
- [x] P0: Implement Supabase Auth helpers
- [x] P0: Build auth context provider
- [x] P0: Create protected route middleware
- [ ] P1: Add social auth (Google OAuth)
- [ ] P1: Implement password reset flow
- [x] P2: Add email verification

**Core Layout Components**
- [x] P0: Design Header with navigation
- [ ] P0: Create Sidebar component (collapsible)
- [x] P0: Build Footer with links
- [x] P0: Implement dark theme (default)
- [ ] P1: Add breadcrumb navigation
- [ ] P1: Create loading states (skeleton screens)
- [x] P2: Add toast notifications (Sonner)

**User Profile**
- [x] P0: Create `/profile` page
- [x] P0: Display user info (name, email, avatar)
- [x] P0: Allow profile image upload to Supabase Storage (with crop/zoom!)
- [x] P1: Show contribution stats (tokens earned)
- [x] P1: Display badges and rank
- [ ] P2: Add user preferences (theme, notifications)

**Admin Dashboard**
- [x] P0: Create `/dashboard` page with enhanced UI
- [x] P0: Build responsive dashboard layout
- [x] P0: Show user stats (texts, entries, coins, rank)
- [ ] P1: Add user management table
- [ ] P2: Implement role assignment UI

**Deliverables:**
- ✅ Working authentication system
- ✅ Responsive layout with navigation
- ✅ User profile and settings
- ✅ Enhanced dashboard with visual stats
- ✅ Production-ready avatar system (crop/zoom/compress)
- ✅ Toast notifications (Sonner)

**Time Estimate:** 80 hours  
**Actual Time:** 2.5 hours ⚡ (32x velocity with AI assistance!)

---

### Sprint 3: Document Ingestion (Weeks 5-6) 🔄 **REVISED Oct 26, 2025**

#### ⚠️ Infrastructure Pivot: AWS → Cloudflare R2

**Decision Rationale:**
- AWS Textract encountered permission issues requiring paid support ($29-100/month)
- Cloudflare R2 offers better bootstrap economics (no egress fees)
- S3-compatible API means minimal code changes
- Automated OCR deferred to Phase 2 (start with**File Upload UI**
- [x] P0: Create `/admin/upload` page
- [x] P0: Build drag-and-drop upload component (react-dropzone)
- [x] P0: Add file validation (PDF, DOCX, size limits: 50MB)
- [x] P0: Show upload progress bar
- [x] P1: Support batch uploads (multiple files)
- [x] P1: Add upload queue with status
- [ ] P2: Implement resume for failed uploads

**Cloudflare R2 Upload Pipeline** (NEW)
- [x] P0: Set up Cloudflare account and R2 bucket: `convergence-library`
- [x] P0: Generate R2 API tokens (read/write)
- [x] P0: Configure CORS for web uploads
- [x] P0: Create API route: `POST /api/upload/presigned`
- [x] P0: Generate presigned R2 URLs (S3-compatible)
- [x] P0: Upload files to R2 from browser
- [x] P0: Store file metadata and R2 URL in `texts` table
- [x] P1: Generate thumbnails for PDFs (client-side or Worker)
- [x] P1: Add file versioning
- [ ] P2: Implement lifecycle policies for old versions

**Manual Metadata Entry** (MVP Approach)
- [x] P0: Create metadata entry form:
  - Title (required)
  - Author(s) (required)
  - Year (required)
  - Publisher
  - Document type dropdown (20 classifications)
  - Domain/tradition
  - Tags (comma-separated or tag input)
  - License type (public-domain, cc-by, all-rights-reserved)
  - Source URL (if applicable)
  - Confidence level (established, interpretive, speculative, tradition)
- [x] P0: Form validation (Zod schema)
- [x] P0: Save metadata to `texts` table
- [x] P0: Link to R2 file URL
- [x] P1: Metadata editing after upload
- [x] P1: Duplicate detection (by title + author)
- [ ] P2: Bulk metadata import (CSV)

**OCR Pipeline - Phase 2** (COMPLETED EARLY)
- [x] Research OCR.space API / Azure / Google
- [x] Implement Azure Computer Vision OCR integration
- [x] Automated text extraction during upload flow
- [x] OCR status polling and result storage

**Deliverables:**
- ✅ File upload interface
- ✅ Cloudflare R2 storage pipeline
- ✅ Manual metadata entry system
- ✅ OCR processing (Implemented early via Azure)

**Time Estimate:** 40 hours
**Actual Time:** ~8 hours (including OCR integration)
ta is faster to implement and gets us to MVP sooner

---

### Sprint 4: Public Library & Search (Weeks 7-8) - ✅ COMPLETE

#### Tasks

**Library Homepage**
- [x] P0: Create `/library` page
- [x] P0: Design hero section with search bar
- [x] P0: Show featured/recent texts
- [x] P0: Add filter sidebar (type, domain, year, lenses)
- [x] P1: Implement tag cloud (tag filtering)
- [ ] P1: Add "Random text" button
- [ ] P2: Create curated collections

**Document Listing**
- [x] P0: Build document card component
  - Title, author, year
  - Document type badge
  - Tags
  - Status indicator
- [x] P0: Implement grid view with responsive design
- [x] P0: Add pagination (12 per page)
- [x] P1: Add sorting (date, title, author)
- [x] P1: Show loading placeholders (skeletons)
- [ ] P2: Infinite scroll option

**Search Implementation**
- [x] P0: Implement search in library page
- [x] P0: Implement PostgreSQL full-text search
- [x] P0: Add filter by type, domain, year, tags, lenses
- [x] P0: Display search results with live filtering
- [x] P1: Show search result count ("Showing X of Y texts")
- [ ] P1: Add autocomplete suggestions
- [ ] P2: Add advanced search (Boolean operators)

**Document Viewer**
- [x] P0: Create `/library/[id]` dynamic route
- [x] P0: Display full document metadata
- [x] P0: Embed PDF viewer (@react-pdf-viewer)
- [x] P0: Show OCR text in content tab
- [x] P1: Add text selection for clipping (annotations)
- [x] P1: Implement bookmark button
- [x] **BONUS:** Reading progress tracking with sidebar
- [x] **BONUS:** Collections panel for organizing documents
- [x] **BONUS:** Annotations panel with notes tab
- [ ] P2: Add "Cite this" button (BibTeX, APA)

**Deliverables:**
- ✅ Searchable library interface with advanced filters
- ✅ Document listing with pagination
- ✅ Full-text search with real-time filtering
- ✅ Document detail pages with PDF viewer
- ✅ **BONUS:** Reading progress, collections, annotations, bookmarks

**Time Estimate:** 55 hours  
**Actual Time:** ~6 hours (11x velocity with AI assistance!)

---

## PHASE 2: PERSONAL GRIMOIRE (Sprints 5-7, Weeks 9-14)

### Sprint 5: Tiptap Editor Foundation (Weeks 9-10)

#### Tasks

**Editor Setup**
- [x] P0: Install Tiptap packages
- [x] P0: Create `TiptapEditor.tsx` component
- [x] P0: Configure StarterKit extension
- [x] P0: Add basic styling

**Block Types**
- [x] P0: Text (paragraph)
- [x] P0: Headings (H1, H2, H3, H4)
- [x] P0: Bulleted list
- [x] P0: Numbered list
- [x] P0: Blockquote
- [x] P0: Code block
- [x] P1: Toggle list
- [x] P1: Callout/admonition
- [x] P2: Divider

**Slash Command Menu**
- [x] P0: Create command menu popup
- [x] P0: Trigger on "/" key
- [x] P0: Filter items by typing
- [x] P0: Insert block on Enter/Click
- [x] P1: Show keyboard shortcuts
- [x] P1: Group by category
- [ ] P2: Add icons for each block type

**Toolbar**
- [x] P0: Bold, Italic, Underline
- [x] P0: Heading level selector
- [x] P0: Link insertion
- [x] P0: Image upload
- [x] P1: Text alignment
- [x] P1: Text color
- [ ] P2: Highlight color

**Deliverables:**
- ✅ Working Tiptap editor
- ✅ Block types implemented
- ✅ Slash command menu
- ✅ Formatting toolbar

**Time Estimate:** 45 hours
**Actual Time:** ~4 hours (Sprint 5)

---

### Sprint 6: Note Management (Weeks 11-12)

#### Tasks

**Page CRUD**
- [x] P0: Create `/journal` page (rebranded from grimoire)
- [x] P0: API routes:
  - `POST /api/journal` - create page
  - `GET /api/journal/[id]` - read page
  - `PUT /api/journal/[id]` - update page
  - `DELETE /api/journal/[id]` - delete page
- [x] P0: Save editor content as JSONB
- [x] P0: Implement auto-save (debounced)
- [x] P1: Add manual save button
- [x] P1: Show last saved timestamp
- [ ] P2: Add version history

**Sidebar Navigation**
- [x] P0: List all user pages
- [x] P0: Show page hierarchy (nested)
- [x] P0: Add "New Page" button
- [x] P0: Implement page reordering
- [x] P1: Add page search/filter
- [x] P1: Show page icons (emoji)
- [ ] P2: Collapsible folders

**Page Metadata**
- [x] P0: Editable page title
- [x] P0: Page icon picker (emoji)
- [ ] P1: Cover image upload
- [x] P1: Page tags
- [x] P2: Created/modified dates

**Drag Handle**
- [x] P0: Show `⋮⋮` on block hover
- [x] P0: Implement block drag-and-drop
- [x] P0: Add context menu on click
- [ ] P1: Add color picker
- [ ] P2: Add block comments

**Deliverables:**
- ✅ Full CRUD for study journal
- ✅ Sidebar with page list
- ✅ Auto-save functionality
- ✅ Block manipulation (drag/drop)

**Time Estimate:** 50 hours
**Actual Time:** ~4 hours (Sprint 5)

---

### Sprint 7: Clipping & Export (Weeks 13-14)

#### Tasks

**Clip from Library**
- [x] P0: Add "Clip to Journal" button on library texts
- [x] P0: Text selection UI
- [x] P0: Create clip preview modal
- [x] P0: Save clip to journal page
- [x] P1: Add source citation automatically
- [x] P1: Link back to original text
- [x] P2: Show all clips from a source

**Wikilinks**
- [x] P0: Implement `[[Page Name]]` syntax
- [x] P0: Autocomplete page names
- [x] P0: Convert to clickable links
- [x] P0: Create backlinks index (Action card workflow)
- [x] P1: Show backlinks panel
- [x] P1: Create page if doesn't exist
- [ ] P2: Alias support `[[Page|Alias]]`

**Export System**
- [x] P0: Export to Markdown
- [x] P0: Export to HTML
- [ ] P1: Export to PDF
- [ ] P1: Export to Notion
- [ ] P2: Bulk export (entire journal)

**Deliverables:**
- ✅ Clipping from library to journal
- ✅ Internal wikilinks with multi-action modal
- ✅ Markdown & CSV export

**Time Estimate:** 45 hours
**Actual Time:** ~6 hours (Sprints 5-6)

---

## PHASE 3: CORRESPONDENCE TABLES (Sprints 8-10, Weeks 15-20)

**Database Schema** (REVISED from Neptune)
- [x] P0: Create `entities` table (Migration 018)
- [x] P0: Create `relations` table (Migration 019)
- [x] P0: Create `property_definitions` table
- [x] P0: Create `entity_properties` table
- [x] P1: Add support for multi-source claims
- [x] P1: Add verification status for claims
- [x] P1: Implement recursive CTEs for relationship traversal

**Graph Infrastructure**
- [x] P0: Set up PostgreSQL schema for graph storage
- [x] P0: Add GIN indexes for relationship searches
- [x] P1: Research pgvector for semantic entity matching (Implemented)
- [x] P1: Add full-text search for entities

**Entity Extraction**
- [x] P0: Create entity extraction prompt for GPT-4
- [x] P0: Map extracted entities to schema identifiers
- [x] P1: Automatic entity linking during document processing
- [x] P1: Batch extraction script
- [ ] P2: Named Entity Recognition (NER) training

**Deliverables:**
- ✅ Scalable graph schema in PostgreSQL
- ✅ Entity extraction pipeline working
- ✅ Entity linking implemented

**Time Estimate:** 50 hours
**Actual Time:** ~10 hours (Sprint 8-9)

---

**Static Visualization**
- [x] P0: Integrate D3.js or Force Graph
- [x] P0: Render nodes and edges from Supabase
- [x] P1: Add node labels and icons
- [x] P1: Implement node clustering (by type)

**Interactivity**
- [x] P0: Drag and drop nodes
- [x] P0: Zoom and pan navigation
- [x] P0: Click node to view details (Sidebar)
- [x] P1: Search nodes by name
- [x] P1: Filter nodes by type/tags
- [x] P2: Filter relations by type

**Discovery Features**
- [x] P0: Implement "Path Finding" between two entities
- [x] P0: View neighbors of a node
- [x] P1: Highlight related nodes on hover
- [x] P2: Save graph views/snapshots

**Deliverables:**
- ✅ Interactive 2D knowledge graph
- ✅ Entity details drawer
- ✅ Advanced relationship filtering

**Time Estimate:** 55 hours
**Actual Time:** ~6 hours (Sprint 9)

---

### Sprint 10: CRUD Interface (Weeks 19-20)

#### Tasks

**Table View**
- [ ] P0: Create `/correspondences` page
- [ ] P0: Display correspondences as table
- [ ] P0: Use TanStack Table for features:
  - Sorting
  - Filtering
  - Pagination
  - Column visibility
- [ ] P1: Export to CSV
- [ ] P1: Bulk edit

**Entity Management**
- [ ] P0: "Add Entity" form
- [ ] P0: "Edit Entity" modal
- [ ] P0: Delete confirmation
- [ ] P0: API routes:
  - `POST /api/correspondences`
  - `PUT /api/correspondences/[id]`
  - `DELETE /api/correspondences/[id]`
- [ ] P1: Field validation
- [ ] P1: Duplicate detection

**Relationship Management**
- [ ] P0: "Create Relationship" form
  - Select source entity
  - Select target entity
  - Choose relationship type
  - Set strength (0.0-1.0)
  - Add notes/source
- [ ] P0: View all relationships for entity
- [ ] P0: Delete relationship
- [ ] P1: Edit relationship properties

**Lens Presets**
- [ ] P0: Create preset system
- [ ] P0: Implement lenses:
  - **Astrological Lens**: Planets + signs + houses
  - **Elemental Lens**: Elements + qualities
  - **Qabalistic Lens**: Tree of Life + paths
  - **Vedic Lens**: Chakras + nadis
  - **Tarot Lens**: Cards + suits
- [ ] P1: User custom lenses
- [ ] P2: Share lens presets

**Deliverables:**
- ✅ Table view with sorting/filtering
- ✅ Entity and relationship CRUD
- ✅ 5 preset lenses
- ✅ User contribution workflow

**Time Estimate:** 50 hours

---

## PHASE 4: THE CONVERGENCE MACHINE (Sprints 11-14, Weeks 21-28)

**API Integrations**
- [x] P0: Set up Claude API client
- [x] P0: Set up OpenAI API client (Primary)
- [x] P0: Implement rate limiting
- [x] P0: Add retry logic with exponential backoff
- [x] P1: Implement fallback (Claude → GPT-4)
- [x] P1: Add timeout handling
- [x] P2: Track usage costs

**Caching System**
- [x] P0: Create `ai_cache` table
- [x] P0: Hash query + context
- [x] P0: Store responses with TTL
- [x] P0: Check cache before API call
- [x] P1: Implement cache warming
- [x] P1: Add AI Relevance Caching layer

**Streaming**
- [x] P0: Implement SSE (Server-Sent Events)
- [x] P0: Stream tokens from AI APIs
- [x] P0: Handle connection errors
- [x] P1: Show typing indicator

**Deliverables:**
- ✅ AI API clients configured
- ✅ Caching system working
- ✅ Streaming responses

**Actual Time:** ~5 hours
---

### Sprint 10: CRUD Interface (Weeks 19-20)

#### Tasks

**Table View**
- [x] P0: Create `/correspondences` page (Table view)
- [x] P0: Display correspondences as table
- [x] P0: Use TanStack Table for features:
  - Sorting
  - Filtering
  - Pagination
- [x] P1: Export to CSV (Implemented in conversion tools)

**Entity Management**
- [x] P0: "Add Entity" form
- [x] P0: "Edit Entity" modal
- [x] P0: Delete confirmation
- [x] P0: API routes for CRUD

**Relationship Management**
- [x] P0: "Create Relationship" form
- [x] P0: View all relationships for entity
- [x] P0: Delete relationship

**Deliverables:**
- ✅ Table view replacement for graph
- ✅ Entity and relationship CRUD
- ✅ User contribution workflow (Admin)

**Time Estimate:** 50 hours
**Actual Time:** ~5 hours

---

**Vector Search**
- [x] P0: Set up PostgreSQL pgvector extension
- [x] P0: Generate embeddings for all texts using `text-embedding-3-small`
- [x] P0: Store in `text_embeddings` table
- [x] P0: Implement cosine similarity search function in SQL
- [x] P1: Recursive RAG: search over segments and entities

**Hybrid Ranking**
- [x] P0: Combine vector + keyword + graph scores
- [x] P0: Implement reciprocal rank fusion (RRF)
- [x] P1: Re-ranking with AI Relevance Cache

**Citation Extraction**
- [x] P0: Extract relevant passages
- [x] P0: Include source metadata (Title, Author, Page)
- [x] P0: Link to original document in library

**Deliverables:**
- ✅ Vector semantic search (pgvector)
- ✅ Hybrid ranking system (RRF)
- ✅ Verified source citations

**Time Estimate:** 55 hours
**Actual Time:** ~10 hours (Combined Phase 4)

---

**7-Lens System Implementation**
- [x] P0: Define system prompts for each lens:
  - Technical/Historical
  - Symbolic/Metaphysical
  - Etymological
  - Mythological
  - Experiential/Ritual
  - Contradiction Detector
  - Systemic/Sociological (NEW replacement for Scientific/Philosophical)
- [x] P0: Build the multi-step reasoning chain
- [x] P0: Parallel processing of lenses (using Promise.all)

**Reasoning Engine**
- [x] P0: Map each lens to retrieval type
- [x] P0: Multi-perspective answer composition
- [x] P1: Confidence scoring per lens

**Deliverables:**
- ✅ Complete 7-Lens Reasoning Engine
- ✅ Parallel Lens Execution
- ✅ Cross-domain synthesis

**Actual Time:** ~10 hours (Combined Phase 4)

---

**AI Query Interface**
- [x] P0: Create `/workbench` page (premium-gated)
- [x] P0: Build query input (textarea)
- [x] P0: **7 lens weight sliders (0-100% each)**
- [x] P0: Lens on/off toggles
- [x] P0: Default presets (equal weights, scholar, practitioner)
- [x] P0: Display streaming response with markdown
- [x] P0: Show source citations in sidebar
- [x] P1: Convergence score visualization (Heatmap)

**Navigation & History**
- [x] P0: Save queries and responses to Supabase
- [x] P0: Display past conversations in sidebar
- [x] P1: Search conversation history

**Premium Paywall**
- [x] P0: Implement subscription check middleware (Kinde/Supabase)
- [x] P0: Show upgrade prompt for free users
- [x] P0: Track query usage
- [ ] P1: Stripe checkout integration

**Deliverables:**
- ✅ Premium Convergence Machine Workbench
- ✅ Interactive Lens Weighting
- ✅ Conversation History System

**Time Estimate:** 60 hours
**Actual Time:** ~10 hours (Combined Phase 4)

---

## PHASE 5: COMMUNITY & TOKENOMICS (Sprints 15-18, Weeks 29-36)

### Sprint 15-16: Points & Badges (Weeks 29-32)

#### Tasks

**Points System**
- [ ] P0: Add `tokens_earned` to users table
- [ ] P0: Create points allocation rules
- [ ] P0: Award points for actions:
  - Upload document: +100
  - Add correspondence: +20
  - Create relationship: +10
  - Metadata curation: +5
  - Annotation: +5
- [ ] P1: Point decay for inactivity
- [ ] P2: Bonus multipliers

**Badge System**
- [ ] P0: Create `badges` table
- [ ] P0: Define badge types:
  - **Accomplishment**: 10, 50, 100 uploads
  - **Discourse**: Top contributor
  - **Special**: Founding member
- [ ] P0: Award badges automatically
- [ ] P0: Display on user profile
- [ ] P1: Badge rarity (common, rare, legendary)

**Leaderboard**
- [ ] P0: Create `/leaderboard` page
- [ ] P0: Show top 100 contributors
- [ ] P0: Display: rank, name, points, badges
- [ ] P1: Filter by timeframe (week, month, all-time)
- [ ] P1: Category leaderboards (uploads, relationships)

**Time Estimate:** 50 hours

---

### Sprint 17-18: Community & Token (Weeks 33-36)

#### Tasks

**Forums**
- [ ] P0: Install forum software or build simple
- [ ] P0: Create topic categories (guilds)
- [ ] P0: Thread creation and replies
- [ ] P0: Moderation tools
- [ ] P1: Upvote/downvote
- [ ] P2: Reputation system

**Smart Contract**
- [ ] P0: Choose blockchain (Polygon)
- [ ] P0: Write ERC-20 token contract
- [ ] P0: Add staking functions
- [ ] P0: Governance voting contract
- [ ] P1: Security audit (Certik, OpenZeppelin)
- [ ] P1: Testnet deployment

**Token Launch Prep**
- [ ] P0: Legal opinion on utility token
- [ ] P0: Update Terms of Service
- [ ] P0: Create token whitepaper
- [ ] P0: Community education materials
- [ ] P1: Airdrop calculator
- [ ] P2: Liquidity provision

**Time Estimate:** 70 hours

---

## ESTIMATED TOTAL TIME: ~1,000 hours (6-8 months with 3-person team)

---

## PRIORITY LEVELS

**P0 (Critical):** Must have for MVP launch  
**P1 (Important):** Should have for competitive product  
**P2 (Nice-to-have):** Can defer to post-launch  

---

## DEPENDENCIES

```
Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4
                                  ↓
Sprint 5 → Sprint 6 → Sprint 7 ←-┘
           ↓
Sprint 8 → Sprint 9 → Sprint 10
                      ↓
Sprint 11 → Sprint 12 → Sprint 13 → Sprint 14
                                    ↓
Sprint 15 → Sprint 16 → Sprint 17 → Sprint 18
```

---

## RISK MITIGATION

| Risk | Impact | Sprint | Mitigation |
|------|--------|--------|-----------|
| Neptune complexity | High | 8 | Use PostgreSQL JSONB fallback |
| AI costs exceed budget | High | 11 | Aggressive caching, rate limits |
| Tiptap performance | Medium | 5 | Use react-quill backup |
| Token legal issues | Critical | 18 | Get legal opinion early |

---

**Next Steps:** See `QUICK_START_GUIDE.md` for immediate actions.

