# CONVERGENCE - FEATURE BACKLOG & PRIORITIES

**Last Updated:** January 2026  
**Version:** 1.9  

## 🔄 INFRASTRUCTURE MIGRATION (Oct 26, 2025)

**AWS → Cloudflare R2:**  
- **Reason:** AWS requires paid support ($29-100/month) to troubleshoot issues
- **Benefits:** No egress fees, free community support, simpler pricing
- **Impact:** OCR deferred to Phase 2, manual metadata entry for MVP
- **Status:** Migration in progress (Sprint 3)

See `sprint_summaries/SPRINT_3_AWS_MIGRATION_SESSION.md` for full details.

---

## 🎉 RECENT ACHIEVEMENTS

**Sprint 1 Complete (1h 53m):** Infrastructure, AWS→Cloudflare R2, Supabase, Next.js setup  
**Sprint 2 Complete (2.5h):** Authentication, Core UI, Avatar System, Dashboard, Toast Notifications  
**Sprint 3 Complete (4h):** Document Processing Pipeline (Cloudflare R2 + Azure OCR + AI Metadata)  
**Sprint 4 Complete (6h):** Public Library, PDF Viewer, Advanced Filtering, Pagination  
**Sprint 5 Complete (6h):** Study Journal MVP, PostgreSQL FTS, Annotation Export

**Latest Session Updates (January 2026 - Multi-Source Claims System Complete):**
- ✅ **Multi-Source Knowledge Claims System** - Complete implementation
  - `knowledge_sources` and `knowledge_claims` tables (Migration 032)
  - Admin UI for managing sources and field-specific claims
  - Consensus vs Sources view toggle in entity detail modal
  - CSV auto-import script with schema detection (6 types: plants, angels, orishas, gods, crystals, chakras)
  - Dynamic type management system (Migration 031) - admin-manageable entity/relationship types
  - AI-powered text rewrite/generation buttons in admin forms
  - Successfully imported 10+ crystals with full field mapping
  - BOM normalization and robust error handling

**Previous Session Updates (January 2026 - Convergence Graph UI Complete):**
- ✅ **Convergence Graph UI** - Complete Phase 3B user interface implementation
  - D3.js force-directed network visualization with pan/zoom/drag
  - Comparative table view with sortable columns and similarity indicators
  - Concept detail modal with related concepts display
  - Similarity controls (search, threshold slider, tradition filter)
  - Tradition legend with color-coded sidebar
  - Full page route at `/convergence-graph`
  - Ready for data seeding (see `CONVERGENCE_GRAPH_DATA_GUIDE.md`)

**Previous Session Updates (November 10, 2025 - Production Infrastructure & Documentation):**
- ✅ **SendGrid Email Infrastructure** - Complete email setup with domain authentication (convergencelibrary.com)
  - Domain authenticated, DNS records configured (SPF, DKIM, DMARC, link branding)
  - Supabase SMTP configured with SendGrid credentials
  - Email templates customized with Dark Academia theme
  - Email monitoring documentation complete
- ✅ **DNS Configuration** - All DNS records configured and verified
  - SendGrid CNAME records configured (57219658, em2464, s1._domainkey, s2._domainkey, url1708)
  - DMARC TXT record configured
  - Vercel www CNAME record configured (adc9a46e8f9fd181.vercel-dns-017.com)
  - Root domain A record configured (216.198.79.1)
- ✅ **Password Reset Flow Fixes** - Fixed navigation and middleware issues, improved validation UX
  - Fixed forgot password link navigation
  - Added password reset routes to public routes in middleware
  - Enhanced password validation with real-time requirement checking
- ✅ **Footer Navigation Cleanup** - Removed future features (Blog, API, Communities, Social Media) from UI
- ✅ **Footer Layout Improvements** - Fixed alignment, improved spacing, 4-column layout with better typography
- ✅ **Library Page UI Improvements** - Compact header with inline search, filters, and sort controls
- ✅ **AdvancedFilters Styling** - Compact button styling for better header integration
- ✅ **LibraryGrid Height Optimization** - Adjusted height calculation for better space utilization
- ✅ **Production Documentation** - Comprehensive guides created:
  - Vercel Deployment & Domain Setup guide (`VERCEL_DEPLOYMENT_SETUP.md`)
  - Vercel Production Secrets guide (`VERCEL_PRODUCTION_SECRETS.md`)
  - Google OAuth Setup guide (`GOOGLE_OAUTH_SETUP.md`) - Code implemented, config pending
- ✅ **Development Workflow** - CI/CD pipeline setup with branch strategy:
  - Development branch workflow documented
  - Localhost testing workflow guide
  - Cursor IDE workflow clarification
- ✅ **TypeScript Fixes** - Next.js 16 compatibility fixes across codebase
- ✅ **Future Features Documentation** - All removed features properly documented in master development plan

**Previous Session Updates (November 3, 2025 - Universal AI Search & Chat):**
- ✅ **Floating AI Search Bar** - Expandable floating search component accessible from all pages
- ✅ **Smart Model Selection** - Auto-selects least-used AI model (Claude, GPT, Gemini) based on usage stats
- ✅ **AI Chat Modal** - Full-featured chat interface supporting Claude, GPT, and Gemini
- ✅ **Multi-Model AI API Routes** - New endpoints for Claude, GPT, and Gemini (`/api/ai/claude`, `/api/ai/gpt`, `/api/ai/gemini`)
- ✅ **AI Usage Tracking** - API route tracks monthly usage per model for load balancing
- ✅ **Chapter Management APIs** - Generate and update chapter names via API routes
- ✅ **Document Metadata Generation** - New API route for automated metadata extraction
- ✅ **Full Curator Notes Display** - Library cards now show complete curator notes
- ✅ **Enhanced Library Integration** - Floating AI search integrated across Library, Graph, Journal, and Document pages
- ✅ **Homepage AI Search** - AI search bar added to homepage for immediate access

**Previous Session Updates (Convergence Machine MVP):**
- ✅ **Convergence Machine MVP Complete** - Full 7-lens AI reasoning system with hybrid retrieval
- ✅ **Database Schema** - Migrations 021 (convergence tables) + 022 (subscription status)
- ✅ **Embedding System** - Text chunking, embedding generation, vector search (pgvector)
- ✅ **Hybrid Retrieval** - Vector + FTS search with Reciprocal Rank Fusion (RRF) merging
- ✅ **7-Lens System** - All lens definitions, prompts, and orchestrator complete
- ✅ **Streaming Responses** - Server-Sent Events (SSE) for real-time multi-lens analysis
- ✅ **Premium Features** - Rate limiting (5 free/month), subscription gate, upgrade prompts
- ✅ **Complete UI** - Main page, lens sliders, presets, response display, rate limit indicator
- ✅ **API Endpoints** - Query, history, rate-limit, and embedding generation routes

**Previous Session Updates:**
- ✅ **HTML File Upload & Viewer** - Complete HTML document support with zoom, fullscreen, and styled rendering
- ✅ **Cover Image Management** - Cover cropping modal with 2:3 aspect ratio and position controls
- ✅ **Chapter Viewer Enhancements** - Fullscreen mode, zoom controls, and text highlighting for annotations
- ✅ **Cover Scraping** - Admin tool to automatically fetch/generate cover images from external sources
- ✅ **Admin Access Reliability** - Server-side admin check API route to prevent UI inconsistencies
- ✅ **Improved HTML Styling** - Enhanced rendering for sacred-texts.com format with comprehensive CSS

**Oct 30 Updates:**
- Centralized admin navigation in `Header.tsx` via single `adminLinks` source (removed duplicates)
- Added `QUICK_START.md` with server commands and quick reference
- Maintained zero-lint policy; ensured Dark Academia UX consistency

### Standout Features Delivered:
- ✅ **Production-Ready Avatar System** (crop/zoom/compress/delete)
- ✅ **Complete Authentication** (email/password + protected routes + password reset)
- ✅ **Enhanced Dashboard** (animated stats, getting started, highlights)
- ✅ **Toast Notifications** (Sonner with dark theme)
- ✅ **Dark Academia Design** (consistent aesthetic throughout)
- ✅ **7 Convergence Lenses** (classification + filtering system)
- ✅ **PDF Document Viewer** (@react-pdf-viewer with dark theme)
- ✅ **User Library Features** (reading progress, collections, annotations, bookmarks)
- ✅ **Admin Usage Tracking** (analytics dashboard with cost monitoring)
- ✅ **Study Journal MVP** (Tiptap editor, auto-save, emoji picker, search)
- ✅ **PostgreSQL Full-Text Search** (10-100x faster annotation search)
- ✅ **Annotation Export** (Markdown & CSV with filtering)

**Total Velocity:** 23x faster than traditional development with AI assistance! 🚀  
**Total Development Time:** ~40 hours (including Convergence Machine MVP + Universal AI Search)  
**Phase 1 Status:** 95% complete (Sprint 1-5 done, library seeding remains)  
**Phase 2 Status:** Study Journal MVP complete (30% of Phase 2)  
**Phase 4 Status:** Convergence Machine MVP complete (95% - ready for testing!)  
**New Feature:** Universal AI Search & Chat System complete (100% - ready for use!)

---

## PRIORITY MATRIX

### Priority Levels

- **P0 (Must Have):** Essential for MVP launch. Blocks other features.
- **P1 (Should Have):** Important for competitive product. Launch possible without.
- **P2 (Nice to Have):** Enhances experience. Can defer to post-launch.
- **P3 (Future):** Strategic features for Years 2-3.

### Bootstrap Strategy

**P0 features are split across phases based on revenue milestones:**
- Only build features when you have revenue to support their infrastructure costs
- Don't build premium features until you have paying customers
- Milestone-gated development ensures sustainable growth

### Effort Estimation

- **XS:** <8 hours (1 day)
- **S:** 8-16 hours (1-2 days)
- **M:** 16-40 hours (2-5 days)
- **L:** 40-80 hours (1-2 weeks)
- **XL:** 80+ hours (2+ weeks)

---

## CORE FEATURES

### 1. PUBLIC LIBRARY

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Document upload (admin) | P0 | M | 3 | ✅ Complete | **Cloudflare R2** (migrated from AWS) |
| Manual metadata entry | P0 | M | 3 | ✅ Complete | **AI-powered with OpenAI GPT-4o** |
| OCR processing | P1 | L | 4 | ✅ Complete | **Azure Computer Vision** |
| Document classification (20 types) | P0 | S | 3 | ✅ Complete | **AI-powered classification** |
| Full-text search | P0 | M | 4 | ✅ Complete | PostgreSQL FTS with live filtering |
| Document viewer (PDF) | P0 | M | 4 | ✅ Complete | @react-pdf-viewer |
| Filter by type/domain/year | P0 | S | 4 | ✅ Complete | Query params + advanced filters |
| Document detail page | P0 | S | 4 | ✅ Complete | Metadata display with tabs |
| **7 Convergence Lenses** | P0 | L | 4 | ✅ Complete | Classification & filtering system |
| Pagination | P0 | S | 4 | ✅ Complete | 12 items per page |
| **HTML file upload support** | **P1** | **M** | **Latest** | **✅ Complete** | **Sacred-texts.com format with AI cover generation** |
| **HTML document viewer** | **P1** | **M** | **Latest** | **✅ Complete** | **Zoom (25%-300%), fullscreen, text selection** |
| **Cover image management** | **P1** | **M** | **Latest** | **✅ Complete** | **Cropping modal (2:3 ratio), position controls** |
| **Cover scraping tool** | **P1** | **S** | **Latest** | **✅ Complete** | **Admin tool to fetch/generate covers** |
| **Chapter viewer enhancements** | **P1** | **M** | **Latest** | **✅ Complete** | **Fullscreen, zoom, text highlighting for annotations** |
| Semantic search (vector) | P1 | L | 12 | ⬜ Planned | pgvector |
| Advanced search (Boolean) | P1 | M | Post | ⬜ Planned | AND/OR/NOT |
| OCR quality review | P1 | M | Post | ⬜ Planned | Human-in-loop |
| Document versioning | P2 | L | Post | ⬜ Planned | S3 versions |
| Multi-language support | P2 | XL | Post | ⬜ Planned | i18n |
| Audio narration | P3 | L | Year 2 | ⬜ Planned | Text-to-speech |

### 2. PERSONAL GRIMOIRE

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Tiptap editor setup | P0 | M | 5 | ✅ Complete | Core blocks (Sprint 5) |
| Page CRUD operations | P0 | M | 5 | ✅ Complete | Create/read/update/delete (Sprint 5) |
| Auto-save functionality | P0 | S | 5 | ✅ Complete | Debounced (Sprint 5) |
| Slash command menu | P0 | M | 5 | ✅ Complete | / trigger for block insertion (Sprint 5) |
| Block drag-and-drop | P0 | M | 5 | ✅ Complete | ⋮⋮ handle with visual feedback (Sprint 5) |
| Page sidebar navigation | P0 | M | 5 | ✅ Complete | Tree view (Sprint 5) |
| Clip from library | P0 | M | 5 | ✅ Complete | Save passages with attribution (Sprint 5) |
| Wikilinks [[Page]] | P0 | M | 5 | ✅ Complete | Auto-conversion + keyboard nav (Sprint 5) |
| **WikiLink click activation** | **P0** | **M** | **6** | **✅ Complete** | **Action card with 3 options (Sprint 6)** |
| **WikiLink navigation flow** | **P0** | **M** | **6** | **✅ Complete** | **Open existing + auto-create new pages (Sprint 6)** |
| **WikiLink preview modal** | **P1** | **M** | **6** | **✅ Complete** | **Page content + backlinks with caching (Sprint 6)** |
| **WikiLink AI actions** | **P1** | **M** | **6** | **✅ Complete** | **Summarize/Suggest/Draft placeholders (Sprint 6)** |
| **WikiLink telemetry** | **P2** | **S** | **6** | **✅ Complete** | **History tracking + localStorage (Sprint 6)** |
| Export to Markdown | P0 | S | 5 | ✅ Complete | Full formatting preserved (Sprint 5) |
| Export to HTML | P0 | S | 5 | ✅ Complete | Styled output (Sprint 5) |
| Backlinks panel | P1 | M | 5 | ✅ Complete | Shows incoming WikiLinks (Sprint 5) |
| Export to PDF | P1 | M | 5 | ✅ Complete | Puppeteer-based with pagination (Sprint 5) |
| Export to Notion | P1 | M | 7 | ⬜ Planned | Blocks format |
| Nested pages (hierarchy) | P1 | M | 5 | ✅ Complete | parent_id field in migration 015 (Sprint 5) |
| Page templates | P2 | M | Post | ⬜ Planned | Ritual, study, etc. |
| Collaborative editing | P2 | XL | Post | ⬜ Planned | Real-time sync |
| Version history | P2 | L | Post | ⬜ Planned | Time travel |
| Custom CSS per page | P3 | M | Year 2 | ⬜ Planned | Advanced users |
| Bi-directional Notion sync | P3 | XL | Year 2 | ⬜ Planned | Premium tier |

### 3. USER LIBRARY FEATURES (NEW - BONUS DELIVERABLES)

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Reading progress tracking | P0 | M | 4 | ✅ Complete | Per-user, per-document with sidebar |
| User collections | P0 | M | 4 | ✅ Complete | Create, manage, organize documents |
| Annotations & highlights | P0 | M | 4 | ✅ Complete | Notes tab with quote/note saving |
| Bookmark documents | P0 | S | 4 | ✅ Complete | Quick access from library & viewer |
| My Library page | P0 | M | 4 | ✅ Complete | Personal collection view |
| Admin usage tracking | P1 | L | 4 | ✅ Complete | Analytics dashboard with cost monitoring |
| **Annotation search (Fuse.js)** | **P1** | **XS** | **4** | **✅ Complete** | **Client-side fuzzy search across all annotations (Oct 27)** |
| **PostgreSQL FTS annotation search** | **P1** | **S** | **5** | **✅ Complete** | **Server-side full-text search with tsvector + GIN index (Sprint 5)** |
| **Concept Search (Deep Search)** | **P1** | **M** | **Current** | **🔄 Active** | **Semantic vector search across all books with related terms (Dec 2024)** |
| Collection sharing | P1 | M | Post | ⬜ Planned | Share collections with others |
| Export annotations to Markdown | P1 | XS | 5 | ✅ Complete | Download annotations as Markdown (Sprint 5) |
| Export annotations to CSV | P1 | XS | 5 | ✅ Complete | Download annotations as CSV (Sprint 5) |
| Share annotations (collaborative) | P1 | M | Post | ⬜ Planned | Collaborative annotation features (2-3 hours) |
| Reading goals | P2 | M | Post | ⬜ Planned | Set and track reading targets |
| Reading statistics | P2 | M | Post | ⬜ Planned | Time spent, pages read analytics |

### 4. TEXT-TO-SPEECH (Read Aloud)

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| TTS service architecture | P1 | L | 5 | ✅ Complete | Factory pattern, dual engines (Sprint 5) |
| AudioPlayer component | P1 | M | 5 | ✅ Complete | Floating controls, full features (Sprint 5) |
| TTSSettings modal | P1 | M | 5 | ✅ Complete | Free/premium voice management (Sprint 5) |
| TextHighlight component | P1 | S | 5 | ✅ Complete | Real-time sync with audio (Sprint 5) |
| Reading position tracking | P1 | M | 5 | ⚠️ Requires Testing | API + DB migration 012 (Sprint 5) |
| TTS preferences storage | P1 | S | 5 | ⚠️ Requires Testing | User preferences in DB (Sprint 5) |
| Web Speech API integration | P1 | M | 5 | ✅ Complete | Free unlimited TTS (Sprint 5) |
| Azure Speech integration | P2 | L | 5 | ✅ Complete | Premium neural voices (Sprint 5) |
| PDF text extraction | P1 | M | 5 | ✅ Complete | Fallback for OCR text (Sprint 5) |
| Speed control (0.5x-2.0x) | P1 | XS | 5 | ✅ Complete | User-adjustable playback (Sprint 5) |
| Volume control | P1 | XS | 5 | ✅ Complete | User-adjustable volume (Sprint 5) |
| Voice selector | P1 | S | 5 | ✅ Complete | Choose from available voices (Sprint 5) |
| Position bookmarking | P1 | M | 5 | ⚠️ Requires Testing | LocalStorage + DB sync (Sprint 5) |
| Cross-tab persistence | P1 | S | 5 | ⚠️ Requires Testing | Sync across browser tabs (Sprint 5) |
| **Click-to-read from position** | **P1** | **M** | **5** | **✅ Complete** | **Click any text block to start reading (Jan 2025)** |
| Keyboard shortcuts | P2 | S | 5 | ✅ Complete | Play/pause/stop shortcuts (Sprint 5) |
| Premium upgrade path | P2 | S | 5 | ✅ Complete | Clear Azure benefits messaging (Sprint 5) |

**Implementation Notes:**
- **Migration Required:** 012 (`012_add_reading_positions.sql`)
- **Testing:** See [TTS Testing Checklist](../testing/SPRINT_5_TESTING_CHECKLIST.md#a-text-to-speech-feature-testing)
- **Documentation:** `docs/TEXT_TO_SPEECH_FEATURE.md`, `docs/TTS_IMPLEMENTATION_SUMMARY.md`
- **Latest Fix (Jan 2025):** Fixed click-to-read functionality with improved text matching, MutationObserver fixes, and position calculation improvements
- **Status:** Implementation complete, click-to-read feature fully functional

### 5. CORRESPONDENCE TABLES (Phase 3A)

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| **PostgreSQL schema (Migration 018)** | **P0** | **M** | **5** | **✅ Complete** | **Correspondences + relationships tables (Sprint 5)** |
| **Dynamic type management (Migration 031)** | **P0** | **M** | **Latest** | **✅ Complete** | **Admin-manageable entity/relationship types with metadata** |
| **Multi-source claims system (Migration 032)** | **P0** | **M** | **Latest** | **✅ Complete** | **knowledge_sources + knowledge_claims tables** |
| **Admin CRUD interface** | **P0** | **M** | **Latest** | **✅ Complete** | **EntityModal with source/claim management** |
| **Consensus vs Sources view** | **P0** | **M** | **Latest** | **✅ Complete** | **EntityDetailModal with tabbed interface** |
| **CSV auto-import script** | **P0** | **L** | **Latest** | **✅ Complete** | **6 schema types, field mapping, BOM handling** |
| **AI text rewrite/generate** | **P1** | **S** | **Latest** | **✅ Complete** | **Sparkles buttons in admin forms** |
| **Basic API routes** | **P1** | **M** | **5** | **🔄 Partial** | **entities/edges endpoints exist (Sprint 5)** |
| **GraphView component** | **P1** | **M** | **5** | **🔄 Placeholder** | **Basic rendering, needs D3 (Sprint 5)** |
| Neptune cluster setup | P0 | L | 8 | ⬜ Deferred | Graph database (optional for Phase 3) |
| Graph schema definition | P0 | M | 8 | ✅ Complete | PostgreSQL schema in place |
| Seed data (100+ entities) | P0 | M | 8 | ⬜ Planned | Classical correspondences data |
| D3.js visualization | P0 | L | 9 | ⬜ Planned | Force-directed |
| Node hover highlights | P0 | S | 9 | ⬜ Planned | Show connections |
| Click to view details | P0 | M | 9 | ⬜ Planned | Modal popup |
| Pan and zoom controls | P0 | S | 9 | ⬜ Planned | D3 behaviors |
| Add entity form | P0 | M | 10 | ⬜ Planned | Create vertices |
| Create relationship | P0 | M | 10 | ⬜ Planned | Add edges |
| Table view of entities | P0 | M | 10 | ⬜ Planned | TanStack Table |
| Filter by type | P0 | S | 9 | ⬜ Planned | Show/hide types |
| 5 preset lenses | P0 | M | 10 | ⬜ Planned | Astro, Elemental, etc. |
| PostgreSQL sync | P1 | L | 8 | ⬜ Planned | Bi-directional |
| Search entities | P1 | S | 10 | ⬜ Planned | Name search |
| Edit entity/relationship | P1 | M | 10 | ⬜ Planned | Update props |
| Delete entity/relationship | P1 | M | 10 | ⬜ Planned | With confirmation |
| Drag to reposition nodes | P1 | M | 9 | ⬜ Planned | Manual layout |
| Export graph as JSON | P1 | S | Post | ⬜ Planned | Backup |
| Global graph view | P2 | L | Post | ⬜ Planned | All entities |
| 3D graph (Three.js) | P2 | XL | Post | ⬜ Planned | Immersive viz |
| Temporal graph | P2 | XL | Post | ⬜ Planned | Evolution over time |
| Community graph editing | P3 | XL | Year 2 | ⬜ Planned | Collaborative |
| VR graph exploration | P3 | XL | Year 3 | ⬜ Planned | WebXR |

### 5A. CONVERGENCE GRAPH (Phase 3B) - ✅ UI COMPLETE

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| **PostgreSQL schema (Migration 019)** | **P0** | **M** | **5** | **✅ Complete** | **convergence_concepts + convergence_relationships tables** |
| **API routes (/api/concepts)** | **P0** | **M** | **5** | **✅ Complete** | **GET/POST endpoints for concepts and relationships** |
| **Convergence Graph page (/convergence-graph)** | **P0** | **M** | **Current** | **✅ Complete** | **Main page with view mode toggle** |
| **D3.js network visualization** | **P0** | **L** | **Current** | **✅ Complete** | **Force-directed graph with pan/zoom/drag** |
| **Comparative table view** | **P0** | **M** | **Current** | **✅ Complete** | **Sortable table with similarity indicators** |
| **Concept detail modal** | **P0** | **M** | **Current** | **✅ Complete** | **Full concept info + related concepts** |
| **Similarity controls** | **P0** | **S** | **Current** | **✅ Complete** | **Search, threshold slider, tradition filter** |
| **Tradition legend** | **P0** | **S** | **Current** | **✅ Complete** | **Color-coded tradition sidebar** |
| Seed cross-tradition concepts | P0 | M | Current | ⬜ Next | 30+ concepts (Emptiness, Unity, etc.) |
| Seed relationships | P0 | M | Current | ⬜ Next | 40+ cross-tradition connections |
| Source citations | P0 | S | Current | ✅ Complete | Citation field in relationships |
| Export to CSV/Markdown | P1 | S | Post | ⬜ Planned | Export functionality |
| Path finding algorithm | P1 | M | Post | ⬜ Planned | Shortest path between concepts |
| Cluster detection | P1 | M | Post | ⬜ Planned | Auto-group similar concepts |
| Admin CRUD interface | P1 | M | Latest | ✅ Complete | Create/edit entities with sources/claims via UI |
| Relationship strength editor | P1 | S | Post | ⬜ Planned | Adjust similarity scores |
| Cross-tradition search | P1 | S | Post | ⬜ Planned | Search across all traditions |
| Concept suggestions | P2 | L | Post | ⬜ Planned | AI-suggested new concepts |
| Temporal evolution view | P2 | XL | Post | ⬜ Planned | How concepts evolved over time |

### 5B. MULTI-SOURCE KNOWLEDGE CLAIMS SYSTEM - ✅ COMPLETE

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| **knowledge_sources table (Migration 032)** | **P0** | **M** | **Latest** | **✅ Complete** | **Source metadata (title, author, year, citation, URL)** |
| **knowledge_claims table (Migration 032)** | **P0** | **M** | **Latest** | **✅ Complete** | **Field-specific claims linked to entities + sources** |
| **Admin source management UI** | **P0** | **M** | **Latest** | **✅ Complete** | **Inline source creation in EntityModal** |
| **Multi-claim management UI** | **P0** | **M** | **Latest** | **✅ Complete** | **Add/edit/delete claims by field in EntityModal** |
| **Consensus vs Sources view** | **P0** | **M** | **Latest** | **✅ Complete** | **EntityDetailModal with tabbed interface** |
| **CSV auto-import script** | **P0** | **L** | **Latest** | **✅ Complete** | **6 schema types, field mapping, BOM handling** |
| **Schema detection** | **P0** | **M** | **Latest** | **✅ Complete** | **Auto-detect: plants, angels, orishas, gods, crystals, chakras** |
| **Field mapping system** | **P0** | **M** | **Latest** | **✅ Complete** | **Type-specific CSV field → claim field mappings** |
| **Dynamic type management (Migration 031)** | **P0** | **M** | **Latest** | **✅ Complete** | **Admin-manageable entity/relationship types** |
| **AI text rewrite/generate** | **P1** | **S** | **Latest** | **✅ Complete** | **Sparkles buttons for description/short_definition** |
| Consensus algorithm | P1 | M | Post | ⬜ Planned | Weighted by source credibility |
| Source credibility scoring | P1 | M | Post | ⬜ Planned | Academic vs popular sources |
| Bulk claim import | P1 | M | Post | ⬜ Planned | Import multiple CSVs at once |
| Claim conflict detection | P1 | M | Post | ⬜ Planned | Flag conflicting claims |
| Source verification workflow | P2 | L | Post | ⬜ Planned | Admin review for new sources |

### 5. THE CONVERGENCE MACHINE (7-Lens AI System) - ✅ MVP COMPLETE

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| OpenAI GPT-4o integration | P0 | M | 4 | ✅ Complete | Primary AI - Metadata extraction |
| 7 Lenses document classification | P0 | M | 4 | ✅ Complete | AI assigns 2-4 lenses per document |
| Lens filtering in library | P0 | M | 4 | ✅ Complete | Multi-select lens filter interface |
| OpenAI API integration | P0 | M | MVP | ✅ Complete | Response generation with GPT-4o |
| Response streaming (SSE) | P0 | M | MVP | ✅ Complete | Real-time streaming via Server-Sent Events |
| Text chunking system | P0 | M | MVP | ✅ Complete | Smart paragraph boundaries with overlap |
| Embedding generation | P0 | L | MVP | ✅ Complete | OpenAI text-embedding-3-small (1536d) |
| Vector search retrieval | P0 | L | MVP | ✅ Complete | pgvector cosine similarity |
| FTS search retrieval | P0 | M | MVP | ✅ Complete | PostgreSQL full-text search |
| Hybrid ranking (RRF) | P0 | L | MVP | ✅ Complete | Reciprocal Rank Fusion merging |
| Citation extraction | P0 | M | MVP | ✅ Complete | Source passages with text links |
| 7 lens prompts (6+Mathematical) | P0 | L | MVP | ✅ Complete | All 7 perspectives defined |
| Per-lens retrieval | P0 | M | MVP | ✅ Complete | Hybrid retrieval per lens |
| Answer composition | P0 | M | MVP | ✅ Complete | Multi-lens synthesis + merging |
| Lens orchestrator | P0 | L | MVP | ✅ Complete | generateLensResponse + mergeLensResponses |
| AI query UI | P0 | M | MVP | ✅ Complete | Full UI at /convergence-machine |
| **Lens weight sliders (7 sliders)** | P0 | M | MVP | ✅ Complete | **0-100% individual sliders with percentage display** |
| Lens on/off toggles | P0 | S | MVP | ✅ Complete | Built into slider controls |
| Lens presets system | P0 | M | MVP | ✅ Complete | Equal, Scholar, Practitioner, Seeker presets |
| Conversation history | P0 | M | MVP | ✅ Complete | Full history API + database storage |
| Premium paywall | P0 | M | MVP | ✅ Complete | Subscription check + upgrade prompts |
| Rate limiting | P0 | M | MVP | ✅ Complete | Free: 5/month, Premium: unlimited |
| Database schema | P0 | M | MVP | ✅ Complete | text_chunks, convergence_queries, convergence_responses |
| Subscription status system | P0 | S | MVP | ✅ Complete | Users table subscription_status column |
| AI response caching | P1 | M | Post | ⬜ Planned | Hash-based optimization (deferred) |
| Graph-based retrieval | P1 | M | Post | ⬜ Planned | Neptune queries (when Neptune set up) |
| Save custom lens presets | P1 | S | Post | ⬜ Planned | User-defined presets |
| Confidence scoring | P1 | M | Post | ⬜ Planned | Per-answer confidence metrics |
| Query refinement | P1 | M | Post | ⬜ Planned | AI suggestions |
| Export conversation | P1 | S | Post | ⬜ Planned | Markdown export |
| Lens comparison view | P1 | M | Post | ⬜ Planned | Side-by-side answers |
| Continue conversation | P1 | M | Post | ⬜ Planned | Context-aware follow-ups |
| **Epistemic inline labeling** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **Established/Contested/Speculative/Metaphor/Devotional tags in responses** |
| **Structured answer framing** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **"What we know / What's debated / Where analogies are speculative" structure** |
| **Discovery ethos system preface** | **P1** | **S** | **Post-MVP** | **⬜ Planned** | **Curiosity, humility, pluralism, rigor principles in all queries** |
| **Enhanced UI controls** | **P1** | **L** | **Post-MVP** | **⬜ Planned** | **Comparative toggle, Breadth/Depth slider, Include physics/psychology, Speculative analogies switch, Scholars disagree button** |
| **Physics metadata schema** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **discipline, subfield, evidence_type, math_level fields** |
| **Physics metadata extraction** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **AI extraction of new physics metadata fields** |
| **Physics metadata filtering** | **P1** | **S** | **Post-MVP** | **⬜ Planned** | **Library filters for discipline, evidence_type, math_level** |
| Token-level streaming | P2 | L | Post | ⬜ Planned | Real-time token display |
| Image generation | P2 | L | Post | ⬜ Planned | DALL-E/Midjourney |
| Voice input | P2 | M | Post | ⬜ Planned | Whisper API |
| Custom AI training | P3 | XL | Year 2 | ⬜ Planned | Pro tier |

**The 7 Lenses:**
1. **Scientific** - Physics, biology, cosmology
2. **Psychological** - Jungian, cognitive science, archetypes  
3. **Philosophical** - Metaphysics, ethics, epistemology
4. **Religious/Spiritual** - Comparative theology, mysticism, sacred texts
5. **Historical/Anthropological** - Cultural evolution, mythology
6. **Symbolic/Occult** - Correspondences, alchemy, astrology
7. **Mathematical** - Sacred geometry, numerology, universal patterns

**Lens Weight Sliders Feature (NEW):**
- Each lens gets a slider control (0-100%)
- Default: All lenses at equal weight (≈14% each)
- Users adjust to emphasize perspectives relevant to their query
- Example: Scholar researching historical context → boost Historical/Anthropological to 40%, reduce others
- Example: Practitioner planning ritual → boost Symbolic/Occult to 50%, Religious/Spiritual to 30%
- Weights determine: retrieval strategy emphasis, token allocation in prompt, answer section prominence
- Saved presets available for common research patterns

### 5C. DISCOVERY ENGINE (Phase 6 - Post-MVP)

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| **Cross-domain concept alignment** | **P1** | **L** | **Post-MVP** | **⬜ Planned** | **Embedding-based clustering with human-in-the-loop approval** |
| **Natural Language Inference filtering** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **Filter spurious cross-domain links using NLI** |
| **Cross-domain concept UI** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **"Related across traditions/sciences" display** |
| **Unsupervised topic discovery** | **P1** | **L** | **Post-MVP** | **⬜ Planned** | **BERTopic-style pipeline for emerging themes** |
| **Topic editorial review workflow** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **Admin interface for topic approval** |
| **Topic filtering in library** | **P1** | **S** | **Post-MVP** | **⬜ Planned** | **Add discovered topics as filter options** |
| **User question logging** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **Track questions + best sources + groundedness scores** |
| **Learning suggestions batch job** | **P1** | **L** | **Post-MVP** | **⬜ Planned** | **Suggest new edges, missing books, prompt tweaks** |
| **Learning review panel** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **Admin interface for reviewing learning suggestions** |
| **Evaluation system** | **P1** | **L** | **Post-MVP** | **⬜ Planned** | **Gold tests + groundedness/faithfulness metrics** |
| **Structured corpus layers** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **Foundational physics, science-of-science, history/context, popularizations** |
| **Corpus layer retrieval rules** | **P1** | **M** | **Post-MVP** | **⬜ Planned** | **Transparent labeling when mixing religion + physics** |
| **Corpus layer UI** | **P1** | **S** | **Post-MVP** | **⬜ Planned** | **Display and filter by corpus layer in library** |

**Discovery Engine Goals:**
- Automated discovery of conceptual parallels across traditions
- Pattern mining to surface emerging themes
- Self-learning loop that improves from user interactions
- Structured corpus organization for rigorous physics-spirituality integration

### 5B. UNIVERSAL AI SEARCH & CHAT SYSTEM - ✅ COMPLETE (November 3, 2025)

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Floating AI Search Bar | P1 | M | Latest | ✅ Complete | Expandable floating component accessible from all pages |
| Smart Model Selection | P1 | M | Latest | ✅ Complete | Auto-selects least-used model (Claude, GPT, Gemini) |
| AI Chat Modal | P1 | L | Latest | ✅ Complete | Full-featured chat interface with conversation history |
| Claude API Integration | P1 | M | Latest | ✅ Complete | `/api/ai/claude` endpoint with streaming support |
| GPT API Integration | P1 | M | Latest | ✅ Complete | `/api/ai/gpt` endpoint with streaming support |
| Gemini API Integration | P1 | M | Latest | ✅ Complete | `/api/ai/gemini` endpoint with streaming support |
| AI Usage Tracking | P1 | M | Latest | ✅ Complete | `/api/ai/usage` tracks monthly usage per model |
| Chapter Name Generation | P1 | M | Latest | ✅ Complete | `/api/chapters/generate-names` for automated chapter naming |
| Chapter Name Updates | P1 | S | Latest | ✅ Complete | `/api/chapters/update-names` for batch updates |
| Document Metadata Generation | P1 | M | Latest | ✅ Complete | `/api/documents/generate-metadata` for automated extraction |
| Full Curator Notes Display | P1 | XS | Latest | ✅ Complete | Library cards show complete curator notes |
| Homepage AI Search | P1 | XS | Latest | ✅ Complete | AI search bar on homepage |
| Library Integration | P1 | XS | Latest | ✅ Complete | Floating search on library page |
| Graph Integration | P1 | XS | Latest | ✅ Complete | Floating search on graph page |
| Journal Integration | P1 | XS | Latest | ✅ Complete | Floating search on journal pages |
| Document Viewer Integration | P1 | XS | Latest | ✅ Complete | Floating search on document detail pages |
| Model-specific conversation history | P1 | M | Post | ⬜ Planned | Per-model conversation tracking |
| Conversation export | P1 | S | Post | ⬜ Planned | Export chat history to Markdown |
| Search result highlighting | P2 | M | Post | ⬜ Planned | Highlight search terms in results |
| Voice input for search | P2 | M | Post | ⬜ Planned | Whisper API integration |
| Search suggestions | P2 | M | Post | ⬜ Planned | AI-powered query suggestions |
| Multi-language support | P2 | L | Post | ⬜ Planned | Translate queries/responses |

**Technical Highlights:**
- Smart model selection balances load across AI providers automatically
- Usage tracking prevents API quota exhaustion by routing to least-used model
- Floating UI provides consistent AI access across all pages without navigation
- Modular architecture supports easy addition of new AI models
- Full conversation history with model-specific tracking

### 6. COMMUNITY & TOKENOMICS

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Points system (off-chain) | P0 | M | 15 | ⬜ Planned | Contribution tracking |
| Award points for actions | P0 | M | 15 | ⬜ Planned | Upload, curate, etc. |
| Badge system | P0 | M | 15 | ⬜ Planned | Scribe, Archivist |
| User leaderboard | P0 | M | 15 | ⬜ Planned | Top contributors |
| Display badges on profile | P0 | S | 15 | ⬜ Planned | Trophy case |
| Rank progression | P0 | M | 16 | ⬜ Planned | Neophyte → Magus |
| Forum/discussion system | P0 | L | 17 | ⬜ Planned | Topic-based |
| Topic categories (guilds) | P0 | M | 17 | ⬜ Planned | Alchemy, Astrology |
| Thread creation | P0 | M | 17 | ⬜ Planned | Posts + replies |
| Moderation tools | P0 | M | 17 | ⬜ Planned | Flag, ban, delete |
| ERC-20 token contract | P0 | L | 18 | ⬜ Planned | Create Coin |
| Governance voting | P0 | L | 18 | ⬜ Planned | On-chain |
| Token whitepaper | P0 | M | 18 | ⬜ Planned | Tokenomics doc |
| Legal opinion | P0 | L | 18 | ⬜ Planned | Utility token |
| Terms of Service | P0 | M | 18 | ⬜ Planned | Token clauses |
| Testnet deployment | P0 | M | 18 | ⬜ Planned | Pre-mainnet |
| Upvote/downvote posts | P1 | S | Post | ⬜ Planned | Community signal |
| Reputation system | P1 | M | Post | ⬜ Planned | Quality score |
| Notification system | P1 | L | Post | ⬜ Planned | Email + in-app |
| Direct messaging | P2 | L | Post | ⬜ Planned | User-to-user |
| NFT achievements | P2 | XL | Post | ⬜ Planned | Mint badges |
| DAO governance | P3 | XL | Year 2 | ⬜ Planned | Full decentralization |

### 7. RITUAL INVENTORY (NEW)

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Inventory database schema | P0 | S | Post | ⬜ Planned | From tech plan |
| Add item form | P0 | M | Post | ⬜ Planned | Name, category, qty |
| Edit/delete items | P0 | M | Post | ⬜ Planned | CRUD operations |
| Item categories (12 types) | P0 | S | Post | ⬜ Planned | Herb, crystal, etc. |
| Photo upload for items | P0 | M | Post | ⬜ Planned | S3 storage |
| Inventory grid view | P0 | M | Post | ⬜ Planned | Cards layout |
| Ritual template library | P0 | L | Post | ⬜ Planned | Pre-made rituals |
| AI ritual matcher | P0 | XL | Post | ⬜ Planned | Match inventory |
| Substitution engine | P0 | L | Post | ⬜ Planned | Neptune graph |
| Shopping list generator | P1 | M | Post | ⬜ Planned | Missing items |
| Quantity tracking | P1 | M | Post | ⬜ Planned | Consume/replenish |
| Expiration dates | P2 | S | Post | ⬜ Planned | Herbs, oils |
| Barcode scanning | P3 | M | Year 2 | ⬜ Planned | Mobile app |

---

## TECHNICAL INFRASTRUCTURE

### File Storage & Processing

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Cloudflare R2 setup | P0 | S | 3 | ✅ Complete | **Migrated from AWS S3** |
| R2 API token generation | P0 | XS | 3 | ✅ Complete | Read/write access |
| CORS configuration | P0 | XS | 3 | ✅ Complete | Web uploads |
| Presigned URL generation | P0 | M | 3 | ✅ Complete | S3-compatible API |
| File versioning | P1 | S | Post | ⬜ Planned | Backup strategy |
| OCR service integration | P1 | L | 4 | ✅ Complete | **Azure Computer Vision** |

### Authentication & Security

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Email/password auth | P0 | M | 2 | ✅ Complete | Supabase Auth |
| Protected routes | P0 | S | 2 | ✅ Complete | Middleware |
| Role-based access (RBAC) | P0 | M | 2 | ✅ Complete | Admin, user, contributor |
| RLS policies | P0 | M | 2 | ✅ Complete | Database-level + Storage |
| Password reset | P1 | M | 2 | ✅ Complete | Email link |
| Email verification | P1 | S | 2 | ✅ Complete | Required + resend |
| **Configure SendGrid SMTP** | **P0** | **S** | **Pre-Prod** | **✅ Complete** | **Production email delivery - Domain authenticated, SMTP configured** |
| Social auth (Google) | P1 | M | Post | ⬜ Planned | OAuth |
| Two-factor auth (2FA) | P2 | L | Post | ⬜ Planned | TOTP |
| Magic link login | P2 | M | Post | ⬜ Planned | Passwordless |

### Performance & Scalability

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Database indexes | P0 | S | 1 | ✅ Complete | FTS, vector, RLS |
| Image optimization | P0 | M | 2 | ✅ Complete | Avatar compression (1024px, 85%) |
| Response caching | P0 | M | 11 | ⬜ Planned | AI responses |
| CDN for static assets | P1 | S | Post | ⬜ Planned | CloudFront |
| Lazy loading | P1 | M | Post | ⬜ Planned | Images, code splits |
| Service worker | P2 | L | Post | ⬜ Planned | Offline support |
| Redis caching | P2 | L | Post | ⬜ Planned | Beyond free tier |

### DevOps & Monitoring

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| GitHub repository | P0 | XS | 1 | ✅ Complete | Version control |
| CI/CD pipeline | P0 | M | 1 | 🟡 Partial | GitHub ready, actions pending |
| Vercel deployment | P0 | S | 1 | 🟡 Partial | Ready to deploy |
| Environment variables | P0 | XS | 1 | ✅ Complete | .env management |
| Quick start guide (QUICK_START.md) | P0 | XS | 6 | ✅ Complete | Server commands quick reference |
| Error tracking (Sentry) | P1 | S | Latest | ✅ Complete | @sentry/nextjs installed, configured, ready for DSN |
| **Discord Sentry alerts** | **P1** | **S** | **31-32** | **⬜ Planned** | **Webhook integration for error notifications** |
| CloudWatch alarms | P1 | M | Post | ⬜ Planned | AWS monitoring |
| Uptime monitoring | P1 | S | Latest | ✅ Complete | Health endpoint created, ready for external service |
| Database backups | P1 | M | Post | ⬜ Planned | Automated |
| Terraform IaC | P2 | L | Post | ⬜ Planned | Reproducible infra |

### Testing & Quality

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| ESLint + Prettier | P0 | XS | 1 | ✅ Complete | Code quality |
| TypeScript strict mode | P0 | XS | 1 | ✅ Complete | Type safety |
| Unit tests (Vitest) | P1 | L | Post | ⬜ Planned | 80% coverage |
| E2E tests (Playwright) | P1 | XL | Post | ⬜ Planned | Critical paths |
| Lighthouse CI | P1 | M | Post | ⬜ Planned | Performance |
| Accessibility audit | P1 | M | Post | ⬜ Planned | WCAG 2.1 AA |
| Load testing | P2 | L | Post | ⬜ Planned | K6 or Artillery |

---

## UI/UX ENHANCEMENTS

### Design System

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Color palette (dark theme) | P0 | XS | 1 | ✅ Complete | Dark Academia (Amber/Zinc) |
| Typography (serif + sans) | P0 | XS | 1 | ✅ Complete | Geist Sans + Geist Mono |
| Component library (Radix) | P0 | M | 2 | 🟡 Partial | Basic components, more to come |
| Cursor interaction rules | P0 | S | 2 | ✅ Complete | From design doc |
| Loading states | P0 | M | 4 | 🟡 Partial | Spinners done, skeleton screens next |
| Error states | P0 | M | 4 | ✅ Complete | Toast notifications |
| Toast notifications | P1 | S | 2 | ✅ Complete | Sonner implemented! |
| Admin navigation single-source (`Header` `adminLinks`) | P0 | XS | 6 | ✅ Complete | Centralized admin links, rule documented |
| Light theme | P2 | M | Post | ⬜ Planned | Accessibility |
| Custom theme builder | P3 | L | Year 2 | ⬜ Planned | User preference |

### Accessibility

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Keyboard navigation | P0 | M | Post | ⬜ Planned | All features |
| Screen reader support | P0 | M | Post | ⬜ Planned | ARIA labels |
| High contrast mode | P1 | M | Post | ⬜ Planned | Visual impairment |
| Focus indicators | P1 | S | Post | ⬜ Planned | Visible outlines |
| Alt text for images | P1 | M | Post | ⬜ Planned | Descriptive |
| Semantic HTML | P1 | S | Post | ⬜ Planned | Proper tags |
| Skip to content link | P2 | XS | Post | ⬜ Planned | Bypass nav |

### Mobile Experience

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Responsive design | P0 | L | 2-4 | ✅ Complete | Mobile-first with Tailwind |
| Touch-friendly UI | P0 | M | Post | 🟡 Partial | Dashboard done, more to come |
| Mobile navigation | P0 | M | 2 | 🟡 Partial | Header done, sidebar next |
| PWA support | P1 | L | Post | ⬜ Planned | Installable |
| Offline mode | P2 | XL | Post | ⬜ Planned | Service worker |
| Native mobile apps | P3 | XL | Year 2 | ⬜ Planned | React Native |

---

## CONTENT & SEO

### Content Marketing

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| About page | P0 | S | Post | ⬜ Planned | Mission statement |
| Help/FAQ page | P0 | M | Post | ⬜ Planned | Common questions |
| Blog setup | P1 | M | Post | ⬜ Planned | Next.js MDX |
| SEO metadata | P1 | M | Post | ⬜ Planned | Titles, descriptions |
| Sitemap generation | P1 | S | Post | ⬜ Planned | next-sitemap |
| RSS feed | P2 | S | Post | ⬜ Planned | Blog updates |
| Newsletter signup | P2 | M | Post | ⬜ Planned | ConvertKit |

### Analytics

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Plausible Analytics | P1 | S | Post | ⬜ Planned | Privacy-first |
| User behavior tracking | P1 | M | Post | ⬜ Planned | Opt-in |
| Search analytics | P1 | M | Post | ⬜ Planned | Popular queries |
| A/B testing | P2 | L | Post | ⬜ Planned | Optimize conversion |
| Heatmaps | P2 | M | Post | ⬜ Planned | Hotjar |

---

## BUSINESS & MONETIZATION

### Payment System

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Stripe integration | P0 | L | 14 | ⬜ Planned | Payment processing |
| Premium subscription | P0 | M | 14 | ⬜ Planned | $15/month |
| Subscription management | P0 | M | 14 | ⬜ Planned | Cancel, upgrade |
| Invoices & receipts | P1 | M | Post | ⬜ Planned | Automatic emails |
| Annual plans | P1 | S | Post | ⬜ Planned | 2-month discount |
| Team/org plans | P2 | L | Post | ⬜ Planned | Multi-seat |
| Lifetime access | P2 | M | Post | ⬜ Planned | One-time payment |
| Affiliate program | P3 | XL | Year 2 | ⬜ Planned | Commission-based |

### Admin Tools

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| User management | P0 | M | 2 | ⬜ Planned | View, ban, delete |
| Content moderation | P0 | M | Post | ⬜ Planned | Review queue |
| **Reliable admin access check** | **P0** | **S** | **Latest** | **✅ Complete** | **Server-side API route for admin verification** |
| **Knowledge Graph admin UI** | **P0** | **M** | **Latest** | **✅ Complete** | **Entity/claim management with sources** |
| **CSV import tool** | **P0** | **L** | **Latest** | **✅ Complete** | **Auto-import from CSV with schema detection** |
| **Type management UI** | **P0** | **M** | **Latest** | **✅ Complete** | **Create/edit entity/relationship types** |
| Analytics dashboard | P1 | L | Post | ⬜ Planned | Revenue, users |
| Feature flags | P1 | M | Post | ⬜ Planned | A/B tests |
| Announcement system | P2 | M | Post | ⬜ Planned | In-app banners |

---

## INTEGRATION & ECOSYSTEM

### Third-Party Integrations

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Notion export | P1 | M | 7 | ⬜ Planned | Grimoire to Notion |
| Obsidian export | P2 | M | Post | ⬜ Planned | Markdown vault |
| Roam Research export | P2 | M | Post | ⬜ Planned | JSON format |
| Zapier integration | P2 | L | Post | ⬜ Planned | Automation |
| **Discord server setup** | **P1** | **M** | **31-32** | **⬜ Planned** | **Server creation, channels, Sentry integration** |
| **Discord Sentry webhook** | **P1** | **S** | **31-32** | **⬜ Planned** | **Real-time error alerts to Discord** |
| **Discord "Join" button** | **P1** | **XS** | **31-32** | **⬜ Planned** | **Add invite link to app footer/header** |
| Discord bot | P2 | L | Post | ⬜ Planned | Automation, moderation, request tracking |
| Twitter/X integration | P3 | M | Year 2 | ⬜ Planned | Share quotes |

### API & Developer Tools

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Public REST API | P3 | XL | Year 2 | ⬜ Planned | Pro tier |
| API documentation | P3 | L | Year 2 | ⬜ Planned | OpenAPI spec |
| Webhooks | P3 | M | Year 2 | ⬜ Planned | Event notifications |
| GraphQL API | P3 | XL | Year 2 | ⬜ Planned | Alternative |
| SDKs (JS, Python) | P3 | XL | Year 3 | ⬜ Planned | Client libraries |

---

## PHASE 1 EXTRAS DELIVERED

Beyond the planned MVP scope, these features were completed ahead of schedule:

**7 Convergence Lenses System:**
- AI-powered classification of documents by perspective
- Multi-select lens filtering interface
- Database migration 007 with proper indexing
- Integration with metadata extraction pipeline

**User Library Features:**
- Reading progress tracking with sidebar display
- User collections (create, manage, organize)
- Annotations & highlights with notes tab
- Bookmark functionality throughout app
- My Library page (personalized collection view)

**Admin & Analytics:**
- Complete usage tracking system
- Cost monitoring dashboard
- Service stats and top users analytics
- Real-time metrics and alerts

**Estimated Additional Value:** ~40 hours of features delivered  
**Impact:** Significantly enhanced user engagement and retention capabilities

---

## TOTAL FEATURE COUNT

- **P0 (Must Have):** 137 features (+10 delivered early)
- **P1 (Should Have):** 77 features (+1 delivered early)
- **P2 (Nice to Have):** 45 features
- **P3 (Future):** 18 features

**Total:** 277 features across entire roadmap (+11 new user library features added)

---

## ESTIMATED EFFORT

- **MVP (P0 only):** ~1,000 hours (6-8 months, 3-person team)
- **V1.0 (P0 + P1):** ~1,600 hours (10-12 months, 3-person team)
- **V2.0 (All P0/P1/P2):** ~2,200 hours (14-18 months, 4-person team)

---

## DECISION FRAMEWORK

### Should we build this feature now?

Ask these questions:

1. **Is it P0?** → Yes: Build in current sprint. No: Continue.
2. **Does it block other P0 features?** → Yes: Prioritize. No: Continue.
3. **Can we ship MVP without it?** → No: Bump to P0. Yes: Continue.
4. **Will it significantly improve conversion?** → Yes: Consider for sprint. No: Defer.
5. **Is the effort < 1 week and value > $1K ARR?** → Yes: Add to sprint. No: Backlog.

### Example Applications

**Feature:** "Export conversation to PDF"
- P0? No (P1)
- Blocks others? No
- Ship MVP without? Yes
- Improve conversion? Maybe (+2% retention)
- Effort < 1w, value > $1K? Effort = 3 days, value uncertain
- **Decision:** Backlog for post-launch

**Feature:** "Auto-save grimoire"
- P0? Yes
- Blocks others? Yes (users will lose work)
- Ship MVP without? No
- **Decision:** Must build in Sprint 6

---

## NEXT STEPS

1. **Review this backlog with team**
2. **Validate P0 features** (can we truly not launch without these?)
3. **Refine effort estimates** after technical spikes
4. **Assign features to sprints** in PROJECT_ROADMAP.md
5. **Create tickets in GitHub Projects**

---

**Last Updated:** October 24, 2025  
**Owner:** Project Lead  
**Next Review:** End of Sprint 1

