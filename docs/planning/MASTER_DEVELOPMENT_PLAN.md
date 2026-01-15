# CONVERGENCE - MASTER DEVELOPMENT PLAN

**Version:** 3.4  
**Last Updated:** January 2026  
**Status:** Phase 1 - 95% Complete | Phase 3B UI Complete | Multi-Source Claims System Complete  
**Latest:** Multi-Source Knowledge Claims System + CSV Auto-Import Complete  

---

## EXECUTIVE SUMMARY

**Convergence** is an ambitious platform that bridges hidden wisdom from all traditions with modern technology. We honor esoteric traditions, religious texts, philosophical works, and consciousness-exploring sciences, showing how all paths converge to reveal our fundamental unity. This master plan synthesizes technical architecture, business strategy, UI/UX design, and operational workflows into a unified development roadmap.

**Our Mission:** To make hidden wisdom accessible while maintaining scholarly rigor - serving everyone from bedroom researchers to professional scholars in their quest to understand themselves, their world, and their universe.

### Project Pillars

1. **The Convergence Library** - Searchable repository of esoteric, religious, philosophical, and wisdom texts with full OCR
2. **Correspondence Tables** - Interactive knowledge graph of traditional esoteric symbolic relationships
3. **The Convergence Graph** - Cross-tradition unity visualization showing conceptual parallels
4. **Study Journal** - Private Notion-like workspace for personal research and synthesis
5. **The Convergence Machine** - Seven-perspective AI reasoning system with adjustable lens weighting (Premium)
6. **Community Token Economy** - Reward-driven contribution system

### Key Success Metrics

- **MVP Launch:** 6 months from start
- **Initial Corpus:** 100+ digitized texts
- **Target Users:** 1,000 MAU in Year 1
- **Conversion Rate:** 3-5% free to premium
- **Budget:** $0-50/month starting, scales with revenue (bootstrapped)

---

## 🎉 PROGRESS REPORT (As of Latest Session)

### What's Been Built (4 weeks of work compressed into ~8 hours!)

**🚀 LATEST UPDATE: TTS Read-Aloud Click-to-Read Feature Fixed! (January 2025)**
- ✅ Fixed click-to-read functionality across all document formats (HTML, Markdown, Plaintext)
- ✅ Restored hover effects on clickable text blocks
- ✅ Fixed MutationObserver infinite loop issues with debouncing and WeakSet tracking
- ✅ Improved text matching with 6 progressive search strategies
- ✅ Enhanced position calculation accuracy (searches in actual fullText)
- ✅ Fixed playback continuation issues (TTS now continues correctly from clicked position)
- ✅ Added exact click position detection using Range API
- ✅ Better error handling and comprehensive logging
- **Status:** Read-aloud feature fully functional, ready for user testing

**🚀 PREVIOUS UPDATE: Multi-Source Knowledge Claims System Complete!**
- ✅ Multi-source claims architecture (knowledge_sources + knowledge_claims tables)
- ✅ Admin UI for managing sources and field-specific claims
- ✅ Consensus vs Sources view on entity detail cards
- ✅ CSV auto-import script with schema detection (plants, angels, orishas, gods, crystals, chakras)
- ✅ Dynamic type management system (admin-manageable entity/relationship types)
- ✅ AI-powered text rewrite/generation buttons in admin forms
- ✅ Successfully imported 10+ crystals with full field mapping
- **Migration 031 & 032 complete, ready for bulk data import**

**🚀 MAJOR UPDATE: Convergence Machine MVP Complete!**
- ✅ Full 7-lens AI reasoning system implemented
- ✅ Hybrid retrieval (vector + FTS) with RRF merging
- ✅ Complete UI with lens sliders and presets
- ✅ Premium gate and rate limiting system
- ✅ Streaming responses with SSE
- ✅ Conversation history
- **18 new files created, MVP ready for testing!**

**✅ Sprint 1: Infrastructure & Setup (1h 53m)**
- Complete Next.js 14 application with TypeScript
- Supabase PostgreSQL database with full schema
- Cloudflare R2 object storage (migrated from AWS)
- Azure Computer Vision API integration
- GitHub repository with version control
- All dependencies installed (666 packages)

**✅ Sprint 2: Authentication & Core UI (2.5h)**
- Full authentication system (login, register, password reset, email verification)
- User profiles with editable fields
- Avatar system with crop/zoom modal and Supabase Storage
- Beautiful Dark Academia UI (Header, Footer, Dashboard)
- Toast notifications for user feedback
- Role-based access control (admin detection)
- Protected routes with middleware

**✅ Sprint 3: Document Processing Pipeline (4h)**
- Admin upload page with drag-and-drop interface
- Cloudflare R2 presigned URL uploads
- Azure Computer Vision OCR integration
- OpenAI GPT-4o metadata extraction
- Automated document classification (20 types)
- Complete processing pipeline: upload → OCR → AI analysis → database
- RLS policies and error handling

**✅ Sprint 4: Public Library & Advanced Features (6h)**
- Library browsing page with search and filters
- PDF document viewer (@react-pdf-viewer)
- Advanced filtering (domain, year range, tags, 7 lenses)
- Pagination for large result sets
- Full-text search (PostgreSQL FTS)
- Document detail pages with tabs
- Bookmark functionality

**✅ Sprint 5: Study Journal MVP + Power Features (6h)**
- **Study Journal MVP** - Tiptap rich-text editor with full formatting toolbar
- **Database schema** - journal_pages table with RLS policies (migration 015)
- **Complete CRUD** - API endpoints and UI pages with auto-save
- **PostgreSQL Full-Text Search** - tsvector column, GIN index, hybrid search (migration 016)
- **Annotation Export** - Markdown and CSV export with filtering
- **Journal Navigation** - Header integration, search, grid layout
- **Total:** 9 files created, 2 modified, 3 documentation files, 1,563 lines of code

**📊 Total Development Time:** ~40 hours (including Convergence Machine MVP + Universal AI Search)  
**Traditional Estimate:** ~900 hours  
**Velocity:** 23x faster with AI-assisted development  
**Phase 1 Progress:** 95% complete (only seeding library content remains)  
**Phase 2 Status:** Study Journal MVP complete (~40% of Phase 2 - 10/17 features)  
**Phase 4 Status:** Convergence Machine MVP complete (95% - ready for testing!)  
**New Feature:** Universal AI Search & Chat System complete (100% - ready for use!)

### Latest Session Updates (January 2026) - Concept Search Feature Complete! 🎉

**🔍 Concept Search (Deep Search) Implementation:**
- ✅ **Semantic Vector Search** - Deep search across all books using OpenAI embeddings
- ✅ **Related Terms Generation** - AI-generated semantically related concepts (GPT-4o)
- ✅ **Top 3 Passages Per Book** - Automatically highlights most relevant passages
- ✅ **Clickable Navigation** - Direct links to exact pages in library
- ✅ **Embedding Diagnostic Tools** - Status check and generation endpoints
- ✅ **Error Handling** - Comprehensive error messages and diagnostics
- ✅ **Vector Search Optimization** - Improved algorithm with similarity thresholds
- 📄 **Documentation** - Complete feature guide (`docs/CONCEPT_SEARCH_FEATURE.md`)

**Files Created:**
- `app/src/components/DeepSearch/DeepSearchPanel.tsx` - Main search interface
- `app/src/components/DeepSearch/RelatedTerms.tsx` - Related concepts display
- `app/src/components/DeepSearch/BookResultCard.tsx` - Book result cards
- `app/src/app/api/convergence/deep-search/route.ts` - Search API endpoint
- `app/src/app/api/convergence/embeddings-status/route.ts` - Diagnostic endpoint
- `app/src/app/api/convergence/generate-embeddings-by-title/route.ts` - Embedding generation helper
- `docs/CONCEPT_SEARCH_FEATURE.md` - Complete feature documentation
- `docs/EMBEDDINGS_DIAGNOSTIC_GUIDE.md` - Diagnostic and troubleshooting guide

**Files Modified:**
- `app/src/lib/convergence/vector-search.ts` - Improved search algorithm
- `app/src/app/api/convergence/deep-search/route.ts` - Enhanced error handling
- `app/src/components/DeepSearch/DeepSearchPanel.tsx` - Better error messages

**Status:** Feature complete, requires embeddings to be generated for texts to return results

### Previous Session Updates (January 2025) - TTS Read-Aloud Fixes Complete! 🎉

**🔊 TTS Read-Aloud Click-to-Read Feature Fixes:**
- ✅ **Fixed click handlers** - All paragraphs now clickable (HTML, Markdown, Plaintext formats)
- ✅ **MutationObserver fixes** - Debouncing and WeakSet tracking prevent infinite loops
- ✅ **Hover effects restored** - Visual feedback on all clickable text blocks
- ✅ **Improved text matching** - 6 progressive search strategies ensure text is found
- ✅ **Position calculation fixes** - Searches in actual fullText for accurate positions
- ✅ **Playback continuation** - TTS now continues correctly from clicked position
- ✅ **Exact click detection** - Range API calculates precise character position
- ✅ **Better error handling** - Comprehensive validation and logging
- 📄 **Session Summary:** `sprint_summaries/TTS_READ_ALOUD_FIX_SESSION_2026-01-15.md`

**Files Modified:**
- `app/src/components/ChapterViewer.tsx` - Fixed MutationObserver, added click position detection
- `app/src/components/HTMLViewer.tsx` - Fixed MutationObserver, improved click handlers
- `app/src/app/library/[id]/page.tsx` - Enhanced text matching with multiple strategies
- `app/src/components/AudioPlayer.tsx` - Added position validation
- `app/src/lib/services/web-speech-tts.ts` - Improved error handling and validation

**Status:** Read-aloud feature fully functional across all document types

### Previous Session Updates (Current Session) - Monitoring Setup Complete! 🎉

**📊 Error Tracking & Uptime Monitoring:**
- ✅ **Sentry Error Tracking** - Complete setup with @sentry/nextjs SDK
  - Client, server, and edge runtime configurations created (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`)
  - Next.js instrumentation hook enabled (`instrumentation.ts`)
  - SentryProvider component integrated in root layout
  - Environment variable documentation updated with DSN format
  - Comprehensive setup guide created (`docs/Setup Docs/MONITORING_SETUP.md`)
  - **Status:** Code complete, requires Sentry project creation and DSN configuration
- ✅ **Health Check Endpoint** - Created `/api/health` route for uptime monitoring
  - Returns JSON status with timestamp: `{"status":"ok","timestamp":"...","service":"convergence-library"}`
  - Ready for UptimeRobot, Pingdom, or other monitoring services
  - **Status:** Ready to use, requires external monitoring service setup
- ✅ **Vercel Analytics** - Already configured and active
  - Page views and user behavior tracking
  - Speed Insights for Core Web Vitals monitoring

**Files Created:**
- `app/sentry.client.config.ts` - Client-side Sentry configuration
- `app/sentry.server.config.ts` - Server-side Sentry configuration
- `app/sentry.edge.config.ts` - Edge runtime Sentry configuration
- `app/instrumentation.ts` - Next.js instrumentation hook
- `app/src/components/SentryProvider.tsx` - Client-side Sentry initialization
- `app/src/app/api/health/route.ts` - Health check endpoint
- `docs/Setup Docs/MONITORING_SETUP.md` - Complete monitoring setup guide

**Files Modified:**
- `app/package.json` - Added @sentry/nextjs dependency
- `app/next.config.ts` - Enabled instrumentationHook
- `app/src/app/layout.tsx` - Added SentryProvider wrapper
- `docs/Setup Docs/ENVIRONMENT_VARIABLES.md` - Added Sentry DSN configuration

**Next Steps (User Action Required):**
1. Create Sentry account and project at [sentry.io](https://sentry.io/)
2. Copy DSN from Sentry project settings
3. Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.local` and Vercel environment variables
4. Set up uptime monitoring service (UptimeRobot recommended) pointing to `https://your-domain.com/api/health`

### Previous Session Updates (November 10, 2025) - SendGrid Setup & Footer Cleanup! 🎉

**📧 SendGrid Email Infrastructure Complete:**
- ✅ SendGrid account created and domain authenticated (convergencelibrary.com)
- ✅ DNS records configured (SPF, DKIM, DMARC, link branding)
- ✅ Supabase SMTP configured with SendGrid credentials
- ✅ Password reset flow fixed (navigation and middleware issues resolved)
- ✅ Password validation UX improved (real-time requirement checking)
- ✅ Comprehensive documentation created (SENDGRID_SETUP.md)

**🌐 DNS & Domain Configuration Complete:**
- ✅ All SendGrid DNS records configured and verified (CNAME: 57219658, em2464, s1._domainkey, s2._domainkey, url1708)
- ✅ DMARC TXT record configured
- ✅ Vercel www CNAME record configured (pointing to Vercel DNS)
- ✅ Root domain A record configured
- ✅ Domain added and verified in Vercel project (convergencelibrary.com)
- ✅ www subdomain configured in Vercel (www.convergencelibrary.com) - Production
- ✅ 307 redirect configured from root domain to www
- ✅ SSL certificates automatically provisioned by Vercel (Let's Encrypt)
- ✅ HTTPS redirect enabled

**🧹 Footer Navigation Cleanup:**
- ✅ Removed Blog, API, Communities, and social media links from footer
- ✅ Removed "Future Plan" section from footer
- ✅ Updated footer layout to 4 columns with better spacing (About, Resources, Legal split into 2 columns)
- ✅ Fixed alignment issues with flexbox and improved spacing
- ✅ All future features documented in Phase 5 & Phase 6 of master plan

**🎨 Library Page UI/UX Improvements:**
- ✅ Compact header layout - Moved search, filters, and sort to compact header bar
- ✅ Inline search bar - Compact search input with expand-on-focus behavior
- ✅ Inline filters - AdvancedFilters component integrated into header
- ✅ Inline sort dropdown - Sort controls moved to header for better space utilization
- ✅ AdvancedFilters styling - Compact button styling (text-sm, smaller icons)
- ✅ LibraryGrid height adjustments - Optimized height calculation (calc(100vh - 200px))
- ✅ Improved spacing - Reduced padding for more content space

**📝 Documentation Updates:**
- ✅ Created FILE_NAMING_CONVENTIONS.md for sprint_summaries folder
- ✅ Updated session summary naming to match conventions
- ✅ Social media integration documented in Phase 5 (Week 31-32)
- ✅ Public API and Blog platform documented in Phase 6
- ✅ **Production Deployment Guides Created:**
  - Vercel Deployment & Domain Setup (`VERCEL_DEPLOYMENT_SETUP.md`) - Complete step-by-step guide
  - Vercel Production Secrets (`VERCEL_PRODUCTION_SECRETS.md`) - Environment variable management guide
  - Google OAuth Setup (`GOOGLE_OAUTH_SETUP.md`) - Code implemented, configuration guide ready
- ✅ **Development Workflow Documentation:**
  - CI/CD pipeline setup with branch strategy (main/develop)
  - Localhost testing workflow guide
  - Cursor IDE workflow clarification
  - Git sync and deployment flow documented
- ✅ **TypeScript & Next.js 16 Compatibility:**
  - Fixed route handler async params for Next.js 16
  - Fixed TipTap setContent calls
  - Fixed HTMLViewer callback handlers
  - Fixed various type assertions and imports

**Previous Session Updates (November 3, 2025) - Universal AI Search & Chat System! 🎉**

**🚀 MAJOR UPDATE: Universal AI Search & Chat System Complete!**
- ✅ **Floating AI Search Bar** - Expandable floating search component accessible from all pages (Library, Graph, Journal, Document Viewer)
- ✅ **Smart Model Selection** - Auto-selects least-used AI model (Claude, GPT, Gemini) based on usage statistics
- ✅ **AI Chat Modal** - Full-featured chat interface supporting Claude, GPT, and Gemini with conversation history
- ✅ **Multi-Model AI API Routes** - New endpoints for Claude (`/api/ai/claude`), GPT (`/api/ai/gpt`), and Gemini (`/api/ai/gemini`)
- ✅ **AI Usage Tracking** - API route (`/api/ai/usage`) tracks monthly usage per model for intelligent load balancing
- ✅ **Chapter Management APIs** - Generate (`/api/chapters/generate-names`) and update (`/api/chapters/update-names`) chapter names
- ✅ **Document Metadata Generation** - New API route (`/api/documents/generate-metadata`) for automated metadata extraction
- ✅ **Full Curator Notes Display** - Library cards now display complete curator notes (previously truncated)
- ✅ **Enhanced Library Integration** - Floating AI search integrated across Library, Graph, Journal, and Document detail pages
- ✅ **Homepage AI Search** - AI search bar added to homepage for immediate access

**Technical Highlights:**
- Smart model selection balances load across AI providers automatically
- Usage tracking prevents API quota exhaustion by routing to least-used model
- Floating UI provides consistent AI access across all pages without navigation
- Modular architecture supports easy addition of new AI models
- Full conversation history with model-specific tracking

**Previous Session Updates (Convergence Machine MVP):**
- ✅ **The Convergence Machine - Full MVP Implementation** - 7-lens AI reasoning system with hybrid retrieval
- ✅ **Database Infrastructure** - Migrations 021 & 022: text_chunks, convergence_queries, convergence_responses, subscription_status
- ✅ **Embedding System** - Text chunking with paragraph boundaries, OpenAI embedding generation, chunk storage
- ✅ **Hybrid Retrieval** - Vector search (pgvector) + PostgreSQL FTS with RRF (Reciprocal Rank Fusion) merging
- ✅ **7-Lens Definitions** - All perspectives defined: Scientific, Psychological, Philosophical, Religious/Spiritual, Historical/Anthropological, Symbolic/Occult, Mathematical
- ✅ **Lens Orchestrator** - Multi-lens response generation, weighted synthesis, source citation
- ✅ **Streaming Handler** - Server-Sent Events (SSE) for real-time responses
- ✅ **Rate Limiting** - 5 free queries/month, unlimited premium, monthly reset
- ✅ **Premium Gate** - Subscription status checking, admin auto-premium, upgrade prompts
- ✅ **Complete UI** - Main page (/convergence-machine) with query input, 7 lens sliders, 4 presets, streaming display, rate limit indicator
- ✅ **API Endpoints** - Query (SSE), history (list + individual), rate-limit status, embedding generation (admin)
- ✅ **18 New Files** - Complete backend services + UI components

**Previous Session Updates (Document Management & HTML Support):**
- ✅ **HTML File Upload Support** - Added ability to upload and process HTML files (sacred-texts.com format) with comprehensive styling
- ✅ **HTML Viewer Component** - New `HTMLViewer.tsx` with fullscreen, zoom controls (25%-300%), text selection, and Dark Academia styling
- ✅ **Chapter Viewer Enhancements** - Added fullscreen mode, zoom controls, and text highlighting with annotation support
- ✅ **Cover Image Management** - Implemented cover image cropping/positioning with `CoverCropModal.tsx` component (2:3 aspect ratio)
- ✅ **Cover Scraping Button** - Added "Scrape Cover" functionality in admin edit page for automatic cover image generation
- ✅ **Cover Position Controls** - Admin can now adjust cover image positioning (center, top, bottom, left, right)

**Admin Experience Improvements:**
- ✅ **Reliable Admin Access Check** - Implemented server-side API route for admin status verification to prevent UI inconsistencies
- ✅ **Admin Access Rules Documentation** - Added cursor rules and references to prevent future admin access issues
- ✅ **Enhanced Admin Edit Page** - Improved cover image management workflow with crop/position controls

**Technical Improvements:**
- ✅ **Improved HTML Rendering** - Enhanced sacred-texts HTML styling with comprehensive CSS for tables, blockquotes, code blocks
- ✅ **Text Selection & Annotation Integration** - ChapterViewer now supports text selection for annotation creation
- ✅ **Component Architecture** - Created reusable `CoverCropModal` and `HTMLViewer` components following Dark Academia design system

### Previous Updates (October 30, 2025)

- Centralized all admin navigation in `Header.tsx` using a single `adminLinks` source; removed duplicate admin links elsewhere.
- Documented and enforced the single-source-of-truth rule in `README.md`.
- Added `QUICK_START.md` with server commands and a quick reference guide.
- Maintained zero-lint policy and ensured Dark Academia UX consistency.

### What's Next

**Immediate (This Week):**
- Seed initial library texts (20-50 public domain documents)
- Production deployment preparation
- Email infrastructure setup (SendGrid SMTP)
- Performance optimization and testing

**Near-term (2-3 weeks):**
- Complete Phase 1 MVP (library seeding)
- Deploy to production (Vercel)
- Beta testing with initial users
- Complete remaining Phase 2 features (clip system, wikilinks, export enhancements)

---

## I. TECHNICAL ARCHITECTURE

### Tech Stack Overview

| Layer | Technology | Purpose | Free Tier | Status |
|-------|-----------|---------|-----------|--------|
| **Frontend** | Next.js 14 + TailwindCSS | React SSR/ISR framework | ✅ Vercel | ✅ Active |
| **Database** | Supabase PostgreSQL | Primary data store + Auth | ✅ 500MB | ✅ Active |
| **File Storage** | Cloudflare R2 | Document storage (S3-compatible) | ✅ 10GB | ✅ Active |
| **Vector Search** | pgvector | Semantic similarity | ✅ Included | ✅ Active |
| **Graph DB** | Amazon Neptune | Correspondence graph | ✅ 750hrs | ⏳ Phase 3 |
| **OCR** | Azure Computer Vision | Document processing | ✅ 5K/mo free | ✅ Active |
| **Serverless** | Cloudflare Workers | Event processing | ✅ 100K/day | ✅ Active |
| **Editor** | Tiptap | Rich text editing | ✅ Open source | ✅ Active |
| **Graph Viz** | D3.js | Force-directed layouts | ✅ Open source | ⏳ Phase 3 |
| **AI** | Claude API / GPT-4 | Metadata extraction & Multi-lens | 💰 Pay-per-use | 🔄 Partial (Metadata ✅) |

**🔄 Infrastructure Migration Note (Oct 26, 2025):**
- **AWS → Cloudflare R2:** ✅ Migrated due to AWS support paywall ($29-100/month minimum)
- **Benefits:** No egress fees, better bootstrap economics, free community support
- **S3 Compatibility:** Minimal code changes required
- **OCR Strategy:** ✅ Implemented with Azure Computer Vision (5K pages/month free)
- **Metadata Extraction:** ✅ Automated with OpenAI GPT-4o (switched from Claude for stability)

**📊 Development Velocity (Latest Session):**
- **Sprint 1:** Infrastructure & Setup - ✅ Complete (1h 53m, 20x velocity)
- **Sprint 2:** Auth & Core UI - ✅ Complete (2.5h, 32x velocity)
- **Sprint 3:** Document Processing - ✅ Complete (4h, full pipeline working)
- **Sprint 4:** Library & Search - ✅ Complete (6h, 10x velocity)
- **Sprint 5:** Advanced Features - ✅ Complete (4h, 10x velocity)
- **Convergence Machine MVP** - ✅ Complete (~14.5h, 23x velocity)
- **Total:** ~35 hours of development = ~800 hours traditional time saved

### Database Schema (Implemented in supabase-schema.sql)

**Core Tables:**
- `users` - Authentication & roles
- `texts` - Main library documents with embeddings
- `correspondences` - Traditional esoteric symbolic entities (planets, elements, deities, etc.)
- `correspondence_relationships` - Graph edges for traditional correspondences
- `convergence_concepts` - Cross-tradition concepts showing unity (NEW)
- `convergence_relationships` - Relationships between concepts across traditions (NEW)
- `text_correspondences` - Document-symbol links
- `journal_entries` - Personal study journals (formerly grimoires, JSONB blocks)
- `user_bookmarks` - Saved passages
- `user_annotations` - User notes on texts
- `agent_logs` - Automated workflow tracking

**Key Features:**
- Row-Level Security (RLS) for privacy
- Full-text search with PostgreSQL
- Vector embeddings (1536 dimensions)
- 20 document type classifications
- Metadata validation via CHECK constraints

### Document Classification Taxonomy

```
Allowed Types (20):
- book_esoteric, book_spiritual, book_psychology, book_science
- article_scholarly, anthropology, reference_table, historical
- mythology, medical_overview, commentary, webpage, dictionary
- astrology, ritual_guide, diagram, transcript, summary
- speculative, misc
```

### Metadata Standards

All documents must include:
```yaml
title: Full title
type: One of 20 allowed types
author: Author(s) or organization
year: Publication year
publisher: If known
mime_type: File format (PDF, DOCX, etc.)
license: public-domain | cc-by | all-rights-reserved
domain: Knowledge domain (astrology, psychology, etc.)
confidence: established | interpretive | speculative | tradition
source_url: If web source
tags: Comma-separated keywords
associated_names: Related figures
```

---

## II. DEVELOPMENT ROADMAP

### Phase 1: MVP Foundation (Weeks 1-8) - 95% COMPLETE ✅

**Goal:** Launch functional public library with basic search

**Status:** MVP scope complete + bonus features delivered ahead of schedule!

#### Week 1-2: Infrastructure Setup - ✅ COMPLETE
- [x] ~~AWS account configuration~~ → Migrated to Cloudflare R2
- [x] Supabase project initialization
- [x] Run `supabase-schema.sql` to create database
- [x] Next.js 14 project scaffold with TypeScript
- [x] Environment configuration (.env setup)
- [x] GitHub repository with version control
- [x] Cloudflare R2 bucket setup (`convergence-library`)
- [x] Azure Computer Vision API setup

#### Week 3-4: Document Ingestion Pipeline - ✅ COMPLETE
- [x] Cloudflare R2 upload API with presigned URLs
- [x] Direct browser-to-R2 upload (no server transfer)
- [x] Azure Computer Vision OCR integration (full pipeline)
- [x] OpenAI GPT-4o metadata extraction (switched from Claude)
- [x] Document classification (20 types)
- [x] Automated standardized ID generation
- [x] Admin upload page with drag-and-drop
- [x] Multi-file upload queue with progress tracking
- [x] Complete document processing pipeline (upload → OCR → metadata → database)
- [x] RLS policies for texts table
- [x] Error handling with R2 cleanup
- [ ] Vector embedding generation (deferred to Phase 2)

#### Week 5-6: Public Library Frontend - ✅ COMPLETE (100%)
- [x] Beautiful mystical homepage with Dark Academia theme
- [x] Library page with document grid layout
- [x] Basic search (title/author filtering)
- [x] Document type filtering dropdown
- [x] Metadata display cards (author, year, type, status)
- [x] Responsive design (mobile-first)
- [x] Full-text search (PostgreSQL FTS)
- [x] Document viewer component (PDF display)
- [x] Advanced filtering (domain, year range, tags, lenses)
- [x] Pagination for large result sets

#### Additional Features Completed (October 2025)
- [x] **7 Convergence Lenses System** - Complete classification and filtering system (migration 007)
- [x] Lens-based filtering in library with multi-select interface
- [x] AI metadata extraction assigns 2-4 lenses per document
- [x] **Reading Progress Tracking** - Per-user, per-document progress with sidebar panel
- [x] **User Collections** - Create, manage, and organize documents into personal collections
- [x] **Annotations & Highlights** - Notes tab with quote saving and personal notes
- [x] **Bookmark Functionality** - Quick bookmarking from library and document viewer
- [x] **My Library Page** - Personalized view of user's bookmarked/collected documents
- [x] **Admin Usage Tracking** - Complete analytics dashboard with cost monitoring

#### Week 7-8: Authentication & User System - ✅ COMPLETE
- [x] Supabase Auth (SSR) integration
- [x] User registration page with validation
- [x] Login page with error handling
- [x] Password reset flow (forgot password + reset pages)
- [x] Email verification setup
- [x] Role-based access control (admin detection)
- [x] Protected route middleware
- [x] Session management and persistence
- [x] User profile page (editable username, display name, bio)
- [x] Avatar system with crop/zoom modal
- [x] Avatar upload to Supabase Storage
- [x] Image compression and optimization
- [x] User dashboard with stats and quick actions
- [x] Admin dashboard access control
- [x] Core layout (Header with navigation and user menu)
- [x] Footer with links
- [x] Toast notifications (Sonner integration)

**Phase 1 Deliverables - Status:**
- [x] ✅ Complete authentication system (login, register, password reset)
- [x] ✅ Admin upload capability with drag-and-drop interface
- [x] ✅ Automated OCR pipeline (Azure Computer Vision)
- [x] ✅ AI metadata extraction (OpenAI GPT-4o)
- [x] ✅ Document classification system (20 types)
- [x] ✅ User profiles with avatar management
- [x] ✅ Library browsing with basic search
- [x] ✅ Full-text search (PostgreSQL FTS)
- [x] ✅ **Concept Search (Deep Search)** - Semantic vector search across all books with related terms (Dec 2024)
- [x] ✅ Document viewer (PDF display with @react-pdf-viewer)
- [x] ✅ Advanced filtering (domain, year, tags, 7 lenses)
- [x] ✅ Pagination for document listings
- [x] ✅ **BONUS: 7 Convergence Lenses system**
- [x] ✅ **BONUS: User library features (progress, collections, annotations, bookmarks)**
- [x] ✅ **BONUS: Admin usage tracking and analytics**
- [x] ✅ **BONUS: Study Journal MVP** (Tiptap editor, CRUD, auto-save)
- [x] ✅ **BONUS: PostgreSQL Full-Text Search** (annotation search with tsvector + GIN index)
- [x] ✅ **BONUS: Annotation Export** (Markdown & CSV with filtering)
- [ ] ⏳ 20+ seeded texts in library - In Progress

---

### Phase 2: Personal Grimoire (Weeks 9-14)

**Goal:** Implement private note-taking workspace

#### Week 9-10: Tiptap Editor Integration
- [x] Install Tiptap with essential extensions
- [x] Block-based editor component
- [ ] Slash `/` command menu
- [ ] Drag handle (`⋮⋮`) for reordering
- [x] Basic blocks: text, heading, list, quote
- [ ] Image upload to S3
- [x] Auto-save with debouncing

#### Week 11-12: Note Management
- [x] Create/read/update/delete grimoire pages
- [x] Nested page hierarchy (parent_id)
- [x] Sidebar navigation
- [x] Page icons and cover images
- [x] Internal wikilinks `[[Page Name]]` ✅ **Sprint 6**
- [x] Backlinks panel ✅ **Sprint 6**
- [x] WikiLink click activation ✅ **Sprint 6**
- [x] WikiLink navigation + auto-create ✅ **Sprint 6**
- [x] WikiLink preview modal ✅ **Sprint 6**
- [x] WikiLink AI actions menu ✅ **Sprint 6**
- [x] WikiLink telemetry & history ✅ **Sprint 6**

#### Week 13-14: Clip & Export System
- [ ] "Clip to Grimoire" button on library texts
- [ ] Passage selection and saving
- [ ] Export to Markdown
- [ ] Export to HTML (styled)
- [ ] Export to PDF (jsPDF)
- [ ] Export to Notion format

**Deliverables:**
- Fully functional Notion-like editor
- Private user workspace
- Clipping from public library
- Multi-format export

---

### Phase 3A: Correspondence Tables (Weeks 15-18)

**Goal:** Traditional esoteric symbolic relationships knowledge graph

#### Week 15-16: Neptune Graph Database
- [ ] Amazon Neptune cluster setup
- [ ] Gremlin API configuration
- [ ] Graph schema design (vertices + edges)
- [ ] Sample data ingestion (planets, elements, deities)
- [ ] PostgreSQL ↔ Neptune sync mechanism

#### Week 17-18: Graph Visualization
- [ ] D3.js force-directed graph component
- [ ] Node rendering with colors by type
- [ ] Edge rendering with strength weights
- [ ] Hover states (highlight connections)
- [ ] Click to open entity details
- [ ] Pan and zoom controls

#### Week 17-18: CRUD Interface
- [ ] Table view of correspondences
- [ ] Add/edit entity modal
- [ ] Create relationship form
- [ ] Filter and search nodes
- [ ] "Lens" presets (Astrological, Elemental, Qabalistic)
- [ ] Export graph as JSON

**Deliverables:**
- Working traditional correspondence graph with 50+ entities
- Visual and tabular interfaces
- User-contributed correspondences
- Pre-configured thematic "lenses"

---

### Phase 3B: The Convergence Graph (Weeks 19-20)

**Goal:** Cross-tradition conceptual unity visualization

**Status:** UI Complete (100%) - Ready for data seeding

#### Week 19-20: Convergence Concepts System
- [x] Create `convergence_concepts` table ✅ **Migration 019**
- [x] Create `convergence_relationships` table ✅ **Migration 019**
- [x] Build comparative table view ✅ **ComparativeTable.tsx component**
- [x] Create convergence network graph visualization ✅ **ConvergenceGraph.tsx with D3.js**
- [x] Implement similarity strength indicators ✅ **Visual bars + percentage display**
- [x] Add source citation for each connection ✅ **Citation field in relationships**
- [x] Search across traditions interface ✅ **SimilarityControls + TraditionLegend**
- [x] Concept detail modal ✅ **ConceptDetailModal.tsx**
- [ ] Seed cross-tradition concepts:
  - Buddhist Emptiness ↔ Quantum Zero-point ↔ Christian Void ↔ Taoist Wu
  - Divine Unity across traditions
  - Consciousness concepts
  - Enlightenment/Awakening parallels

**Deliverables:**
- ✅ Convergence concepts database schema (30+ concepts capacity)
- ✅ Cross-tradition relationship mapping system
- ✅ Dual interface: comparative table + convergence network
- ✅ Full UI implementation ready for data
- ⬜ Data seeding (30+ concepts, 40+ relationships) - **Next step**

---

### Phase 3C: Multi-Source Knowledge Claims System (Latest Session)

**Goal:** Support multiple sources for entity attributes with consensus vs source-specific views

**Status:** ✅ Complete (100%) - Ready for bulk data import

#### Multi-Source Architecture
- [x] Create `knowledge_sources` table ✅ **Migration 032**
- [x] Create `knowledge_claims` table ✅ **Migration 032**
- [x] Support field-specific claims per entity ✅ **Claims linked to entity_id + field_key**
- [x] Source metadata (title, author, year, citation, URL) ✅ **Full source tracking**

#### Admin UI Features
- [x] Admin form for adding sources ✅ **Inline source creation in EntityModal**
- [x] Multi-claim management per entity ✅ **Add/edit/delete claims by field**
- [x] Field-specific claim dropdowns ✅ **Dynamic field options by entity type**
- [x] Consensus vs Sources view toggle ✅ **EntityDetailModal with tabbed interface**
- [x] Source grouping in detail view ✅ **Claims grouped by source**

#### CSV Auto-Import System
- [x] Schema detection (plants, angels, orishas, gods, crystals, chakras) ✅ **Auto-detection from headers**
- [x] Field mapping configuration ✅ **Type-specific field mappings**
- [x] BOM and header normalization ✅ **Handles UTF-8 BOM and whitespace**
- [x] Batch entity + claim creation ✅ **Single source per CSV, multiple claims per entity**
- [x] Type auto-creation ✅ **Creates entity types if missing**

#### Dynamic Type Management
- [x] Admin-manageable entity types ✅ **Migration 031 - correspondence_entity_types**
- [x] Admin-manageable relationship types ✅ **Migration 031 - correspondence_relationship_types**
- [x] Admin-manageable traditions ✅ **Migration 031 - convergence_traditions**
- [x] Type metadata (color, icon, sort_order) ✅ **Full type customization**
- [x] Backfill existing data ✅ **Migrates text columns to FK references**

#### AI Integration
- [x] AI rewrite/generate buttons ✅ **Sparkles icon buttons in EntityModal**
- [x] Field-specific AI prompts ✅ **Context-aware generation per field**
- [x] Usage tracking ✅ **logMetadataExtractionUsage integration**

**Deliverables:**
- ✅ Multi-source claims database schema
- ✅ Complete admin UI for source/claim management
- ✅ CSV import script with 6 schema types supported
- ✅ Successfully imported 10+ crystals with full field mapping
- ✅ Dynamic type system with admin UI
- ✅ AI-powered text generation/rewriting

**Next Steps:**
- Import remaining CSVs (plants, chakras, angels, orishas, gods)
- Add more field mappings as needed
- Enhance consensus algorithm (weighted by source credibility)

---

### Phase 3 — Detailed Plan (Objectives, Architecture, Milestones)

**Objectives (Phase 3 overall):**
- Ship a performant, editable knowledge graph for traditional correspondences (Phase 3A) and a conceptual cross-tradition graph (Phase 3B).
- Maintain bootstrap budget: prefer PostgreSQL fallback during development; enable Neptune behind a feature flag.
- Deliver user-facing value: interactive graph + CRUD + searchable comparative tables.

**Success Metrics:**
- Performance: initial graph render <800ms for 200 nodes/400 edges; interactions <50ms.
- Reliability: >99% success for CRUD operations with RLS preserved.
- Content: ≥50 correspondence entities and ≥30 convergence concepts seeded with citations.
- UX: Task completion (find node, see connections, open details) <10s for new users.

#### 3A. Graph Data Model (Neptune + PostgreSQL Fallback)

- Vertex types: `entity` (category enum: planet, element, deity, tarot, sephirah, path, metal, herb, color, etc.)
- Edge types: `corresponds_to`, `associated_with`, `governs`, `opposes` with properties: `weight` (0-1), `source`, `confidence` enum, `notes`.
- Identifiers: slugified stable IDs, human names, aliases.
- PostgreSQL fallback tables:
  - `correspondences(id, name, category, aliases text[], description, created_by, created_at)`
  - `correspondence_relationships(id, source_id, target_id, type, weight, source_citation, confidence, notes, created_at)`
  - Indexes: btree on `(category)`, `(type)`, gin on `aliases`, composite `(source_id, target_id, type)` unique.
- Sync plan: one-way export job PG → JSONL; importer for Neptune; feature flag `NEPTUNE_ENABLED`.

#### 3B. Convergence Concepts Model

- Tables (as listed): `convergence_concepts`, `convergence_relationships` with `similarity` (0-1), `tradition`, `era`, `source_citation`.
- Required fields per concept: `name`, `tradition`, `short_definition`, `primary_sources[]`, `tags[]`.

#### API & CRUD Interfaces

- REST endpoints (Next.js route handlers):
  - `GET /api/graph/entities`, `POST /api/graph/entities`, `PATCH /api/graph/entities/:id`, `DELETE /api/graph/entities/:id`
  - `GET /api/graph/edges`, `POST /api/graph/edges`, `PATCH /api/graph/edges/:id`, `DELETE /api/graph/edges/:id`
  - `GET /api/concepts`, `POST /api/concepts`, `PATCH /api/concepts/:id`, `DELETE /api/concepts/:id`
  - `GET /api/concepts/relationships`
- Filters: category, tag, lens, confidence, weight range.
- RLS: admin-create/edit; user-suggested items stored as `pending` for moderation.

#### Visualization (D3.js)

- Force-directed layout with collision, zoom/pan, and smart label avoidance.
- Node styling by category; edge thickness by weight; hover highlights neighbors; click opens right-panel.
- Lens presets: Astrological, Elemental, Qabalistic toggle filters and color scales.
- Accessibility: keyboard focus cycle across nodes; tooltip content readable by screen readers.

#### Data Seeding & Sources

- Seed sets: planets (7 classical), signs/elements, tarot majors, sephiroth/paths, metals, colors, herbs.
- Sources captured in `source_citation` (e.g., Golden Dawn, Agrippa, Crowley; academic references where available).
- Convergence seed examples: Emptiness/Śūnyatā, Taoist Wu, Christian Negative Theology; Unity/Oneness variants; Consciousness mappings.

#### Performance & Quality Targets

- Back-end: queries under 100ms P95 for 1k nodes; indexes required as above.
- Front-end: virtualization for detail tables; WebGL fallback considered if node count >1k (defer).
- Tests: unit tests for API validation, integration tests for CRUD + RLS, visual regression for graph node coloring.

#### Risks & Mitigations

- Neptune cost/complexity: start on PostgreSQL; enable Neptune when usage justifies; provide export/import scripts.
- Data validity: moderation workflow and citation-required rule for new edges.
- Hairball risk: default filters + lens presets + degree limit on initial render.

#### Milestones & Acceptance Criteria

- Week 15: PG schema finalized; API scaffolding live; seed 30 entities, 60 edges. AC: CRUD works locally with RLS.
- Week 16: D3 graph MVP interactive; table CRUD UI; export JSON. AC: render <800ms, hover/click behaviors complete.
- Week 17: Moderation + filters + presets; seed reaches 50/120. AC: role-gated actions; preset filters functional.
- Week 18: Neptune experimental behind flag; sync job PG→Neptune. AC: parity render from Neptune sample.
- Week 19: Convergence tables/migrations + API + seed 15 concepts, 20 links. AC: comparative view lists concepts with citations.
- Week 20: Convergence graph vis + search; total 30 concepts, 40 links. AC: similarity weights rendered; search across traditions.

#### Dependencies & Cost Notes

- Optional Neptune (free tier/credits). Keep disabled in production until Phase 3 metrics hit.
- No change to Supabase tier initially; monitor DB size and index bloat.

---

#### PostgreSQL DDL (Proposed)

```sql
-- Entities
create table if not exists correspondences (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in (
    'planet','element','deity','tarot','sephirah','path','metal','herb','color','sign','house','angel','demon','stone','note','other'
  )),
  aliases text[] default '{}',
  description text,
  lenses text[] default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_correspondences_category on correspondences(category);
create index if not exists idx_correspondences_aliases on correspondences using gin (aliases);
create unique index if not exists idx_correspondences_slug on correspondences(slug);

-- Relationships
create table if not exists correspondence_relationships (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references correspondences(id) on delete cascade,
  target_id uuid not null references correspondences(id) on delete cascade,
  type text not null check (type in (
    'corresponds_to','associated_with','governs','opposes','harmonizes_with','derives_from'
  )),
  weight numeric not null default 0.5 check (weight >= 0 and weight <= 1),
  confidence text not null default 'tradition' check (confidence in ('established','interpretive','speculative','tradition')),
  source_citation text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create unique index if not exists idx_corr_unique_edge on correspondence_relationships(source_id, target_id, type);
create index if not exists idx_corr_type on correspondence_relationships(type);
create index if not exists idx_corr_weight on correspondence_relationships(weight);

-- Convergence Concepts
create table if not exists convergence_concepts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tradition text not null,
  era text,
  short_definition text,
  primary_sources text[] default '{}',
  tags text[] default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_concepts_tradition on convergence_concepts(tradition);
create index if not exists idx_concepts_tags on convergence_concepts using gin(tags);

create table if not exists convergence_relationships (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references convergence_concepts(id) on delete cascade,
  target_id uuid not null references convergence_concepts(id) on delete cascade,
  similarity numeric not null default 0.5 check (similarity >= 0 and similarity <= 1),
  source_citation text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create unique index if not exists idx_conv_unique_edge on convergence_relationships(source_id, target_id);
```

RLS policies (sketch):
- Select for all authenticated users; insert/update/delete only for admins.
- Separate `pending_*` tables optional for user suggestions.

#### Neptune Schema (Gremlin outline)

- Vertex label: `entity` with properties: `slug`, `name`, `category`, `aliases` (list), `lenses` (list).
- Edge labels: `CORRESPONDS_TO`, `ASSOCIATED_WITH`, `GOVERNS`, `OPPOSES`, `HARMONIZES_WITH`, `DERIVES_FROM` with properties: `weight`, `confidence`, `source`, `notes`.
- Convergence graph: vertex label `concept` with `tradition`, `era`, `tags`; edge label `SIMILAR_TO` with `similarity`, `source`.
- Import format: JSONL records for vertices then edges with foreign key by `slug`.
- Feature flag: `NEPTUNE_ENABLED` to switch data source in server routes.

#### API Contracts (Selected)

```
GET /api/graph/entities?category=&q=&lens=&limit=&cursor=
  200 { items: Entity[], nextCursor?: string }
POST /api/graph/entities
  body { name, slug?, category, aliases?, description?, lenses? }
  201 { entity }
PATCH /api/graph/entities/:id
DELETE /api/graph/entities/:id

GET /api/graph/edges?type=&minWeight=&sourceId=&targetId=&limit=&cursor=
POST /api/graph/edges { sourceId, targetId, type, weight?, confidence?, source_citation?, notes? }

GET /api/concepts?q=&tradition=&tag=&limit=&cursor=
POST /api/concepts { name, tradition, era?, short_definition?, primary_sources?, tags? }
GET /api/concepts/relationships?sourceId=&minSimilarity=
POST /api/concepts/relationships { sourceId, targetId, similarity, source_citation?, notes? }
```

Validation: Zod schemas; auth: Supabase session; rate limits on write endpoints.

#### UI Work Breakdown

- Graph Canvas (`GraphView`): D3 force sim, zoom/pan, node/edge renderers, presets.
- Details Panel (`EntityDetails`/`ConceptDetails`): metadata, citations, related items.
- CRUD Modals: create/edit entity, create/edit relationship with validation.
- Tables: entities, relationships, concepts with filters and pagination.
- Presets Toolbar: lens toggles, category filters, weight/similarity sliders.

#### Seeding Checklist (Initial)

- Planets (7), Zodiac signs (12), Elements (4/5), Metals (7), Colors (7), Sephiroth (10), Paths (22), Tarot Majors (22).
- At least 2 citations per relationship where available (primary and secondary).
- Convergence: Emptiness/Wu/Void cluster; Unity/Oneness cluster; Consciousness cluster (mind, awareness, spirit).

#### Quality & Testing Plan

- Backend: unit tests for validation; integration tests for CRUD, RLS, pagination, filters.
- Frontend: component tests; interaction tests for hover/click/keyboard; visual regression for color scales.
- Performance: scripts to load 1k nodes/2k edges and measure render/interaction; DB explain analyze on heavy queries.
- Monitoring: server logs for slow queries; client perf markers around layout/paint.

#### Neptune Migration Plan

- Step 1: Maintain PG as source of truth; scheduled export to JSONL.
- Step 2: One-click importer to Neptune test cluster; verify counts and sampled paths.
- Step 3: Behind flag routing for read-only queries; writes remain in PG.
- Step 4: If stable and economically justified, consider dual-write or primary swap.

---

### Phase 4: The Convergence Machine (Weeks 21-28) - ✅ MVP COMPLETE (95%)

**Goal:** Premium 7-lens AI reasoning system with adjustable perspective weighting

**Status:** MVP fully implemented and ready for testing! All core features complete.

#### Week 21-22: AI Infrastructure - ✅ COMPLETE (100%)
- [x] OpenAI GPT-4o API integration (for metadata extraction)
- [x] Attempted Claude API (switched to GPT-4o for stability)
- [x] Prompt engineering for metadata classification
- [x] JSON mode for structured metadata extraction
- [x] Document type classification (20 types)
- [x] Standardized ID generation
- [x] Confidence scoring system
- [x] Response streaming setup (for multi-lens system) ✅ **MVP**
- [ ] AI response caching (hash-based) - Deferred to optimization phase

#### Week 23-24: Retrieval System - ✅ COMPLETE (90%)
- [x] Semantic search with pgvector ✅ **Hybrid approach implemented**
- [x] Hybrid retrieval system (vector + FTS) ✅ **RRF merging algorithm**
- [x] Text chunking with overlap ✅ **Smart paragraph boundaries**
- [x] Embedding generation service ✅ **OpenAI text-embedding-3-small**
- [x] Citation extraction ✅ **Source links in responses**
- [ ] Graph-based retrieval from Neptune - Deferred (Neptune not yet set up)

#### Week 25-26: Lens Orchestration (The Convergence Machine) - ✅ COMPLETE (100%)
- [x] Seven lens system prompts ✅ **All 7 lenses defined**
  - Scientific (physics, cosmology, biology) ✅
  - Psychological (Jungian, cognitive science, archetypes) ✅
  - Philosophical (metaphysics, ethics, epistemology) ✅
  - Religious/Spiritual (comparative theology, mysticism, sacred texts) ✅
  - Historical/Anthropological (cultural evolution, mythology) ✅
  - Symbolic/Occult (correspondences, alchemy, astrology) ✅
  - **Mathematical** (sacred geometry, numerology, patterns, ratios) ✅
- [x] Per-lens retrieval strategies ✅ **Hybrid retrieval per lens**
- [x] Lens weighting algorithm ✅ **Adjustable emphasis (0-100%)**
- [x] Answer composition and merging ✅ **Multi-lens synthesis**
- [x] Source citation formatting ✅ **Links to library texts**

#### Week 27-28: Premium Features UI - ✅ COMPLETE (100%)
- [x] AI query interface ✅ **Full UI at /convergence-machine**
- [x] **Lens weight sliders (7 sliders, 0-100% each)** ✅ **Individual sliders with percentage display**
- [x] Lens on/off toggles ✅ **Built into sliders**
- [x] Default lens preset (equal weights) ✅ **Equal preset at 14% each**
- [x] Lens presets system ✅ **4 presets: Equal, Scholar, Practitioner, Seeker**
- [x] Streaming response display ✅ **SSE streaming with progress updates**
- [x] Source links to library ✅ **Clickable citations**
- [x] Conversation history ✅ **Full history API + storage**
- [x] Rate limiting (free vs. premium) ✅ **5 free/month, unlimited premium**
- [x] Premium gate system ✅ **Subscription check + upgrade prompts**

**Deliverables:**
- ✅ Working AI answer system (The Convergence Machine)
- ✅ Seven-lens perspective synthesis with adjustable weighting
- ✅ Lens weight sliders and preset system
- ✅ Premium subscription paywall
- ✅ Query history and conversation storage

**Files Created (18 new files):**
- `migrations/021_add_convergence_machine_schema.sql` - Database schema
- `migrations/022_add_subscription_status.sql` - Premium tier support
- `app/src/lib/convergence/chunking.ts` - Text chunking logic
- `app/src/lib/convergence/embeddings.ts` - Embedding generation
- `app/src/lib/convergence/vector-search.ts` - Vector similarity search
- `app/src/lib/convergence/fts-search.ts` - Full-text search
- `app/src/lib/convergence/hybrid-retrieval.ts` - RRF merging
- `app/src/lib/convergence/lenses.ts` - 7 lens definitions
- `app/src/lib/convergence/lens-orchestrator.ts` - Multi-lens response generation
- `app/src/lib/convergence/streaming.ts` - SSE streaming handler
- `app/src/lib/convergence/rate-limit.ts` - Rate limiting logic
- `app/src/app/api/convergence/query/route.ts` - Main query endpoint
- `app/src/app/api/convergence/history/route.ts` - Conversation history list
- `app/src/app/api/convergence/history/[id]/route.ts` - Individual conversation
- `app/src/app/api/convergence/rate-limit/route.ts` - Rate limit status
- `app/src/app/api/convergence/generate-embeddings/route.ts` - Embedding generation (admin)
- `app/src/app/convergence-machine/page.tsx` - Main UI page
- `app/src/components/convergence/LensSlider.tsx` - Individual slider component
- `app/src/components/convergence/LensPresets.tsx` - Preset buttons
- `app/src/components/convergence/ResponseStream.tsx` - Response display
- `app/src/components/convergence/RateLimitDisplay.tsx` - Rate limit UI
- `app/src/components/convergence/PremiumGate.tsx` - Premium access control

**Next Steps:**
- Generate embeddings for existing library texts
- Test end-to-end query flow
- Add navigation link in Header
- Optional: Implement AI response caching for optimization

---

### Phase 4B: Convergence Machine Post-MVP Enhancements (Weeks 29-32) - ⏳ POST-MVP

**Goal:** Enhance answer quality, transparency, and rigor for physics-spirituality boundary questions

**Status:** Post-MVP - Planned for after launch

#### Week 29-30: Enhanced Answer Quality & Epistemic Labeling

**Epistemic Inline Labeling System:**
- [ ] Add inline tags to Convergence Machine responses: `*(Established physics)*`, `*(Contested interpretation)*`, `*(Speculative analogy)*`, `*(Metaphor)*`, `*(Devotional view)*`
- [ ] Modify `lens-orchestrator.ts` to include labeling logic in response generation
- [ ] Update system prompts to instruct AI to tag claims appropriately
- [ ] Add styling for epistemic labels in `ResponseStream.tsx`

**Structured Answer Framing:**
- [ ] Implement answer structure: "What we know (established) / What's debated / Where analogies are tempting but speculative"
- [ ] Update synthesis prompt in `mergeLensResponses()` to use structured framing
- [ ] Add UI component to display structured sections in response view

**Discovery Ethos System Preface:**
- [ ] Add overarching system preface to all Convergence Machine queries
- [ ] Principles: curiosity, humility, pluralism, rigor
- [ ] Instructions: cite primary sources, separate established from interpretation, present multiple traditions, avoid medical diagnoses
- [ ] File: `app/src/lib/convergence/lens-orchestrator.ts` (add to system prompt)

**Enhanced UI Controls:**
- [ ] Add "Comparative" vs "Single-tradition" toggle
- [ ] Add "Breadth ↔ Depth" slider (adjusts retrieval k and chunk size)
- [ ] Add checkboxes: "Include physics", "Include psychology", "Only primary sources"
- [ ] Add "Show speculative analogies" switch (default off)
- [ ] Add "Where do scholars disagree?" button (triggers disagreement-focused query)
- [ ] Files: `app/src/app/convergence-machine/page.tsx`, new component `DiscoveryControls.tsx`

#### Week 31-32: Enhanced Metadata Schema for Physics

**Database Schema Expansion:**
- [ ] Migration: Add columns to `texts` table:
  - `discipline` TEXT (physics, philosophy, psychology, religion)
  - `subfield` TEXT (QM, QFT, cosmology, clinical psych, depth psych, theology)
  - `evidence_type` TEXT (theory, experiment, commentary, popular)
  - `math_level` TEXT (none, light, rigorous)
- [ ] Update `confidence` field to match original spec (already exists but verify values)
- [ ] File: `migrations/XXX_add_physics_metadata.sql`

**Metadata Extraction Updates:**
- [ ] Update `claude-metadata.ts` to extract new fields
- [ ] Update `DocumentMetadata` interface
- [ ] Update AI prompt to classify physics documents with new fields
- [ ] File: `app/src/lib/claude-metadata.ts`

**Library Filtering:**
- [ ] Add filters for new metadata fields in library page
- [ ] Update `AdvancedFilters.tsx` component
- [ ] Add facet filters for `discipline`, `evidence_type`, `math_level`

**Deliverables:**
- Epistemic labeling system reduces confusion at physics-spirituality boundary
- Structured answer framing improves user satisfaction
- Enhanced UI controls provide better query customization
- Physics metadata schema supports structured corpus organization

---

### Phase 5: Community & Tokenomics (Weeks 29-36)

**Goal:** Launch contribution reward system

#### Week 29-30: Off-Chain Points System
- [ ] Contribution points schema
- [ ] Point allocation rules:
  - Document upload: +100 points
  - Metadata curation: +10 points
  - Relationship creation: +20 points
  - Annotation/note: +5 points
- [ ] User leaderboard
- [ ] Badge system (Scribe, Archivist, Sage)
- [ ] Rank progression (Neophyte → Adept → Magus)

#### Week 31-32: Community Features
- [ ] Discussion forums (by topic/guild)
- [ ] User profiles with contributions
- [ ] Comment system on texts
- [ ] "Upload Events" scheduling
- [ ] Moderation tools
- [ ] Social media integration (GitHub, Twitter/X, Discord)
  - [ ] Footer social links implementation
  - [ ] GitHub repository integration
  - [ ] Twitter/X account setup and feed
  - [ ] **Discord server setup** (see `docs/Setup Docs/DISCORD_SERVER_SETUP.md`)
    - [ ] Create Discord server with channel structure
    - [ ] Set up Sentry → Discord webhook integration
    - [ ] Configure roles and permissions
    - [ ] Create permanent invite link
    - [ ] Add "Join Discord" button to application
    - [ ] (Optional) Set up Discord bot for automation
  - [ ] Social sharing buttons for library texts

#### Week 33-34: Smart Contract Development
- [ ] Choose Layer 2 blockchain (Polygon/Solana)
- [ ] ERC-20 token contract (Create Coin)
- [ ] Staking mechanism
- [ ] Governance voting contract
- [ ] Security audit

#### Week 35-36: Token Launch Preparation
- [ ] Legal compliance review
- [ ] Token Legal Opinion
- [ ] Terms of Service updates
- [ ] Testnet deployment
- [ ] Community education materials
- [ ] Airdrop allocation formula

**Deliverables:**
- Internal points system (off-chain)
- Community forums and profiles
- Smart contracts (testnet)
- Legal framework for token

---

### Phase 6: Advanced Features (Weeks 37-48)

#### Week 37-38: Cross-Domain Concept Alignment (Discovery Engine)

**Goal:** Automated discovery of conceptual parallels across traditions

**Embedding-Based Clustering:**
- [ ] Use existing embeddings to cluster passages from different domains
- [ ] Flag cross-cluster neighbors as candidate analogies
- [ ] File: `app/src/lib/convergence/concept-alignment.ts` (new)

**Natural Language Inference Filtering:**
- [ ] Lightweight NLI pass (entailment/contradiction) to filter spurious links
- [ ] Use OpenAI API for NLI classification
- [ ] File: `app/src/lib/convergence/nli-filter.ts` (new)

**Human-in-the-Loop Approval:**
- [ ] Admin review interface for cross-domain edges
- [ ] Store pending edges in `convergence_relationships` with `status = 'pending'`
- [ ] Approval workflow before edges become public
- [ ] Files: Admin UI component, API route for approval

**UI: "Related across traditions/sciences":**
- [ ] Display cross-domain concept map
- [ ] Show related concepts from different domains
- [ ] File: New component `CrossDomainConcepts.tsx`

**Deliverables:**
- Automated concept alignment system with human curation
- 20+ validated cross-domain connections in first month
- UI for exploring related concepts across traditions

#### Week 39-40: Pattern Mining & Topic Surfacing

**Goal:** Discover emerging themes across corpus automatically

**Unsupervised Topic Discovery:**
- [ ] BERTopic-style pipeline using embeddings
- [ ] Periodic batch job to find emerging themes (e.g., "nothingness," "observer," "causality")
- [ ] File: `app/src/lib/convergence/topic-discovery.ts` (new)

**Editorial Review Workflow:**
- [ ] Present new topics to editorial reviewers
- [ ] Accepted topics become filterable facets
- [ ] Admin interface for topic approval
- [ ] Files: Admin UI, topic management API

**Topic Filtering in Library:**
- [ ] Add discovered topics as filter options
- [ ] Update library search interface

**Deliverables:**
- Topic discovery surfaces 10+ new filterable themes
- Editorial workflow ensures quality control
- Enhanced library filtering with discovered topics

#### Week 41-42: Self-Learning Loop

**Goal:** System improves by learning from user interactions

**User Question Logging:**
- [ ] Log user questions + which sources produced best answers
- [ ] Track groundedness scores and user ratings
- [ ] Database table: `convergence_learning_logs`
- [ ] File: `migrations/XXX_add_learning_logs.sql`

**Batch Job for Suggestions:**
- [ ] Periodic job suggests:
  - New cross-domain edges
  - Missing books/editions
  - Prompt tweaks
- [ ] File: `app/src/lib/convergence/learning-suggestions.ts` (new)

**Human Review Panel:**
- [ ] Admin interface for reviewing suggestions
- [ ] Approval workflow before changes go live
- [ ] Files: Admin UI for learning suggestions

**Evaluation System:**
- [ ] Re-run gold tests after changes
- [ ] Only keep changes that improve groundedness/faithfulness
- [ ] File: `app/src/lib/convergence/evaluation.ts` (new)

**Deliverables:**
- Self-learning loop improves answer quality scores by 15%+ over 3 months
- Automated suggestion system with human curation
- Evaluation framework ensures continuous improvement

#### Week 43-44: Structured Corpus Layers

**Goal:** Organize physics corpus by progression and evidence type

**Corpus Layer Classification:**
- [ ] Add `corpus_layer` field to texts table:
  - Foundational physics (classical → relativity → QM → QFT → quantum information)
  - Science-of-science (philosophy of science, epistemology, Kuhn, demarcation)
  - History/context (biographies, lab notes, letters, secondary histories)
  - Popularizations (clearly labeled, separate from primary)
- [ ] Migration: `migrations/XXX_add_corpus_layers.sql`

**Retrieval Rules:**
- [ ] When mixing religion + physics, retrieve from both corpora
- [ ] Label sources transparently
- [ ] Avoid causal claims unless in cited physics literature
- [ ] Update `hybrid-retrieval.ts` with corpus layer awareness

**UI: Corpus Layer Display:**
- [ ] Show corpus layer in document metadata
- [ ] Filter by corpus layer in library
- [ ] Visual indicator for popularizations vs primary sources

**Deliverables:**
- Structured corpus organization supports rigorous physics-spirituality integration
- Clear separation between primary sources and popularizations
- Enhanced retrieval with corpus layer awareness

#### Ritual Inventory System (NEW)
- [ ] Inventory database schema
- [ ] Add/edit/delete items UI
- [ ] Photo upload for items
- [ ] Ritual template library
- [ ] AI ritual matcher
- [ ] Substitution engine (Neptune graph)
- [ ] Shopping list generator

#### n8n Agent Workflows
- [ ] n8n installation (self-hosted or cloud)
- [ ] 16 AI agent workflows:
  - Document OCR processor
  - Metadata classifier
  - Correspondence extractor
  - Relationship suggester
  - Ritual component parser
  - Content moderator
  - Duplicate detector
  - SEO content generator
  - Social media scheduler
  - Community digest emailer
  - Backup orchestrator
  - Analytics reporter
  - Error monitor
  - Usage tracker
  - Token distributor
  - **Email Monitoring Agent** - Automated bounce rate review and troubleshooting

#### Advanced Graph Features
- [ ] Global graph view (with anti-hairball filters)
- [ ] 3D graph visualization (Three.js)
- [ ] Temporal graph (show evolution over time)
- [ ] Collaborative graph editing
- [ ] Graph export (GraphML, GEXF)

#### Premium Enhancements
- [ ] Bi-directional Notion sync
- [ ] Public API for developers
  - [ ] RESTful API documentation
  - [ ] API key management system
  - [ ] Rate limiting and quotas
  - [ ] Webhook support
  - [ ] API usage analytics
- [ ] Custom AI training on user docs
- [ ] Bulk operations interface
- [ ] Advanced analytics dashboard
- [ ] Blog platform
  - [ ] Content management system for blog posts
  - [ ] SEO-optimized article publishing
  - [ ] Author profiles and attribution
  - [ ] Comment system
  - [ ] RSS feed generation
  - [ ] Category and tag management

---

## III. UI/UX DESIGN SYSTEM

### Visual Identity: "The Scholar's Study at Midnight"

**Color Palette:**
```css
/* Backgrounds */
--bg-primary: #1A3A3A;        /* Deep green */
--bg-secondary: #202A44;      /* Dark slate blue */
--bg-card: #2A2A2A;           /* Charcoal */

/* Accents */
--accent-gold: #B48F4A;       /* Muted brass */
--accent-burgundy: #8B2E2E;   /* Deep red */
--accent-forest: #2E5E4A;     /* Forest green */

/* Text */
--text-primary: #F0EFEB;      /* Off-white */
--text-secondary: #C0BFBB;    /* Gray */
--text-accent: #B48F4A;       /* Gold */
```

**Typography:**
```css
/* Headings */
font-family: 'Garamond Premier Pro', 'Cormorant Garamond', serif;
font-weight: 600;

/* Body */
font-family: 'Inter', 'Source Sans Pro', sans-serif;
font-size: 16px;
line-height: 1.6;

/* Code/Data */
font-family: 'Source Code Pro', monospace;
```

**Cursor Interaction Rules:**

| Element | Hover State | Cursor Style | Visual Feedback |
|---------|-------------|--------------|-----------------|
| Links & Buttons | Yes | `pointer` | Gold accent glow |
| Text Input | Yes | `text` | Border highlight |
| Draggable Blocks | Yes | `grab`/`grabbing` | Slight elevation |
| Graph Nodes | Yes | `pointer` | Highlight + connected edges |
| Canvas Panning | Yes | `grab`/`grabbing` | Grid shift |
| Non-interactive | No | `default` | No change |

### Component Library

**To Implement:**
- Document Card (thumbnail, metadata, CTA)
- Search Bar (autocomplete, filters)
- Knowledge Graph (D3.js canvas)
- Block Editor (Tiptap wrapper)
- Sidebar Navigation (collapsible)
- Modal Dialog (entity details, forms)
- Badge Component (achievements, ranks)
- Tooltip (correspondence info)
- Loading States (skeleton screens)
- Error Boundaries (friendly messaging)

### Accessibility Standards

- WCAG 2.1 Level AA compliance
- Keyboard navigation for all features
- Screen reader compatibility
- High contrast mode option
- Focus indicators on all interactive elements
- Alt text for all images
- Semantic HTML5 structure

---

## IV. BUSINESS MODEL & MONETIZATION

### Two Distinct Progression Systems

**Payment Tiers** (What features you unlock):
- 🏛️ **The Reader** (Free) - Library access, basic tools
- 🏛️ **The Scholar** (Premium) - Research tools, AI, unlimited pages
- 🏛️ **The Archivist** (Pro) - Full curation, API access

**Community Ranks** (What you earn through contributions):
- ⭐ **Neophyte** - New contributor
- ⭐ **Adept** - Active contributor
- ⭐ **Magus** - Master contributor

*Note: These are independent - you can be a Reader with Magus rank, or a Scholar who is still a Neophyte!*

### Freemium SaaS Pricing

**Free Tier (The Reader):**
- Full access to Public Library
- Basic keyword search
- Personal Grimoire (25 pages max)
- 5 AI queries per month
- Export to Markdown/HTML
- Community participation

**Premium Tier (The Scholar) - $15/month or $150/year:**
- Unlimited grimoire pages
- Unlimited AI queries (Multi-Lens System)
- Advanced semantic search
- Interactive correspondence graph
- Ritual inventory system
- Export to PDF + Notion
- Priority support
- Early access to new features

**Pro Tier (The Archivist) - $50/month (Future):**
- All Premium features
- Bi-directional Notion sync
- API access
- Custom AI training
- Bulk operations
- White-label options
- Consultation hours

### Revenue Projections (Year 1)

| Metric | Target |
|--------|--------|
| Monthly Active Users (MAU) | 1,000 |
| Free Users | 950 (95%) |
| Premium Users | 50 (5%) |
| Monthly Recurring Revenue (MRR) | $750 |
| Annual Run Rate (ARR) | $9,000 |
| Customer Acquisition Cost (CAC) | $25 |
| Lifetime Value (LTV) | $180 |
| LTV:CAC Ratio | 7.2:1 ✅ |

### Budget Section

Phase-Based Bootstrap Budget:

**Phase 1 (Months 1-3): MVP on Free Tier - $0-15/month ✅ CURRENT**

**Infrastructure Costs:**
- Vercel Free (hosting) - $0
- Supabase Free 500MB (database) - $0
- Cloudflare R2 10GB (storage) - $0
- Azure Computer Vision 5K pages/month (OCR) - $0
- OpenAI GPT-4o (~100 docs/month for metadata) - ~$1-2/month
- Domain: $12/year (~$1/month) - $1
- **Total: ~$2-3/month** (97% under budget!)

**Why Cloudflare vs AWS:**
- AWS would cost $29-100/month for support access (required for troubleshooting)
- No egress fees with Cloudflare (vs $0.09/GB with AWS)
- Free community support via Discord
- S3-compatible API = minimal code changes

**Milestone to advance to Phase 2:** 200 users, 15 paying customers ($225 MRR)
This covers Phase 2's $100-200/month costs
Phase 2 (Months 4-6): First Upgrades - $100-200/month

Supabase Pro: $25/month
AWS services: $50-100/month (exceeding free tier)
Tools: $25/month (analytics, email)
Milestone to advance to Phase 3: 1000 users, 50 paying customers ($750 MRR)
This covers Phase 3's $500-1000/month costs with margin
Phase 3 (Months 7-12): Scale - $500-1000/month

Neptune for graph: $150/month (start small)
AI API budget: $200-300/month (premium features)
Enhanced Supabase/AWS: $200/month
Milestone to advance to Phase 4: 2500 users, 125 paying customers ($1875 MRR)
This provides 60%+ margin to reinvest in growth
Phase 4 (Year 2): Sustainable Growth

Self-funded from revenue
Reinvest 60% of MRR into infrastructure/growth
Hire help when MRR > $5K/month
Team Section
Change: "Minimum: 3 developers + 1 content manager" → "Solo founder/developer with AI-assisted development (Cursor AI)"
Add: "48-week timeline assumes efficient AI pair programming and phased rollout gated by revenue milestones"

---

## V. MARKETING & GROWTH STRATEGY

### Content Marketing

**SEO-Optimized Blog Posts:**
- "What is Alchemy? A Complete Guide for Beginners"
- "Understanding the Tree of Life in Qabalah"
- "Planetary Correspondences in Western Esotericism"
- "A Beginner's Guide to Tarot Symbolism"
- "The Hermetic Order of the Golden Dawn: History and Influence"

**Target Keywords:**
- "esoteric library" (Low competition)
- "occult texts online" (Medium competition)
- "grimoire digital" (Low competition)
- "correspondence tables magic" (Very low)
- "tarot symbolism guide" (High competition)

### Community Building

**Target Platforms:**
- r/occult (750K members)
- r/Wicca (150K members)
- r/alchemy (30K members)
- r/tarot (380K members)
- Academic forums (ESSWE, RENSEP)
- Discord servers (Thelema, Esoteric studies)

**Engagement Tactics:**
- Weekly themed "Upload Events"
- Monthly AMA with scholars
- Featured Contributor spotlights
- Guild-based competitions
- Collaborative digitization projects

### Launch Sequence

**Phase 1: Seeding (Months 1-2)**
- Private beta with 50 invited users
- Academic outreach (university libraries)
- Partnerships with esoteric publishers

**Phase 2: Public Launch (Month 3)**
- Product Hunt launch
- Reddit AMAs
- Press release to occult/spiritual publications
- Influencer partnerships (BookTube, WitchTok)

**Phase 3: Growth (Months 4-12)**
- Content marketing (2 blog posts/week)
- YouTube channel (text reviews, tutorials)
- Podcast (interviews with practitioners)
- Social media (Instagram, TikTok)

---

## VI. AI AGENT TEAM STRUCTURE

Based on `CORE AI TEAM — DIGITAL GRIMOIRE LIBRA.md`, we will implement 15 specialized AI agents:

### Core Leadership
1. **Vision Agent (CEO)** - Strategic oversight and alignment
2. **Coordinator Agent (COO)** - Workflow and resource management
3. **Engineering Agent (CTO)** - Technical infrastructure

### Content & Community
4. **Library Science Agent** - Text acquisition and metadata
5. **Archivist Agent** - Digitization and copyright compliance
6. **Community Manager Agent** - User engagement and moderation
7. **Marketing Agent (Herald)** - SEO and campaigns
8. **Social Media Agent (Storyteller)** - Content distribution

### Product Development
9. **Frontend Agent** - UI implementation
10. **UX Design Agent** - Interface design and testing
11. **AI Reasoning Agent (Multi-Lens Oracle)** - Answer synthesis
12. **Knowledge Graph Agent** - Ontology and relationships

### Operations
13. **Blockchain Agent** - Token smart contracts
14. **Legal Agent** - Compliance and ToS
15. **Prompt Engineer Agent** - AI instruction optimization
16. **Email Monitoring Agent** - Email deliverability monitoring, bounce rate analysis, and automated troubleshooting

**Implementation via n8n:**
- Each agent = dedicated workflow
- Inter-agent communication via webhooks
- Shared knowledge base (Supabase)
- Human-in-the-loop for critical decisions
- Weekly agent reports to Vision Agent

### Email Monitoring Agent (Agent #16) - Detailed Responsibilities

**Primary Functions:**
1. **Automated Bounce Rate Review**
   - Daily analysis of email_events table for bounce patterns
   - Categorize bounces (hard vs soft, by reason code)
   - Identify bounce clusters (specific providers, email types, user segments)
   - Generate bounce rate reports with trend analysis

2. **Automated Troubleshooting Workflows**
   - **High Bounce Rate (>5%)**: 
     - Query email_events for bounce reasons
     - Check for invalid email patterns in database
     - Review email validation logic
     - Remove hard bounces from user list automatically
     - Generate remediation report for admin review
   
   - **Spam Complaint Rate (>0.1%)**:
     - Analyze complaint patterns
     - Review email content and subject lines
     - Check sender reputation metrics
     - Flag emails for content review
   
   - **Delivery Failure Rate (>10%)**:
     - Verify SMTP configuration status
     - Check DNS records (SPF, DKIM, DMARC) via API
     - Monitor domain reputation scores
     - Alert Engineering Agent if infrastructure issues detected

3. **Proactive Email List Hygiene**
   - Daily cleanup of hard bounces from user database
   - Weekly review of soft bounces (convert to hard after 3 attempts)
   - Monthly email validation audit
   - Quarterly comprehensive list cleanup

4. **Automated Reporting**
   - Daily metrics summary (delivery rate, bounce rate, spam rate)
   - Weekly trend analysis with recommendations
   - Monthly comprehensive email health report
   - Alert notifications when thresholds exceeded

**Workflow Triggers:**
- **Scheduled:** Daily at 9 AM UTC (bounce review), Weekly on Mondays (trend analysis)
- **Event-Driven:** SendGrid webhook events (bounce, spamreport, dropped)
- **Threshold-Based:** Alert-triggered workflows when metrics exceed thresholds

**Integration Points:**
- **SendGrid API:** Fetch bounce details, suppression lists, domain reputation
- **Supabase Database:** Query email_events, update user records, log actions
- **Engineering Agent:** Escalate infrastructure issues
- **Admin Dashboard:** Post reports and alerts

**Human-in-the-Loop Checkpoints:**
- Before removing >100 users from database
- Before changing email validation rules
- Before escalating to Engineering Agent
- When bounce rate >10% (critical threshold)

**Success Metrics:**
- Bounce rate maintained <5%
- 95%+ delivery rate
- <0.1% spam complaint rate
- Automated resolution of 80%+ bounce issues
- Zero manual intervention for routine bounce cleanup

---

## VII. DEPLOYMENT & INFRASTRUCTURE

### Infrastructure as Code (Terraform)

**Resources to Provision:**
```hcl
# Core AWS Resources
- S3 bucket (digital-grimoire-library)
  - Versioning enabled
  - Lifecycle: 30d → IA, 90d → Glacier
- Lambda functions (textract-trigger, metadata-extractor)
- SNS topic (textract-completion)
- Neptune cluster (grimoire-correspondences)
- IAM roles (lambda-exec, textract-role)
- CloudWatch alarms (storage, invocations, costs)

# Monitoring
- ✅ Sentry error tracking (complete setup, requires DSN)
- ✅ Health check endpoint (`/api/health`)
- ✅ Vercel Analytics (active)
- Budget alerts (90% threshold)
- Error rate alarms
- Uptime monitoring service (external setup required)
```

### Discord Server Setup (Planned for Phase 5)

**Status:** 📋 Documented, ready for implementation

A comprehensive Discord server setup guide has been created to support:
- **Sentry Alerts** - Real-time error notifications from production
- **Feature Updates** - Announcements and communication with end users  
- **Community Engagement** - Feature requests, book requests, and user support

**Documentation:** `docs/Setup Docs/DISCORD_SERVER_SETUP.md`

**Key Components:**
- Channel structure (admin/technical, community, optional channels)
- Sentry → Discord webhook integration
- Discord bot setup (optional, for automation)
- Roles and permissions configuration
- Application integration ("Join Discord" button)

**Priority:** P1 (Should Have)  
**Effort:** M (16-40 hours)  
**Sprint:** Phase 5, Weeks 31-32  
**Dependencies:** None

---

### Email Infrastructure (Required for Production)

**⚠️ CRITICAL: SendGrid SMTP Configuration**

Supabase's default email service is limited to 3 emails/hour during development - this is **NOT suitable for production**.

**Setup Requirements:**
```bash
# Required before production deployment

1. Create SendGrid account and verify domain
   - Sign up at sendgrid.com
   - Add domain verification (SPF/DKIM/DMARC records)
   - Generate API key

2. Configure in Supabase Dashboard:
   - Project Settings → Auth → SMTP Settings
   - Enable custom SMTP
   - SMTP Host: smtp.sendgrid.net
   - SMTP Port: 587
   - Username: apikey
   - Password: [SendGrid API Key]
   - Sender Email: noreply@yourdomain.com
   - Sender Name: Convergence

3. Test all email flows:
   - User registration & verification
   - Password reset
   - Account notifications
   - Test across multiple email providers

4. Customize email templates (optional but recommended):
   - Authentication → Email Templates in Supabase
   - Apply Convergence branding
   - See docs/SUPABASE_PASSWORD_RESET_SETUP.md for templates
```

**Cost Structure:**
- **Free Tier:** 100 emails/day (3,000/month) - Good for initial launch
- **Essentials:** $19.95/month for 50,000 emails
- **Pro:** $89.95/month for 100,000 emails

**Priority:** P0 - Blocking production deployment  
**Time Estimate:** 4-6 hours  
**Documentation:** `docs/SUPABASE_PASSWORD_RESET_SETUP.md`

---

### CI/CD Pipeline (GitHub Actions)

**Workflow:**
```yaml
1. Test (on PR)
   - Lint (ESLint + Prettier)
   - Type check (TypeScript)
   - Unit tests (Vitest)
   - E2E tests (Playwright)

2. Build (on merge to main)
   - Next.js production build
   - Asset optimization
   - Upload artifacts

3. Deploy (on main push)
   - Vercel production deployment
   - Database migrations (Prisma)
   - Lambda function updates
   - Terraform apply (if [terraform] in commit)

4. Monitor
   - Lighthouse CI (performance)
   - ✅ Sentry (error tracking) - Complete setup, requires DSN configuration
   - ✅ Health check endpoint - `/api/health` ready for uptime monitoring
   - ✅ Vercel Analytics - Active (page views, Core Web Vitals)
   - CloudWatch (infrastructure) - AWS monitoring (when using AWS services)
```

### Hosting & Scaling

**Current (MVP - Free Tier) ✅ ACTIVE:**
- Frontend: Vercel Free (Hobby plan) - $0
- Database: Supabase Free (500MB) - $0
- Files: Cloudflare R2 (10GB free) - $0
- OCR: Azure Computer Vision (5K pages/month) - $0
- AI: OpenAI GPT-4o (pay-per-use) - ~$1-2/month
- **Total: ~$2-3/month**

**Future (100K MAU):**
- Frontend: Vercel Pro ($20/mo)
- Database: Supabase Pro ($25/mo) → RDS ($100/mo)
- Files: S3 Standard ($10-50/mo)
- CDN: CloudFront ($20/mo)
- Cache: ElastiCache Redis ($30/mo)
- Neptune: r5.large ($150/mo)

---

## VIII. RISK MANAGEMENT

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| AWS free tier exhaustion | High | Monitoring + budget alarms |
| OCR quality issues | Medium | Human review pipeline |
| Vector search performance | Medium | Optimize indexes, caching |
| Graph database complexity | High | Start with PostgreSQL fallback |
| AI API costs runaway | High | Cache responses, rate limits |

### Legal Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Copyright infringement | Critical | Only public domain + licensed works |
| Token classification as security | Critical | Legal opinion, utility-only design |
| GDPR/privacy violations | High | Privacy-by-design, data minimization |
| Cultural appropriation | Medium | Ethical sourcing, community consultation |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Low user adoption | High | Content marketing, niche targeting |
| Poor free→premium conversion | Medium | Clear value prop, feature gating |
| Competitor launches similar | Medium | First-mover advantage, community lock-in |
| Burn rate exceeds runway | Critical | Lean operations, phased funding |

---

## IX. SUCCESS METRICS & KPIs

### Product Metrics

| Metric | Target (6 months) | Target (12 months) |
|--------|-------------------|-------------------|
| Total Users | 500 | 1,000 |
| Premium Subscribers | 15 (3%) | 50 (5%) |
| Monthly Active Users (MAU) | 300 | 700 |
| Daily Active Users (DAU) | 80 | 200 |
| DAU/MAU Ratio | 27% | 29% |
| Texts in Library | 100 | 300 |
| Correspondence Nodes | 200 | 500 |
| AI Queries/Month | 1,000 | 5,000 |

### Technical Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Page Load Time | <2s | Lighthouse |
| Search Latency | <500ms | CloudWatch |
| API Uptime | >99.5% | Pingdom |
| OCR Accuracy | >95% | Human review |
| Test Coverage | >80% | Vitest |
| Lighthouse Score | >90 | CI |

### Business Metrics

| Metric | Target |
|--------|--------|
| Monthly Recurring Revenue (MRR) | $750 |
| Customer Acquisition Cost (CAC) | <$25 |
| Lifetime Value (LTV) | >$180 |
| Churn Rate | <5%/mo |
| Net Promoter Score (NPS) | >50 |

---

## X. IMMEDIATE ACTION ITEMS (Next 30 Days)

### ✅ COMPLETED (Weeks 1-4)
- [x] Set up development environment (Node.js, Git, pnpm)
- [x] Create GitHub repository
- [x] Initialize Next.js 14 project
- [x] Set up Supabase project
- [x] Run database schema
- [x] Configure Cloudflare R2 storage
- [x] Implement authentication (Supabase Auth SSR)
- [x] Create homepage layout
- [x] Build document upload API
- [x] Set up R2 file storage with presigned URLs
- [x] Implement Azure OCR pipeline
- [x] Document listing page
- [x] Basic search (title/author)
- [x] User dashboard and profile
- [x] Admin panel with upload interface

### 🔄 IN PROGRESS (Current Week)
- [ ] Digitize first 10-20 public domain texts
- [ ] Test end-to-end upload → OCR → metadata → display flow
- [ ] Add full-text search (PostgreSQL FTS)
- [ ] Implement document viewer (PDF display)
- [ ] Write comprehensive API documentation

### ⏳ NEXT PRIORITIES (Weeks 5-6)
- [ ] Advanced library filtering (domain, year, tags)
- [ ] Pagination for document listings
- [ ] Document detail pages with full metadata
- [ ] "Clip to Journal" functionality (foundation for Phase 2)
- [ ] Deploy to Vercel production
- [ ] User testing with 3-5 beta users
- [ ] Performance optimization (Lighthouse score >90)

---

## XI. LONG-TERM VISION (Years 2-5)

### Year 2: Community Growth
- 10,000 MAU
- 500 premium subscribers
- 1,000+ texts in library
- Launch token on mainnet
- Partnerships with academic institutions

### Year 3: Platform Maturity
- 50,000 MAU
- 2,000 premium subscribers
- Full API release
- Mobile apps (iOS, Android)
- International expansion (multilingual)

### Year 4: Market Leadership
- 200,000 MAU
- 10,000 premium subscribers
- White-label licensing
- Physical event series
- Documentary film about the project

### Year 5: Cultural Institution
- 500,000 MAU
- Recognized as definitive esoteric archive
- Museum partnerships
- Grant funding secured
- Open-source core infrastructure

---

## XII. CONCLUSION

The Digital Grimoire Library represents a unique convergence of:
- **Academic rigor** (scholarly standards)
- **Modern UX** (Notion-like simplicity)
- **Advanced AI** (multi-lens reasoning)
- **Community ownership** (ethical tokenomics)

This master plan provides a clear, actionable roadmap from MVP to market leadership. Success requires disciplined execution, user-centered design, and unwavering commitment to the project's philosophical mission: **bridging ancient wisdom and modern technology.**

---

## XIII. APPENDIX

### Document References
1. [Complete Technical Implementation Plan](../source/Complete_Technical_Implementation_Plan.md)
2. [UI/UX Strategy](../source/UI_UX_Strategy.md)
3. [Business Plan](../source/Business_Plan.md)
4. [Cursor Interaction Rules](../source/Cursor_Interaction_Rules.md)
5. [Metadata Guidelines](../source/Metadata_Guidelines.md)
6. [Document Classification Taxonomy](../source/Document_Type_Classification.md)
7. [Supabase Schema](../../supabase-schema.sql)
8. [Core AI Team Structure](../source/CORE_AI_TEAM.md)

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tiptap Documentation](https://tiptap.dev)
- [D3.js Gallery](https://observablehq.com/@d3/gallery)
- [AWS Textract](https://aws.amazon.com/textract/)
- [Amazon Neptune](https://aws.amazon.com/neptune/)
- [Claude API](https://www.anthropic.com/api)

### Contact & Team
- **Project Lead:** [Your Name]
- **Repository:** [GitHub URL]
- **Project Board:** [Notion/Trello URL]
- **Design System:** [Figma URL]

---

**Last Updated:** October 30, 2025  
**Next Review:** November 1, 2025  
**Version:** 3.2

---

## XIV. KEY TECHNICAL DECISIONS & MIGRATIONS

### Infrastructure Migration: AWS → Cloudflare R2 (Oct 26, 2025)

**Problem:**
- AWS Textract had permission issues requiring support access
- AWS support plans cost $29-100/month minimum (58-200% of bootstrap budget)
- Unpredictable egress fees ($0.09/GB) could balloon costs
- Can't troubleshoot account-specific issues without paid support

**Solution:**
- Migrated to Cloudflare R2 for object storage
- Kept Azure Computer Vision for OCR (5K pages/month free)
- S3-compatible API meant minimal code changes

**Benefits:**
- $0 egress fees (major cost savings)
- Free community support (Discord, forums)
- Better economics for bootstrap phase
- Stays within $0-15/month target budget

**Documentation:**
- Full analysis: `docs/AWS_LESSONS_LEARNED.md`
- Migration session: `sprint_summaries/SPRINT_3_AWS_MIGRATION_SESSION.md`

### AI Provider: Claude → OpenAI GPT-4o (Oct 26, 2025)

**Problem:**
- Claude 3.5 Sonnet had availability issues (404 errors)
- Model `claude-3-5-sonnet-20241022` not consistently available

**Solution:**
- Switched to OpenAI GPT-4o for metadata extraction
- Used JSON mode for guaranteed structured responses

**Benefits:**
- More stable and widely accessible
- Better documentation and examples
- Guaranteed JSON output format
- Comparable quality for metadata extraction

### Development Approach: Traditional → AI-Assisted (Oct 2025)

**Tool:** Cursor AI with Claude Sonnet 4.5

**Results:**
- 29x average velocity improvement
- Sprint 1: 20x faster (1h 53m vs 40h planned)
- Sprint 2: 32x faster (2.5h vs 80h planned)
- Phase 4: Similar velocity maintained
- Professional code quality from start
- Zero technical debt accumulated

**Key to Success:**
- Clear documentation and planning
- Incremental feature building
- Real-time debugging and iteration
- Comprehensive testing at each step

