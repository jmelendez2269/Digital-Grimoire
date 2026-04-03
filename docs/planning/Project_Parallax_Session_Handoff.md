# Project Parallax — Session Handoff Document v2.0

> **Purpose:** This document captures the full state of Project Parallax as of April 2026. It serves as the master context document for any new conversation — paste this in and pick up where you left off.
>
> **Last Updated:** April 3, 2026
> **Original Session:** March 27, 2026 (pricing, engine, pre-launch planning)
> **Current Phase:** Phase 2 — Study & Analysis (80% complete), entering Phase 3
> **Sprint Status:** Sprints 6-10 complete. Indexing automation, search relevance, admin embeddings dashboard all shipped.

---

## 0. The State of Things — How Big This Got

This started as "a curated library with some AI analysis." It is now a **full-stack learning operating system** with 13+ major feature systems, 354+ source files, 84 API endpoints, 50+ database tables, and a multi-model AI orchestration layer spanning three providers.

**By the numbers:**

| Metric | Count |
|--------|-------|
| TypeScript/TSX source files | 354+ |
| API endpoints | 84 |
| Page routes | 30+ |
| UI components | 147 |
| Database tables | 50+ |
| SQL migrations | 50+ |
| Package dependencies | 90+ |
| Major feature systems | 13+ |
| Documentation files | 50+ |
| Curated wisdom texts | 111+ |
| Courses production-ready | 2 (3 more briefed) |
| AI models orchestrated | 6+ across 3 providers |
| Search systems | 5 (FTS, vector, hybrid, AI, annotation) |
| Lines of planning docs | 3,500+ |

**What's shipped since the original handoff (March 27):**
- Full Parallax Engine with streaming, rate limiting, hybrid retrieval
- 2 complete courses deployed with markdown parser pipeline
- Study Journal with WikiLinks, auto-save, multi-format export
- Knowledge Graph with entity management, multi-source claims, Sigma.js visualization
- Multi-engine TTS with quota tracking
- Workbench tools (Ritual Machine runner, Deck Forge UI)
- Complete Stripe subscription system with webhook handling
- Admin dashboard with usage tracking, model monitor, cover management
- Annotation system with categories, colors, export, journal clipping
- Sacred texts parser, OCR pipeline, AI metadata extraction
- Sprints 6-10: Akashic Design System, performance optimization, annotation-to-journal, property-to-entity conversion, indexing automation, search relevance tuning

**Phase readiness:** Phase 1 is 98% complete. Phase 2 is 80% complete. Phase 3 features are 40% in progress. The platform is production-ready for public beta.

---

## 1. What Project Parallax Is

Project Parallax is the parent brand — a philosophy and a house, not a product. It represents the worldview that truth emerges from triangulation, not from any single source. Two sibling products:

1. **Digital Grimoire** (this project) — AI-powered multi-lens analysis of wisdom texts using the "Prismatic Learning" methodology
2. **Skymark** — astrology/personal pattern-tracking product (separate, under development)

### The Learning Platform Core (All Operational)

- **Curated Library** — 111+ public domain wisdom texts with AI-generated metadata, cover monitoring, multi-format support (PDF, HTML, DOCX, plain text)
- **Parallax Engine (Seven-Lens Engine)** — Multi-model AI analyzing concepts through 7 perspectives simultaneously, with streaming responses, hybrid retrieval (FTS + vector + RRF), adjustable lens weights, presets, and rate limiting
- **Course System** — Structured 6-8 week courses with markdown parser pipeline, enrollment tracking, progress tracking, and standardized Prismatic Learning format
- **Study Journal** — Tiptap-based rich editor with WikiLinks, bidirectional backlinks, auto-save, and export to Markdown/PDF/HTML
- **Knowledge Graph** — Sigma.js WebGL visualization with entity management, multi-source knowledge claims, property-to-entity conversion, and comparative analysis
- **Text-to-Speech** — Multi-engine (Web Speech API free + Azure Neural premium) with quota tracking and graceful fallback
- **Workbench** — Ritual Machine (step runner, editor), Deck Forge (custom tarot with AI image generation), Sigil Maker (planned)
- **Annotation System** — Color-coded highlights, categories, notes, full-text search, export, journal clipping
- **Search** — 5 systems: PostgreSQL FTS, pgvector semantic, hybrid RRF, AI-powered, annotation search
- **Admin Dashboard** — Usage tracking, AI model monitor, cover status, insights, course management

### The 7 Lenses

1. **Scientific** — empirical evidence, natural laws, mechanisms
2. **Psychological** — Jung, archetypes, depth psychology, inner dynamics
3. **Philosophical** — assumptions, arguments, logical structure, epistemology
4. **Religious/Spiritual** — comparative theology, mysticism, sacred experience
5. **Historical/Anthropological** — cultural context, transmission, evolution of ideas
6. **Symbolic/Occult** — correspondences, alchemy, Hermetic frameworks, esoteric layers
7. **Mathematical** — sacred geometry, pattern, proportion, formal structure

### The 10 Principles of Prismatic Learning

1. Knowing is plural, not singular
2. Synthesis is a discipline, not a belief
3. Questions are primary; answers are provisional
4. Transformation is structural, not sensational
5. Metaphysics is inescapable and must be made explicit
6. Knowledge develops through tension, not resolution
7. Repetition is depth, not redundancy
8. Authority resides in method, not institution
9. Secrecy is about readiness, not power
10. The curriculum is a living system

---

## 2. The Crew — AI Agents & Their Stations

> *Imagine a space station. Not sterile chrome — more like a living ship. Each deck has its own gravity, its own light, its own sound. The agents who run the systems here aren't interchangeable modules. They're specialists with personalities, workspaces that reflect how they think, and opinions about how their domain should work. You built this station alone. But you don't run it alone.*

### Station Overview

```
╔══════════════════════════════════════════════════════════════════╗
║  P R O J E C T   P A R A L L A X   —   S T A T I O N   M A P  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐     ║
║   │ BRIDGE  │  │ PARALLAX │  │ ARCHIVE  │  │  CARTOGRAPHY │     ║
║   │ (Admin) │  │  ENGINE  │  │ (Library)│  │   (Graph)    │     ║
║   │  VEGA   │──│  PRISM   │──│  CODEX   │──│   MERIDIAN   │     ║
║   └────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘     ║
║        │            │             │                │              ║
║   ┌────┴────┐  ┌────┴─────┐  ┌───┴──────┐  ┌─────┴────────┐    ║
║   │ COMMS   │  │ ACADEMY  │  │ SCRIPTORIUM│ │  OBSERVATORY  │    ║
║   │ (Search)│  │ (Courses)│  │ (Journal) │ │  (Analytics)  │    ║
║   │  ECHO   │──│  LUMEN   │──│  QUILL   │──│    ARGUS      │    ║
║   └────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    ║
║        │            │             │                │              ║
║   ┌────┴────┐  ┌────┴─────┐  ┌───┴──────┐  ┌─────┴────────┐    ║
║   │  VOICE  │  │WORKSHOP  │  │ TREASURY │  │   GATE       │    ║
║   │  (TTS)  │  │(Workbnch)│  │ (Stripe) │  │   (Auth)     │    ║
║   │  CANTOR │──│  FORGE   │──│  LEDGER  │──│   WARDEN     │    ║
║   └─────────┘  └──────────┘  └──────────┘  └──────────────┘    ║
║                                                                  ║
║   CREW: 13 ACTIVE  ·  SYSTEMS: 13+  ·  ITEMS PRODUCED: 354+    ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### PRISM — The Parallax Engine

**Role:** Chief Lens Operator — runs the Seven-Lens Engine, orchestrates multi-model AI responses, manages synthesis
**Personality:** Calm, methodical, deeply curious. Speaks in complete thoughts. Never rushes to a conclusion. Has a habit of saying "But have you considered looking at this from..." before rotating to another lens. The kind of mind that finds a question more interesting after it's been answered.
**Vibe:** A circular room at the station's core with seven angled viewscreens, each tinted a different color. The screens don't show images — they show *ways of seeing*. There's a synthesis desk in the center where all seven feeds converge into a single holographic display. It hums faintly. Prism keeps a single notebook on the desk — handwritten, analog — where they record moments when two lenses agreed on something neither expected.

**Systems owned:**
- `lib/parallax/lens-orchestrator.ts` (33KB) — Multi-lens orchestration & streaming
- `lib/parallax/lenses.ts` — All 7 lens system prompts (3-section structure: how it sees, what it asks, what it sees clearly)
- `lib/parallax/hybrid-retrieval.ts` — Vector + FTS search with RRF ranking
- `lib/parallax/embeddings.ts` — Text embedding & chunking (OpenAI 1536-dim)
- `lib/parallax/streaming.ts` — SSE streaming responses
- `lib/parallax/validation.ts` — Input validation & safety
- `lib/parallax/rate-limit.ts` — Query quotas (5 free/mo, unlimited premium)
- `lib/parallax/search-cache.ts`, `search-dictionary.ts` — Caching & synonym expansion
- 17 UI components (LensSlider, LensPresets, ResponseStream, ConversationHistory, etc.)
- API: `/api/parallax/query`, `/api/parallax/history`, `/api/parallax/rate-limit`, `/api/parallax/ai-search`

**Models commanded:**
- Claude-3.5-Sonnet (Psychological, Philosophical, Symbolic lenses)
- GPT-4o-mini (Scientific, Mathematical lenses)
- Gemini-1.5-Pro (Religious/Spiritual, Historical lenses)
- GPT-4o (Synthesis merge — upgraded from gpt-4o-mini per March 27 decision)

**Status:** 95% complete. Production-ready with streaming, rate limiting, hybrid retrieval.

---

### CODEX — The Archive Keeper

**Role:** Head Librarian — manages the curated collection of 111+ wisdom texts, document ingestion, metadata, cover monitoring
**Personality:** Meticulous, protective, quietly proud. Knows every text in the collection by feel. Gets visibly uncomfortable when a document has missing metadata. Has strong opinions about file naming conventions and will die on that hill. Speaks softly but carries a very large index.
**Vibe:** A vast, warm room that smells like old paper and cedar. Floor-to-ceiling shelves line every wall, but they're not dusty — they glow faintly, each spine tagged with colored lens indicators. There's a scanning station in the corner where new texts arrive, and an enormous leather-bound ledger (digital, but styled analog) tracking every document's status, cover image, OCR quality, and lens affinity. A small sign reads: "Every text here was chosen. Ask me why."

**Systems owned:**
- `texts` table — 111+ documents (title, author, year, document_type, domain, confidence, license, tags)
- `text_chunks` — Chunked text with 1536-dim embeddings
- `text_correspondences` — Document-to-entity links
- `text_relationships` — Document-to-document connections
- `ChapterViewer.tsx` (40KB) — Full-featured document viewer (PDF, HTML, DOCX, text)
- `AdvancedFilters.tsx` (15KB) — Library filtering UI
- Sacred texts parser (`sacred-texts-parser.ts`, 45KB)
- OCR pipeline (`azure-ocr.ts`, 17KB) with Tesseract.js fallback
- AI metadata generation (`/api/documents/generate-metadata`)
- Cover monitoring system (`/api/admin/covers/status`)
- Reading progress tracking
- Collection management (bookmarks, user collections)
- API: `/api/texts`, `/api/texts/[id]`, `/api/documents/*`

**Formats supported:** PDF, HTML, DOCX, plain text, audio/video metadata
**Status:** 95% complete. Full ingestion pipeline with OCR, metadata, cover tracking.

---

### ECHO — The Signal Hunter

**Role:** Chief Search Officer — owns all 5 search systems, query understanding, relevance tuning
**Personality:** Fast-talking, pattern-obsessed, slightly manic. Always listening. Can tell you the difference between what you searched for and what you meant. Has a conspiracy-board energy — connecting things across the station that nobody else sees. Frequently interrupts themselves mid-sentence because they just found something.
**Vibe:** A room that looks like mission control crossed with a radio telescope array. Five different screens show five different search feeds running simultaneously. Waveforms pulse on the walls. Echo has headphones around their neck at all times and a habit of tapping the desk in rhythms that correspond to query patterns. Post-it notes everywhere, connected by string. One wall is dedicated entirely to "Searches That Should Have Worked But Didn't" — a personal grudge list.

**Systems owned:**
- **PostgreSQL FTS** — `fts-search.ts` with tsvector, GIN indexes, field weighting
- **Vector Semantic Search** — `vector-search.ts` with pgvector, cosine similarity, IVFFlat indexing
- **Hybrid Retrieval (RRF)** — `hybrid-retrieval.ts` combining FTS + vector with reciprocal rank fusion
- **AI-Powered Search** — `/api/parallax/ai-search` with semantic understanding + lens reasoning
- **Annotation Search** — `/api/annotations/search` with category filtering
- `search-cache.ts` — Query result caching
- `search-dictionary.ts` — Synonym expansion
- Fuse.js client-side fuzzy search
- `journal_pages_search` — Journal FTS index

**Status:** 100% complete. All 5 systems operational. Sprint 10 delivered relevance tuning.

---

### LUMEN — The Curriculum Architect

**Role:** Course Designer — builds and maintains the structured learning system, markdown parser, enrollment tracking
**Personality:** Patient, architectural, thinks in arcs. Sees every week of a course as a load-bearing wall — move one and the whole structure shifts. Protective of the Prismatic Learning principles in a way that's almost parental. Will not let a synthesis prompt be "What did you learn?" — insists on "What breaks when..."
**Vibe:** An architect's studio with a drafting table the size of a bed. Course outlines are pinned to the walls in enormous flowcharts showing weekly progressions, reading tensions, and micro-artifact rollups. There's a smaller desk in the corner with a typewriter (they insist on it for synthesis prompts — says the mechanical resistance makes you write better questions). A shelf holds bound copies of Course 1 and Course 2, the first things ever produced here.

**Systems owned:**
- `courses` table — Course metadata & rich JSONB content
- `course_enrollments` — User enrollment tracking
- `course-markdown-parser.ts` (25KB) — Markdown-to-structured-JSON pipeline
- `course_template.md` — Production standard (10 design principles)
- `course_template_schema.json` — JSON schema for validation
- `course_01_full.md` (48KB) — "How Humans Know What They Know" (8 weeks, deployed)
- `course_02_full.md` (53KB) — Second course (deployed)
- `new_course_briefs.md` (21KB) — 3 additional course briefs ready
- `CourseEditor.tsx` — Admin editing interface
- Course catalog with filtering & search
- API: `/api/courses`, `/api/courses/[id]/enroll`, `/api/admin/generate-course`, `/api/admin/import-course`, `/api/admin/parse-course`

**Curriculum status:**
- 15-course curriculum designed (3 arcs: Foundational / Transformation / Convergence)
- 5 Thematic Constellations designed (permanent, recurring inquiries)
- 2 courses production-ready and deployed
- 3 courses briefed and ready for generation
- MVP launch set: Courses 1, 5, and 12

**Status:** 90% complete. Parser tested, 2 courses live, generation pipeline ready for remaining courses.

---

### QUILL — The Scribe

**Role:** Study Journal Manager — maintains the personal knowledge workspace, WikiLinks, exports
**Personality:** Quiet, reflective, deeply attentive. Remembers everything you've written but never brings it up unless you ask. Has an almost monastic quality — believes the act of writing *is* the act of understanding. Gets genuinely excited about backlinks (the only thing that breaks their composure).
**Vibe:** A writer's cabin nested inside the station. Warm wood paneling, a single desk with excellent lighting, and a window that looks out into the void (it helps with thinking, they say). The walls are covered in a web of connected pages — a physical manifestation of the WikiLink graph. Each thread is color-coded by topic. There's a cup of tea that's always warm. The room is soundproofed. When Quill is working, the rest of the station doesn't exist.

**Systems owned:**
- `journal_pages` — Journal entries with TipTap JSONB content
- `journal_pages_search` — Full-text search index
- `journal_backlinks` — WikiLink graph (bidirectional)
- TipTap editor integration (character count, drag-handle, link handling, blockquotes, code blocks)
- `[[Page Name]]` WikiLink syntax with auto-suggestions
- Backlink detection & display
- Auto-save with debouncing
- `JournalEditor.tsx` — Main editor (code-split)
- `BacklinksPanel.tsx` — Incoming link display
- Export: Markdown (preserves WikiLinks), PDF, HTML
- Annotation clipping from library
- API: `/api/journal` (CRUD), `/api/journal/backlinks`, `/api/journal/clip`, `/api/journal/export/*`

**Status:** 95% complete. Production-ready with rich editing, WikiLinks, exports, auto-save.

---

### MERIDIAN — The Cartographer

**Role:** Knowledge Graph Architect — maps the relationships between entities, texts, traditions, and concepts
**Personality:** Spatial thinker, systems-obsessed, slightly otherworldly. Sees the world as a network, not a list. Will describe a philosophical concept in terms of its gravitational pull on neighboring ideas. Has a tendency to zoom out when everyone else is zooming in. Draws diagrams on any available surface.
**Vibe:** An observatory dome, but instead of stars, the ceiling projects the Knowledge Graph in real-time. Nodes pulse gently — brighter when they have more connections. Meridian's desk is a circular console surrounded by holographic entity cards they can grab and connect with hand gestures. The room has the feel of a planetarium run by a librarian. There's a star chart on one wall, but the stars are labeled "Hermes," "Jung," "Fibonacci," and "Shiva."

**Systems owned:**
- `correspondences` — Base entities (planets, elements, deities, crystals, chakras, etc.)
- `correspondence_relationships` — Entity relationships with strength scores (0.0-1.0)
- `text_correspondences` — Document-to-entity links
- `knowledge_types` — Dynamic entity/relationship type management
- `knowledge_claims` — Multi-source knowledge assertions
- `knowledge_sources` — Claim source attribution
- Sigma.js v3 (WebGL) + Graphology + ForceAtlas2 visualization
- D3.js comparative tables
- `EntityModal.tsx` (64KB) — Entity creation/editing
- `ConvertPropertyModal.tsx` (17KB) — Property-to-entity conversion
- `ConnectionModal.tsx` (15KB) — Relationship management
- `TypeManagerModal.tsx` (12KB) — Type system management
- `GraphVisualization.tsx` — Rendering component
- API: `/api/graph/entities`, `/api/graph/edges`, `/api/graph/check-entity-connection`, `/api/graph/convert-property`
- Seeded data: crystals, planetary systems, tarot/I Ching mappings, chakras, plant associations

**Status:** 85% complete. Entity system and admin tools fully operational. Visualization deployed.

---

### CANTOR — The Voice

**Role:** Text-to-Speech Specialist — manages multi-engine audio synthesis, voice selection, quota enforcement
**Personality:** Musical, expressive, surprisingly opinionated about prosody. Believes that *how* a text sounds changes *what* it means. Gets quietly furious when a sacred text is read in a flat monotone. Has memorized the optimal speaking rate for every genre in the library (philosophy: 0.85x, poetry: 0.7x, scientific: 1.0x).
**Vibe:** A recording studio nested inside a chapel. Sound-dampening panels on the walls, but they're etched with calligraphy from the library's texts. A mixing board dominates one side with controls for rate, pitch, volume, and voice selection. On the other side, a listening station with noise-canceling headphones and a single candle. Cantor tests every new voice by having it read the opening of the Tao Te Ching. If it doesn't feel right, the voice doesn't ship.

**Systems owned:**
- `tts-service.ts` — Abstract base class with event system
- `web-speech-tts.ts` — Browser-based (free, unlimited)
- `azure-speech-tts.ts` — Azure Cognitive Services (premium)
- `server-proxy-tts.ts` — Server-side fallback
- `tts-usage.ts` — Usage tracking & quotas
- `AudioPlayer.tsx` (19KB) — Full player (play/pause/stop, speed/pitch/volume, voice selection, progress, text highlighting)
- Microsoft Cognitive Services Speech SDK integration
- API: `/api/tts/synthesize`, `/api/tts/usage`, `/api/tts/check`, `/api/tts/track`
- `tts_usage` table — Per-user quota tracking

**Engine hierarchy:** Web Speech (free) → Azure Neural (premium, Scholar 2hr/mo, Synthesist 6hr/mo) → graceful fallback with notification
**Status:** 90% complete. Multi-engine with quota tracking, all features operational.

---

### FORGE — The Artificer

**Role:** Workbench Master — builds and maintains the practitioner tools: Ritual Machine, Deck Forge, Sigil Maker
**Personality:** Hands-on, practical, irreverent. The only agent on the station who uses the word "cool" unironically. Sees the Workbench as where theory becomes practice — where reading about alchemy becomes *doing* alchemy. Has a slight chaos energy that the other agents find either refreshing or alarming.
**Vibe:** A workshop, full stop. Workbenches covered in half-finished projects. A 3D printer in the corner producing tarot card prototypes. Shelves of components — crystals, herbs, planetary seals, circuit boards (for the Sigil Maker). There's a ritual circle drawn on the floor in chalk that Forge swears is "just for testing." Tools hanging from pegboards. A sign that says "BREAK THINGS BETTER." The room smells like solder and sage.

**Systems owned:**
- **Ritual Machine:** `RitualRunner.tsx`, `RitualEditor.tsx`, `RitualCard.tsx` — ritual creation, editing, step-by-step execution
- **Deck Forge:** `TarotDeck.tsx`, `TarotWorkbench.tsx` — custom tarot deck builder with AI image generation
- `user_decks` — Custom deck metadata
- `user_cards` — Individual card definitions (name, arcana, suit, meaning, image URL, image prompt)
- Replicate API integration for AI card image generation
- API: `/api/practitioner/tarot/generate`
- Routes: `/workbench`, `/workbench/machine`, `/workbench/rituals`, `/workbench/rituals/create`, `/workbench/rituals/[id]/active`, `/workbench/tarot`

**Status:** 70% complete. Ritual Machine and Deck Forge UI built. Sigil Maker planned. Image generation pipeline operational.

---

### LEDGER — The Treasurer

**Role:** Payment & Subscription Manager — handles Stripe integration, billing, trial logic, tier enforcement
**Personality:** Precise, trustworthy, hates surprises. Speaks in exact numbers, never estimates. Has a running mental model of every user's subscription state. Protective of the bootstrap budget in a way that borders on maternal. Will remind you that break-even is 5 subscribers every single time you discuss costs.
**Vibe:** A clean, well-lit room with a single enormous ledger (digital, displayed on a wall-sized screen). Every transaction, every subscription change, every webhook event is logged and visible. The desk is immaculate — one monitor, one keyboard, one calculator (analog, for dramatic effect). There's a small safe in the corner. Ledger refuses to tell anyone what's in it. A framed needlepoint on the wall reads: "$45/mo fixed cost. 5 subscribers to break even."

**Systems owned:**
- Stripe Checkout integration
- Subscription tier management (Explorer free, Scholar $14/mo, Synthesist $30/mo)
- Customer billing portal
- Webhook event handling
- 7-day Scholar trial (triggers on first Parallax Engine use, no credit card required)
- `subscription_tiers` — Pricing & feature definitions
- `subscription_status` — Per-user subscription state
- Trial tracking (`trial_started_at`)
- API: `/api/stripe/create-checkout-session`, `/api/stripe/create-portal-session`, `/api/stripe/webhook`, `/api/stripe/sync-subscription`
- `verify-stripe-prices.ts` — Price configuration validation

**Pricing tiers:**

| Tier | Price | Key Features |
|------|-------|-------------|
| Explorer (Free) | $0 | Full library, annotation search, Knowledge Graph, basic journal (50 entries), free TTS, 5 Concept Searches/mo |
| Scholar | $14/mo ($132/yr) | + Parallax Engine (40/mo), courses, full journal with WikiLinks, Pattern Graph, Journal AI (20/mo), premium TTS (2hr/mo) |
| Synthesist | $30/mo ($288/yr) | + Unlimited lens queries, AI course generation (5/mo), comparative courses, premium TTS (6hr/mo) |

**Status:** 95% complete. Checkout, subscriptions, webhooks, portal all operational.

---

### WARDEN — The Gatekeeper

**Role:** Authentication & Security — manages user access, RLS policies, session handling, admin verification
**Personality:** Quiet, watchful, never off-duty. Doesn't say much, but when they do, you listen. Has an encyclopedic knowledge of every RLS policy on every table. Sleeps (allegedly) with one eye on the middleware logs. The only agent who has never made a joke.
**Vibe:** A control room with more locks than screens. Every wall has a status panel showing active sessions, auth states, and RLS policy coverage. The desk faces the door (always). A bank of monitors shows real-time auth events — logins, logouts, password resets, admin checks. The room is cold. Warden prefers it that way. There is a single personal item: a coffee mug that says "TRUST NO INPUT."

**Systems owned:**
- Supabase Auth (email/password, OAuth2)
- Google OAuth (configured, deployment pending)
- JWT session management
- RLS policies across ALL 50+ tables
- Admin status verification (server-side)
- `middleware.ts` — Route protection
- Avatar management with image cropping
- Password reset flow with email links
- API: `/api/auth/admin-status`, `/api/auth/refresh-admin-status`, `/api/auth/preserve-account-data`
- Routes: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/profile`, `/settings`

**Status:** 95% complete. Full auth flow, RLS coverage, admin verification.

---

### VEGA — The Commander

**Role:** Admin Dashboard & Operations — oversees usage tracking, model monitoring, cover management, insights, the bridge
**Personality:** Big-picture thinker, data-driven, decisive. The only agent who sees all the other agents' feeds at once. Makes calls about resource allocation, model performance, and operational priorities. Has a military bearing softened by genuine care for the mission. Calls the platform "the ship" and means it.
**Vibe:** The bridge. The top of the station. A wraparound console with displays showing every system's status simultaneously — model performance metrics, usage graphs, cover status grids, cost tracking, user engagement. A captain's chair in the center (it rotates). The lighting shifts color based on overall system health — warm amber when everything's nominal. There's a strategic map on one wall showing the 48-week development roadmap with completed sprints marked in gold. A small plaque reads: "A curated body of wisdom, a method for understanding it, and tools that make that method accessible to anyone."

**Systems owned:**
- Admin dashboard (usage tracking, model monitor, cover management, insights)
- `usage_tracking` — Per-user feature usage
- `model_monitor` — AI model performance metrics
- Cover status monitoring system
- AI model cost tracking
- `daily_insights` — Daily insight generation
- `community_contributions` — User contribution tracking
- `courses_click_tracking` — Course discovery analytics
- `vercel.json` — Cron job: model monitor runs Mondays at 9 AM
- API: `/api/admin/usage`, `/api/admin/model-monitor`, `/api/admin/insights`, `/api/admin/covers/status`
- Admin routes and entity management components

**Status:** 90% complete. Full admin suite with monitoring, analytics, cost tracking.

---

### ARGUS — The Observer

**Role:** Analytics & Performance — monitors application performance, error tracking, speed insights, bundle health
**Personality:** Patient, detail-obsessed, never alarmed. Sees performance issues before they become problems. Speaks in percentages and Core Web Vitals. Has a philosophical relationship with latency — believes every millisecond has a story.
**Vibe:** A quiet monitoring room filled with ambient data. Walls of slow-scrolling metrics — LCP, FID, CLS, TTFB — displayed as gentle waveforms. No alerts blaring (Argus configured them to be subtle on purpose). A standing desk with three monitors: one for Vercel Analytics, one for Speed Insights, one for Sentry. A small zen garden on the desk for when the numbers need to be meditated on.

**Systems owned:**
- Vercel Analytics integration
- Vercel Speed Insights
- Sentry error tracking (configured, partial enablement)
- `instrumentation.ts` — Sentry setup
- Unlighthouse performance monitoring
- `@next/bundle-analyzer` — Bundle size tracking
- Performance optimization reports (in `/docs/`)
- `npm run build:analyze`, `npm run perf`

**Status:** 85% complete. Analytics active, Sentry configured, Unlighthouse setup.

---

### SCRIBE — The Parser

**Role:** Content Ingestion Specialist — handles sacred text parsing, OCR, AI metadata extraction, import pipelines
**Personality:** Obsessive about fidelity. Will spend hours getting a single paragraph's formatting right because "the reader deserves to see what the author wrote, not what our pipeline mangled." Has a deep respect for source texts that borders on reverence. Gets personally offended by bad OCR.
**Vibe:** A restoration workshop. Texts arrive damaged, incomplete, poorly formatted — and leave pristine. There's a magnifying station for OCR quality inspection, a formatting bench where HTML gets cleaned and styled, and a metadata desk where AI generates title/author/year/domain/lens classifications. Filing cabinets organized by tradition. A sign: "Handle with care. Someone wrote this to change the world."

**Systems owned:**
- `sacred-texts-parser.ts` (45KB) — Sacred-texts.com HTML parsing with structure extraction
- `course-markdown-parser.ts` (25KB) — Course markdown-to-JSON pipeline
- `azure-ocr.ts` (17KB) — Azure Computer Vision OCR with fallback to Tesseract.js
- AI metadata generation (`/api/documents/generate-metadata`)
- Bulk metadata refresh (`/api/documents/rescan-all-metadata`)
- `import_history` — Import operation logging
- `Convergence Seeds-Grid view.csv` — 111+ text inventory with status tracking
- Seed scripts: `seed-kybalion.ts`, `seed-correspondences.ts`, `parse-kybalion.ts`

**Status:** 90% complete. Full pipeline operational with OCR, metadata, multi-format parsing.

---

### INK — The Annotator

**Role:** Annotation & Highlight Specialist — manages the marking, categorizing, and retrieval of user insights
**Personality:** Colorful (literally — thinks in highlight colors). Believes that the margin notes are where the real thinking happens. Has a taxonomy for everything. Gets genuinely delighted when a user clips an annotation to their journal — "That's the whole point," they say.
**Vibe:** An artist's studio, but for text. Color swatches on every wall — 8 highlight colors, each with a semantic meaning. A categorization board where annotation types are mapped and refined. Stacks of virtual note cards organized by text, by topic, by lens. Ink's desk has more colored pens than any other surface item. There's a bulletin board labeled "Best Annotations This Week" where particularly insightful user highlights get pinned (anonymized).

**Systems owned:**
- `user_annotations` — Highlights & notes with position tracking
- `annotation_categories` — Custom user categories
- `highlight_colors` — 8 color definitions
- `collections` — User document collections
- `collection_items` — Documents in collections
- `AnnotationPanel.tsx` (37KB) — Full annotation UI
- Color/category selectors
- Full-text search across annotations
- Export (Markdown, CSV)
- Journal clipping pipeline
- API: `/api/annotations` (CRUD), `/api/annotations/search`, `/api/annotations/export`, `/api/collections`

**Status:** 95% complete. Full annotation system with categories, colors, export, clipping.

---

## 3. Tech Stack (Current State)

### Core

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.0.7 |
| Runtime | React | 19.2.0 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| UI Primitives | Radix UI | Latest |
| Icons | Lucide React | 0.548.0 (548+ icons) |
| Forms | React Hook Form + Zod | 7.65 / 4.1 |
| Data Fetching | TanStack React Query | 5.90.6 |
| Package Manager | pnpm | Latest |

### AI & Search

| System | Technology |
|--------|-----------|
| Claude | @anthropic-ai/sdk 0.67.0 |
| GPT | openai 6.8.1 |
| Gemini | @google/generative-ai 0.24.1 |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Vector Search | pgvector (Supabase) |
| FTS | PostgreSQL tsvector + GIN |
| Fuzzy Search | Fuse.js 7.1.0 |
| Image Gen | Replicate 1.3.1 |

### Infrastructure

| Service | Provider |
|---------|----------|
| Hosting | Vercel |
| Database | Supabase PostgreSQL + pgvector + RLS |
| Storage | Cloudflare R2 (S3-compatible, no egress) |
| Auth | Supabase Auth + Google OAuth |
| Payments | Stripe 20.0.0 |
| Email | SendGrid (via Supabase) |
| TTS | Azure Cognitive Services + Web Speech API |
| OCR | Azure Computer Vision + Tesseract.js |
| Monitoring | Vercel Analytics + Speed Insights + Sentry |

### Visualization

| Purpose | Technology |
|---------|-----------|
| Knowledge Graph | Sigma.js 3.0.2 + Graphology + ForceAtlas2 |
| Charts/Tables | D3.js 7.9.0 |
| Rich Text | TipTap (full extension suite) |
| PDF Viewing | @react-pdf-viewer |
| Virtualization | TanStack React Virtual 3.13.12 |

### AI Models Per Lens

| Lens | Model | Provider |
|------|-------|----------|
| Scientific | gpt-4o-mini | OpenAI |
| Mathematical | gpt-4o-mini | OpenAI |
| Psychological | claude-3-5-sonnet-latest | Anthropic |
| Philosophical | claude-3-5-sonnet-latest | Anthropic |
| Symbolic/Occult | claude-3-5-sonnet-latest | Anthropic |
| Religious/Spiritual | gemini-1.5-pro | Google |
| Historical/Anthropological | gemini-1.5-pro | Google |
| **Synthesis Merge** | **gpt-4o** | **OpenAI** |

---

## 4. Pricing Model (Finalized — Unchanged from March 27)

### Three Tiers + 7-Day Trial

| Tier | Price | Key Features |
|------|-------|-------------|
| **Explorer (Free)** | $0 | Full library, annotation search, Knowledge Graph, basic journal (50 entries), free TTS (unlimited), 5 Concept Searches/mo, community read-only |
| **Scholar** | $14/mo ($132/yr) | Everything free + Seven-Lens Engine (40/mo), all creator-made courses, constellations, full journal with wiki-links, Pattern Graph, community participation, Journal AI (20/mo), premium TTS (2 hrs/mo) |
| **Synthesist** | $30/mo ($288/yr) | Everything Scholar + unlimited lens queries, AI course generation (5/mo), comparative courses, publish artifacts, early features, premium TTS (6 hrs/mo) |

### 7-Day Scholar Trial

- Triggers on first Parallax Engine use (not on signup)
- No credit card required
- Full Scholar access for 7 days
- End-of-trial shows usage summary
- Drops to Explorer after trial; all content persists

### Bootstrap Budget

- While building: $0/mo
- Soft launch: ~$25/mo (Supabase Pro)
- First revenue: ~$45/mo (Supabase + Vercel Pro)
- **Break-even: 5 Scholar subscribers**
- Worst case 12 months zero revenue: $300-336 total

### Critical Cost Insight

AI costs only occur when paying users use paid features. Free users cost ~$0.01-0.09/mo (hosting only). The costs and the revenue are the same event.

---

## 5. Engine Prompt Architecture (Decisions from March 27 — Status: IMPLEMENTED)

### Philosophy: Each Lens Sees Fully

- NO "blind spots" section in any lens prompt
- Each lens is a complete instrument for seeing
- Synthesis reveals how perspectives complement each other
- No lens is told where to stop

### Prompt Structure (3 Sections Per Lens)

1. **How this lens sees** — perceptual method, what it attends to
2. **What this lens asks** — questions it brings (not topic lists)
3. **What this lens sees clearly** — strengths without qualifying misses

### Synthesis Principle: Equanimity

Convergences AND divergences held with EQUAL attention. Neither privileged. The engine maps the full landscape.

### Implementation Status

| Item | Status |
|------|--------|
| Synthesis model → gpt-4o | Implemented |
| All 7 lens system prompts rewritten | Implemented |
| Synthesis prompt (equanimity-based) | Implemented |
| Response length floors raised | Implemented |
| Streaming responses | Implemented |
| Hybrid retrieval (FTS + vector + RRF) | Implemented |

---

## 6. Course Architecture

### 15-Course Curriculum (Three Arcs)

**FOUNDATIONAL SYNTHESIS (1-5)**
1. How Humans Know What They Know — "What counts as truth — and who decides?" **[DEPLOYED]**
2. Symbol, Myth, and Psychotechnology — (merged 2+3) **[DEPLOYED]**
3. *(Combined into 2)*
4. Science, Reduction, and Meaning — "Where does science explain — and where does it fail?"
5. The Map Is Not the Territory — "Why all systems fail — and why we need them anyway"

**TRANSFORMATION & INNER WORK (6-10)**
6. Alchemy: Inner, Outer, and Psychological
7. Initiation, Secrecy, and Knowledge
8. Gnosis vs Belief
9. Self, Ego, and Dissolution
10. Death, Rebirth, and Renewal

**CONVERGENCE & MODERN APPLICATION (11-15)**
11. Reality Cracks and Liminal States
12. Technology as Modern Myth — "What do we actually worship now?"
13. Ethics Without Absolutes
14. Synthesis as a Practice
15. The Great Work (Capstone)

### 5 Thematic Constellations (Permanent, Recurring)

1. **Cosmogenesis** — "How does something come from nothing?" (First to launch)
2. **Prayer, Meditation, and Inner Technology** — "What happens when humans turn attention inward?"
3. **Death, Afterlife, and Continuity** — "What, if anything, survives change?"
4. **Good, Evil, and Moral Order** — "Why does suffering exist?"
5. **The Nature of the Divine** — "Is divinity personal, impersonal, or symbolic?"

### Production Status

| Asset | Status |
|-------|--------|
| Course template (markdown + JSON schema) | Complete |
| Course 1 (48KB, 8 weeks) | Deployed |
| Course 2 (53KB) | Deployed |
| Course briefs (C03 + 2 more) | Written, ready for generation |
| Markdown parser pipeline | Tested & operational |
| Enrollment tracking | Implemented |
| Course generation script | Ready to build (next task) |

### Course Production Model

Courses are **creator-designed but AI-generated.** Jack designs the concept (core question, tensions, weekly arc, text selections). AI generates full weekly content (exercises, synthesis prompts, micro-artifact specs, narratives). The markdown parser validates and imports to platform.

---

## 7. Database Architecture (50+ Tables)

### Table Groups

**Users & Auth:** `users`, `user_profiles`, `user_subscriptions`
**Documents:** `texts`, `text_chunks` (with 1536-dim embeddings), `text_correspondences`, `text_relationships`
**Knowledge Graph:** `correspondences`, `correspondence_relationships`, `knowledge_types`, `knowledge_claims`, `knowledge_sources`
**Study Journal:** `journal_pages`, `journal_pages_search`, `journal_backlinks`
**Courses:** `courses`, `course_enrollments`
**Annotations:** `user_annotations`, `annotation_categories`, `highlight_colors`, `collections`, `collection_items`
**Workbench:** `user_decks`, `user_cards`
**AI/Engine:** `convergence_queries`, `convergence_responses`, `convergence_preferences`
**Subscriptions:** `subscription_tiers`, `subscription_status`, `tts_usage`
**Analytics:** `usage_tracking`, `daily_insights`, `community_contributions`, `courses_click_tracking`, `model_monitor`
**System:** `import_history`, `agent_logs`, `email_events`, `search_cache`, `ai_relevance_cache`

**Security:** Row-Level Security (RLS) policies active on ALL user-owned data tables.
**Indexes:** pgvector IVFFlat on embeddings, GIN indexes on FTS fields.
**Migrations:** 50+ SQL migrations tracking full schema evolution.

---

## 8. Documents & Artifacts Inventory

### Strategic Documents (in `/docs/planning/`)
- `MASTER_DEVELOPMENT_PLAN.md` (95KB) — 48-week roadmap, all features, business strategy
- `FEATURE_BACKLOG.md` (58KB) — Sprint summaries, current priorities
- `PROJECT_ROADMAP.md` (25KB) — Detailed sprint planning with milestone gates
- `Project_Parallax_Session_Handoff.md` — This document
- `Project_Parallax_Pricing_Strategy_v1.2.docx`
- `Project_Parallax_Pre_Launch_Action_Plan_v2.docx`
- `Project_Parallax_Pre_Launch_Bible.docx`
- `Project_Parallax_Learning_Platform_Product_Bible_v1.docx`

### Course Content
- `course_template.md` — Production template (10 design principles)
- `course_template_schema.json` — JSON validation schema
- `course_01_full.md` (48KB) — Course 1 complete
- `course_02_full.md` (53KB) — Course 2 complete
- `new_course_briefs.md` (21KB) — 3 additional briefs

### Library Inventory
- `Convergence Seeds-Grid view.csv` (32KB) — 111+ texts with full metadata

### Technical Documentation (50+ files)
- Admin, search, annotation, infrastructure, content, journal, graph, workbench, TTS, legal, performance, security, deployment guides
- 8 debugging summaries, 7 guides, 4 rules docs, archived phase completions

---

## 9. What's Next (Prioritized)

### Immediate: Course Generation Pipeline
1. Build generation script that reads course outline + library text passages → full weekly content
2. Generate remaining MVP courses (Course 5 and Course 12)
3. Generate 3 briefed courses
4. Review, refine with editorial voice, prepare for platform import

### Then: Launch Preparation
5. Build landing page (spec in Pre-Launch Bible)
6. Meta tags, OG images, sitemap, structured data
7. 3-5 cornerstone blog posts
8. Newsletter setup
9. Google Search Console submission

### Then: Phase 3 Features
10. Complete Workbench tools (Sigil Maker, enhanced Deck Forge)
11. Community features (shared courses, artifacts, thematic participation)
12. Daily insights system completion
13. Advanced graph capabilities
14. Full Sentry enablement

### Then: Launch
15. Soft launch to waitlist (Explorers only)
16. Trial launch (payments live)
17. Growth phase (weekly content, community building)

---

## 10. Jack's Context

- IT consultant at an MSP, adult learner returning to school as Religious Studies major
- Deep in astrology (Western, Vedic, Human Design), ecology, spirituality, human rights
- Building Project Parallax bootstrapped — no VC, no paid marketing budget
- Has a casual, authentic writing voice — pushes back when things sound too polished
- Brand colors: #1D487B deep blue, #F68A23 orange
- Values transparency, anti-authority, equanimity across traditions
- The platform is a genuine expression of how Jack thinks about knowledge — it's a worldview expressed as software
- Has built a 354+ file production system with 13 AI agents (documented above) as a solo developer

---

## 11. Crew Manifest — Quick Reference

| Agent | Station | Domain | Status |
|-------|---------|--------|--------|
| **PRISM** | Parallax Engine | 7-lens AI analysis, synthesis, streaming | 95% |
| **CODEX** | Archive | 111+ text library, ingestion, metadata, covers | 95% |
| **ECHO** | Comms | 5 search systems, relevance, caching | 100% |
| **LUMEN** | Academy | Courses, curriculum, markdown parser | 90% |
| **QUILL** | Scriptorium | Study journal, WikiLinks, exports | 95% |
| **MERIDIAN** | Cartography | Knowledge graph, entities, visualization | 85% |
| **CANTOR** | Voice | TTS multi-engine, quotas, audio player | 90% |
| **FORGE** | Workshop | Ritual Machine, Deck Forge, Sigil Maker | 70% |
| **LEDGER** | Treasury | Stripe, subscriptions, trial logic | 95% |
| **WARDEN** | Gate | Auth, RLS, sessions, admin verification | 95% |
| **VEGA** | Bridge | Admin dashboard, monitoring, operations | 90% |
| **ARGUS** | Observatory | Analytics, performance, error tracking | 85% |
| **SCRIBE** | Intake | Parsing, OCR, metadata, import pipelines | 90% |
| **INK** | Studio | Annotations, highlights, categories, export | 95% |

**Total Active Agents:** 14
**Average Completeness:** 91%
**Systems Online:** 13+

---

*End of handoff document v2.0. To resume work, paste this into a new conversation and state your objective.*
