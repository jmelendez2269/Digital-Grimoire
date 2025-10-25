# Software Development Plan

Status: Active
Type: Permanent Note
Projects: Digital Grimoire  (https://www.notion.so/Digital-Grimoire-293e5ca9a61b80f2826febf7a99f5f00?pvs=21)
Creation Date: October 22, 2025

## AWS-Aligned Full Vision + MVP Phasing

---

## Executive Summary

**Purpose:** Build the "Digital Grimoire Library": a living, AI-assisted knowledge platform that preserves esoteric texts, transforms correspondence tables into a navigable graph, and gives every user a private Personal Grimoire workspace—bridging scholarship and practice.

**Problem:** Esoteric knowledge is scattered across static PDFs, rare archives, and shallow consumer apps; search is brittle, metadata inconsistent, and there's no unified workspace for research + practice.

**Vision:** A definitive "Library of Alexandria for esoteric wisdom," powered by a Multi-Lens AI that answers through scientific, psychological, philosophical, religious/spiritual, historical/anthropological, and symbolic/occult lenses.

**Business Alignment:** Freemium SaaS (open public library + premium AI features); community growth sustained by a staged, compliance-minded Create Coin contribution economy.

---

## System Architecture Overview

### Core Modules

### Frontend Web App (Public & Authenticated)

- **Library Explorer** - Full-text search, filters by taxonomy
- **Correspondence Graph** - Visual + table views with clickable nodes
- **Personal Grimoire** - Private notes, clippings, ritual builder with Tiptap editor
- **Ritual Inventory System** - Personal inventory of magical tools/ingredients with AI-powered ritual suggestions *(NEW)*
- **Admin/Moderator Console** - Ingestion, validation, curation workflow

### Backend API Layer

- **Content Services** - Documents, pages, media
- **Metadata/Taxonomy Services** - Validation, transforms
- **Graph Services** - Relationships, queries (Neptune Gremlin API)
- **Search/RAG Orchestration** - Embedding, retrieval, lens routing
- **Inventory & Recipe Engine** - Match user items to ritual requirements *(NEW)*
- **AuthN/AuthZ** - RBAC with fine-grained permissions

### Data Layer

- **Relational Store** - Canonical metadata, users, roles, audit logs (Supabase PostgreSQL)
- **Object Store** - PDFs, scans, images, OCR outputs (AWS S3 + Glacier)
- **Vector Store** - Embeddings for search, RAG (pgvector in Postgres initially, Qdrant later)
- **Graph Store** - Correspondences & links (Amazon Neptune with Gremlin API)

### AI Services

- **OCR Pipeline** - AWS Textract (1,000 pages/month free tier)
- **Auto-Classification** - Taxonomy validation, auto-tagging
- **Multi-Lens AI** - Lens-aware retrieval & answer composition
- **Ritual Recommender** - Match inventory to rituals, suggest alternatives *(NEW)*
- **Recommendations** - Related passages, rituals, correspondences

### Workflow/Automation

- **n8n Orchestrations** - Ingestion → OCR → Classify → Metadata QA → Publish
- **AWS Lambda Triggers** - S3 events, async processing
- **Contribution & Review Loops** - Points → later tokenization

### Observability & Ops

- **CloudWatch** - Logging, tracing, metrics
- **Feature Flags** - Gradual rollout
- **A/B Testing** - User experience optimization

---

## Integration of Taxonomy & Metadata

**Ingress Validators** enforce Document Type Classification Taxonomy for every item; missing fields flagged as "incomplete" and routed for human curation per the Metadata & Source Documentation Guidelines.

**Unified Schema** ensures consistent keys:

- `title`, `type`, `author`, `year`, `publisher`, `license`
- `domain`, `confidence`, `tags`, `associated_names`
- `source_url`, `mime_type`, `ritual_components` *(NEW)*

---

## Recommended Tech Stack (AWS Migration)

| Layer | Choice | Why | Free Tier |
| --- | --- | --- | --- |
| **Frontend** | Next.js 14 (React) | SEO, SSR/ISR for libraries; strong ecosystem | Vercel free hosting |
| **Auth + DB** | Supabase (Postgres) | SQL + JSONB for flexible metadata; built-in auth, RLS | 500 MB + 50k MAU free |
| **Object Storage** | AWS S3 + Glacier | Cost-effective, CDN backed, signed URLs, archiving | 5 GB + 20k GET/2k PUT free |
| **Vector DB** | pgvector (in Postgres) | Simple ops now; swap to Qdrant as traffic scales | Included in Supabase |
| **Graph DB** | Amazon Neptune (Gremlin) | First-class graph queries for correspondences; GraphRAG | 750 hrs t3.medium free |
| **Search** | Hybrid (Postgres FTS + vector) | Mix keyword + semantic for robust recall/precision | Included |
| **AI Runtime** | Claude API + GPT-4 | Managed, scalable; model agility. Lens-orchestrated | Pay-per-use (~$5/mo MVP) |
| **OCR** | AWS Textract | Industrial OCR for historical scans; language packs | 1,000 pages/mo (3 months) |
| **Automation** | AWS Lambda | Async processing, S3 triggers, queue handling | 1M invocations free |
| **Orchestration** | n8n (self-hosted) | No-code/low-code workflows; human-in-the-loop | EC2 t2.micro 750 hrs free |
| **CI/CD** | GitHub Actions + Turborepo | Monorepo dev-ex; previews; infra as code | Free for public repos |
| **Hosting** | Vercel (web) + AWS/Supabase (data) | Simplicity + scale; edge caching | Vercel hobby free |

The stack directly supports the four pillars (Public Library, Correspondence Tables, Personal Grimoire, Ritual Inventory) and the Multi-Lens AI engine.

---

## The Four Pillars (Updated)

### 1. The Public Library

**Foundational layer:** Main collection of digitized texts.

**Features:**

- Growing collection of books, manuscripts, papers
- AWS Textract OCR for full-text search
- Browse by criteria, save pages to personal collections
- Advanced filtering by type, domain, confidence, license

**Content Strategy:**

- Initial: Public domain Western esotericism (Agrippa, Dee, Golden Dawn)
- Licensed works from contemporary scholars (e.g., Stephen Skinner's *Complete Magician's Tables*)

### 2. The Correspondence Tables

**Living encyclopedia:** Interactive knowledge graph of magical relationships.

**Features:**

- Explore connections (Venus → Copper → Rose → Netzach)
- Clickable nodes with deep info, images, ritual links
- Visual mind-map + sortable table views
- Graph powered by Amazon Neptune (Gremlin API)

### 3. The Personal Grimoire

**Private workspace:** Digital "book of shadows."

**Features:**

- **Tiptap Rich Text Editor** - Full-featured, Notion-like experience
- Clip passages from public library
- Write personal notes, organize rituals
- Interlinked entries with backlinks
- **Export System:**
    - Markdown (universal)
    - HTML (styled)
    - PDF (print-ready)
    - Notion-compatible Markdown (easy import)
- **Future:** Paid bi-directional Notion sync ($10-20/mo)

### 4. The Ritual Inventory System *(NEW PILLAR)*

**Personal magical toolkit:** Track owned items and get AI-powered ritual suggestions.

**Features:**

- **Inventory Management:**
    - Add items with categories: herbs, crystals, metals, candles, incense, tools, etc.
    - Properties: quantity, quality, condition, acquisition date, notes
    - Photos and custom tags
    - Organization by element, planet, purpose
- **AI Ritual Matcher:**
    - "What can I do with what I have?" - AI suggests complete rituals based on inventory
    - "I want to do X ritual" - AI checks inventory, tells you what you have/need
    - Alternative ingredient suggestions based on correspondences graph
    - Substitution recommendations (e.g., "No rose quartz? Use pink candle + copper")
- **Recipe Builder:**
    - Browse ritual templates from library
    - Filter by available ingredients
    - Save custom ritual variations
    - Shopping list generator for missing items
- **Integration:**
    - Links to correspondence tables for each item
    - Deep integration with Neptune graph for intelligent substitutions
    - Historical context from library for traditional vs. modern uses

**Example User Flow:**

```
User: "I want to do a love ritual"
AI: "Based on your inventory, I found 3 rituals you can do:
  ✅ Venus Attraction Ritual (you have: rose petals, copper, pink candle)
  ⚠️ Aphrodite Invocation (you have 4/6 items - need: myrrh, seashell)
  ❌ Netzach Pathworking (missing: rose quartz, emerald, rose oil)"

User: "Show me the Venus ritual"
AI: [Displays ritual with your items highlighted, plus historical sources]

```

---

## Data Layer & Metadata Framework

### Canonical JSON Schema

```json
{
  "id": "doc_000123",
  "type": "book_esoteric",
  "title": "Three Books of Occult Philosophy",
  "author": ["Heinrich Cornelius Agrippa"],
  "year": 1533,
  "publisher": "—",
  "license": "public-domain",
  "mime_type": "pdf",
  "domain": ["occult", "hermeticism"],
  "confidence": "established",
  "source_url": "https://…",
  "tags": ["planetary-magic", "agrippa"],
  "associated_names": ["John Dee"],
  "ritual_components": {
    "herbs": ["sage", "rosemary"],
    "stones": ["amethyst"],
    "tools": ["wand", "chalice"]
  },
  "ingest": {
    "checksum": "sha256…",
    "ocr_version": "aws-textract:202510",
    "pipeline": ["upload","ocr","paginate","classify","embed","publish"]
  }
}

```

### Storage Strategy (Hybrid AWS)

**Supabase PostgreSQL:**

- Canonical metadata tables
- User accounts, RBAC, contribution points
- User inventory items
- Ritual recipes and templates
- JSONB for flexible per-type fields

**AWS S3:**

- Original scans, page images, PDFs
- Derived OCR text
- User-uploaded grimoire attachments
- Lifecycle: Standard → Infrequent Access (30d) → Glacier Deep Archive (90d)

**pgvector (in Postgres):**

- Embeddings per page/chunk for semantic search
- Lens RAG retrieval

**Amazon Neptune (Gremlin API):**

- Correspondence entities (Planet, Sephirah, Herb, Crystal, etc.)
- Edges: `RELATES_TO`, `CO_OCCURS_WITH`, `SOURCED_FROM`, `SUBSTITUTES_FOR`
- Ritual component relationships for intelligent matching

**Search Index:**

- Hybrid FTS + vector
- Filters by `type`, `domain`, `confidence`, `license`

### Validation Pipeline

**Pre-Ingest:**

- File health check, checksum, MIME type
- Virus scan (Lambda + ClamAV)

**Schema Validation:**

- JSON Schema per document type
- Auto-reject unknown `type`
- Extract ritual components from text

**Policy Validation:**

- License compliance
- Confidence labeling
- Required keys enforced
- Human review queue for uncertain classifications

---

## AI & Automation Components

### AI Agents & Workflows

### 📥 Ingestion Agent

- AWS Textract OCR, chunking, pagination
- Language detection
- Extract title/author/year → validate schema
- Extract ritual components for inventory matching

### 🏷️ Classifier/Tagger Agent

- Maps to allowed `type`
- Suggests `domain`, `tags`, `confidence`
- Falls back to human review if score < threshold
- Identifies ritual ingredients and tools in text

### 🔍 Lens Orchestrator

- Routes questions to retrieval pipelines
- Semantic (vector) + graph (Gremlin) + keyword (FTS)
- Composes multi-lens answers with citations

### 🧪 Ritual Recommender *(NEW)*

- Matches user inventory to ritual requirements
- Queries Neptune for ingredient substitutions
- Generates shopping lists
- Suggests variations based on correspondences

### 💡 Recommender

- "Related passages"
- "Related correspondences"
- "Ritual suggestions" based on graph proximity + embeddings
- "You might also need" for inventory gaps

### ✅ Quality Guardian

- Validates metadata consistency
- Flags anomalies to moderators
- Ensures ritual component accuracy

### Suggested Models

**Embeddings:** `text-embedding-3-large` (Azure/OpenAI) for high-recall chunk embeddings

**LLM (Generation):** GPT-4 class model for lens-composed answers with strict citation scaffolding

**OCR:** AWS Textract with historical font tuning

**Ritual Matching:** Claude API for nuanced ingredient substitution reasoning

### n8n Integration Points

**Workflows:**

1. Upload → S3 → Lambda trigger → Textract OCR
2. OCR complete → Classify → Extract ritual components
3. Metadata QA → Embed → Neptune graph update
4. Publish → Notify reviewer

**Human-in-the-Loop:**

- Approval nodes for low-confidence classification
- Sensitive cultural sources review
- Ritual component verification

---

## Development Roadmap

### 🎯 MVP Phase (8-10 weeks) - FREE TIER ONLY

**Goal:** Prove core value proposition with zero infrastructure costs

**Week 1-2: Foundation**

- ✅ AWS account setup (S3, Lambda, Textract)
- ✅ Supabase project + PostgreSQL schema
- ✅ Next.js 14 initialization with App Router
- ✅ Supabase Auth configuration
- ✅ Admin portal layout
- ✅ Single file upload to S3 with Lambda trigger

**Week 3-4: Core Features**

- ✅ AWS Textract OCR pipeline
- ✅ AI metadata extraction (Claude Vision)
- ✅ Document type classifier (20 types)
- ✅ Basic public library (search + filters)
- ✅ User accounts with RBAC

**Week 5-6: Personal Grimoire V1**

- ✅ Tiptap rich text editor integration
- ✅ Clip/save passages from library
- ✅ Export system (Markdown, HTML, PDF, Notion-compatible)
- ✅ Basic note organization

**Week 7-8: Correspondence Tables V1**

- ✅ Neptune setup (within free tier)
- ✅ Basic graph visualization (D3.js)
- ✅ CRUD interface for correspondences
- ✅ Table view with sorting/filtering

**Week 9-10: Polish & Launch**

- ✅ UI/UX refinement
- ✅ Performance optimization
- ✅ Documentation
- ✅ Beta user onboarding

**MVP Deliverables:**

- Upload → OCR pipeline
- FTS + vector search
- Grimoire v0 (clip/save with exports)
- Admin ingest console
- Basic correspondence graph

**Roles:** Lead Eng, Library Science, UX

---

### 🚀 Beta Phase (8-12 weeks) - Staying Free Tier

**Goal:** Add advanced features while monitoring free tier limits

**Week 1-4: Advanced Graph**

- ✅ Full correspondence tables implementation
- ✅ Visual graph UI with force-directed layout
- ✅ Clickable nodes with deep info
- ✅ Graph + table view toggle

**Week 5-8: Metadata & Review**

- ✅ Curator dashboard
- ✅ Metadata QA workflows
- ✅ Contribution points system (off-chain)
- ✅ Bulk upload with queue (Lambda + SQS)
- *Week 9-12: Ritual Inventory System *(NEW)*
- ✅ Inventory database schema
- ✅ Add/edit/delete items UI
- ✅ Item categorization and tagging
- ✅ Photo upload for inventory items
- ✅ Basic ritual template library

**Beta Deliverables:**

- Neptune graph database fully operational
- Curator dashboard with review workflows
- Contribution points (off-chain)
- Inventory management foundation

**Roles:** Lead Eng, Library Science, Community Manager

---

### 🎨 Production Phase (6-8 weeks) - Controlled Scaling

**Goal:** Premium features that justify paid tier and infrastructure costs

**Week 1-3: Multi-Lens AI V1**

- ✅ Lens-orchestrated RAG
- ✅ Six-lens answer composition
- ✅ Citation system with confidence levels
- ✅ Streaming responses

**Week 4-5: AI Ritual Recommender**

- ✅ "What can I do?" inventory matcher
- ✅ Ritual requirement checker
- ✅ Ingredient substitution engine (Neptune queries)
- ✅ Shopping list generator

**Week 6-8: Access Controls & Billing**

- ✅ Rate limits (free vs. premium)
- ✅ Premium billing (Stripe)
- ✅ Usage analytics
- ✅ Advanced export features

**Production Deliverables:**

- Multi-Lens AI fully operational
- AI Ritual Recommender live
- Premium tier with billing
- Rate limiting system

**Roles:** Lead Eng, DevOps, Legal

---

### 🌍 Expansion Phase (Ongoing) - Revenue-Funded Growth

**Goal:** Community features, tokenization, mobile optimization

**Quarter 1:**

- ✅ Community uploads with moderation
- ✅ Create Coin (off-chain → testnet)
- ✅ Governance framework drafts
- ✅ Mobile-responsive polish

**Quarter 2:**

- ✅ Paid Notion bi-directional sync
- ✅ Advanced ritual experiment tracker
- ✅ Guild system (Alchemy, Astrology, etc.)
- ✅ Contributor framework with voting

**Quarter 3+:**

- ✅ Create Coin mainnet (compliance first)
- ✅ Public read APIs
- ✅ Partner ingestion endpoints
- ✅ Developer program with rate limits

**Expansion Deliverables:**

- Community-driven content
- Token economy (staged rollout)
- Mobile web fully optimized
- API ecosystem

**Roles:** Founder, Legal, Community, DevOps

---

## Complete Database Schema

### Core Tables (Supabase PostgreSQL)

```sql
-- Users & Auth (Supabase built-in + extensions)
create table users (
  id uuid primary key references auth.users(id),
  username text unique not null,
  role text check (role in ('reader', 'contributor', 'curator', 'admin')),
  contribution_points int default 0,
  created_at timestamptz default now()
);

-- Documents
create table docs (
  id text primary key,
  type text not null,
  title text not null,
  author jsonb,
  year text,
  publisher text,
  mime_type text not null,
  license text not null,
  domain text[] default '{}',
  confidence text,
  source_url text,
  tags text[] default '{}',
  associated_names text[] default '{}',
  s3_key text not null,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint chk_type check (type in (
    'book_esoteric','book_spiritual','book_psychology','book_science',
    'article_scholarly','anthropology','reference_table','historical',
    'mythology','medical_overview','commentary','webpage','dictionary',
    'astrology','ritual_guide','diagram','transcript','summary','speculative','misc'
  )),
  constraint chk_license check (license in ('public-domain','cc-by','all-rights-reserved')),
  constraint chk_confidence check (confidence in ('established','interpretive','speculative','tradition'))
);

-- Embeddings for semantic search
create table doc_chunks (
  id bigserial primary key,
  doc_id text references docs(id) on delete cascade,
  chunk_idx int not null,
  content text not null,
  embedding vector(1536)
);

create index on doc_chunks using ivfflat (embedding vector_cosine_ops);

-- User Grimoires (Personal Notes)
create table user_grimoires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  content jsonb, -- Tiptap JSON
  parent_id uuid references user_grimoires(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bookmarks
create table user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  doc_id text references docs(id) on delete cascade,
  page_number int,
  note text,
  created_at timestamptz default now()
);

-- Annotations
create table user_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  doc_id text references docs(id) on delete cascade,
  page_number int,
  selection jsonb, -- {start, end, text}
  annotation text,
  created_at timestamptz default now()
);

-- Ritual Inventory (NEW)
create table user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  category text not null check (category in (
    'herb', 'crystal', 'metal', 'candle', 'incense', 'tool',
    'oil', 'resin', 'wood', 'fabric', 'book', 'other'
  )),
  item_name text not null,
  quantity decimal(10,2),
  unit text, -- e.g., 'grams', 'pieces', 'ml'
  quality text, -- 'fresh', 'dried', 'powdered', etc.
  condition text,
  acquisition_date date,
  notes text,
  photo_url text,
  tags text[] default '{}',
  correspondences jsonb, -- {planets: [], elements: [], purposes: []}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on user_inventory(user_id, category);
create index on user_inventory using gin(tags);

-- Ritual Templates
create table ritual_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  purpose text,
  tradition text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  source_doc_id text references docs(id),
  required_items jsonb, -- [{category, item, quantity, alternatives: []}]
  optional_items jsonb,
  instructions jsonb, -- Tiptap JSON
  timing jsonb, -- {moon_phase, planetary_hour, season, etc.}
  safety_warnings text,
  created_at timestamptz default now(),
  is_public boolean default false
);

-- User Custom Rituals
create table user_rituals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  template_id uuid references ritual_templates(id),
  title text not null,
  content jsonb, -- Tiptap JSON with modifications
  inventory_snapshot jsonb, -- Items used at time of ritual
  performed_date timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Correspondences (metadata for graph sync)
create table correspondences (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'planet', 'element', 'sephirah', 'herb', etc.
  name text not null,
  alternate_names text[] default '{}',
  description text,
  metadata jsonb,
  neptune_vertex_id text, -- Sync with Neptune
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index on correspondences(type, name);

-- Correspondence Relationships (metadata for graph sync)
create table correspondence_relationships (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references correspondences(id) on delete cascade,
  to_id uuid references correspondences(id) on delete cascade,
  relationship_type text not null,
  strength decimal(3,2), -- 0.0 to 1.0
  source_doc_id text references docs(id),
  neptune_edge_id text,
  created_at timestamptz default now()
);

-- Contributions & Points
create table contributions (
  id bigserial primary key,
  user_id uuid references users(id),
  doc_id text references docs(id),
  action text check (action in ('upload','tag','validate','annotate','ritual_add')),
  points int default 0,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Import History
create table import_history (
  id bigserial primary key,
  user_id uuid references users(id),
  source text, -- 'csv', 'obsidian', 'notion', etc.
  status text,
  items_processed int,
  errors jsonb,
  created_at timestamptz default now()
);

-- Agent Logs
create table agent_logs (
  id bigserial primary key,
  agent_name text not null,
  action text not null,
  doc_id text references docs(id),
  status text,
  metadata jsonb,
  created_at timestamptz default now()
);

```

### Amazon Neptune Graph Schema (Gremlin)

```groovy
// Vertices (Correspondence Entities)
g.addV('Planet').property('name', 'Venus').property('domain', 'love')
g.addV('Metal').property('name', 'Copper').property('conductivity', 'high')
g.addV('Herb').property('name', 'Rose').property('part', 'petals')
g.addV('Sephirah').property('name', 'Netzach').property('number', 7)
g.addV('Crystal').property('name', 'Rose Quartz').property('hardness', 7)

// Edges (Relationships)
g.V().has('Planet','name','Venus')
  .addE('CORRESPONDS_TO').to(g.V().has('Metal','name','Copper'))
  .property('strength', 0.95)
  .property('tradition', 'hermetic')

g.V().has('Planet','name','Venus')
  .addE('CORRESPONDS_TO').to(g.V().has('Herb','name','Rose'))
  .property('strength', 0.90)

g.V().has('Herb','name','Rose')
  .addE('SUBSTITUTES_FOR').to(g.V().has('Crystal','name','Rose Quartz'))
  .property('context', 'love_ritual')
  .property('effectiveness', 0.75)

// Ritual Component Queries
g.V().has('Herb','name','Sage')
  .out('USED_IN')
  .hasLabel('Ritual')
  .values('title')

// Find Substitutes
g.V().has('Crystal','name','Amethyst')
  .out('SUBSTITUTES_FOR')
  .values('name')

```

---

## File Structure

```
digital-grimoire/
├── app/
│   ├── (admin)/
│   │   ├── upload/
│   │   ├── correspondences/
│   │   ├── library/
│   │   ├── rituals/ (manage templates)
│   │   └── dashboard/
│   ├── (user)/
│   │   ├── grimoire/
│   │   ├── inventory/ (NEW)
│   │   ├── rituals/ (personal rituals)
│   │   ├── bookmarks/
│   │   └── profile/
│   ├── api/
│   │   ├── upload/route.ts
│   │   ├── texts/route.ts
│   │   ├── correspondences/route.ts
│   │   ├── inventory/route.ts (NEW)
│   │   ├── rituals/
│   │   │   ├── match/route.ts (AI matcher)
│   │   │   ├── templates/route.ts
│   │   │   └── substitute/route.ts
│   │   ├── import/{csv,obsidian}/route.ts
│   │   ├── graph/route.ts
│   │   ├── reasoning/route.ts
│   │   └── export/route.ts (grimoire exports)
│   └── layout.tsx
├── components/
│   ├── admin/
│   │   ├── FileUploader.tsx
│   │   ├── MetadataEditor.tsx
│   │   └── RitualTemplateEditor.tsx
│   ├── grimoire/
│   │   ├── TiptapEditor.tsx
│   │   ├── ExportMenu.tsx
│   │   ├── PageTree.tsx
│   │   └── BacklinkPanel.tsx
│   ├── inventory/ (NEW)
│   │   ├── InventoryGrid.tsx
│   │   ├── AddItemModal.tsx
│   │   ├── ItemDetailPanel.tsx
│   │   └── CategoryFilter.tsx
│   ├── rituals/ (NEW)
│   │   ├── RitualMatcher.tsx
│   │   ├── RequirementsChecker.tsx
│   │   ├── SubstitutionSuggester.tsx
│   │   └── ShoppingListGenerator.tsx
│   ├── KnowledgeGraph.tsx
│   └── ui/ (shadcn/ui components)
├── lib/
│   ├── supabase.ts
│   ├── aws/
│   │   ├── s3.ts
│   │   ├── textract.ts
│   │   └── lambda-triggers.ts
│   ├── neptune/
│   │   ├── client.ts
│   │   ├── queries.ts
│   │   └── ritual-matcher.ts (NEW)
│   ├── ai/
│   │   ├── claude.ts
│   │   ├── gpt4.ts
│   │   ├── embeddings.ts
│   │   └── ritual-recommender.ts (NEW)
│   ├── export/
│   │   ├── markdown.ts
│   │   ├── html.ts
│   │   ├── pdf.ts
│   │   └── notion-format.ts
│   └── import-parsers/
│       ├── csv.ts
│       └── obsidian.ts
├── lambda/
│   ├── textract-trigger.ts
│   ├── textract-completion.ts
│   ├── metadata-processor.ts
│   ├── ritual-component-extractor.ts
│   └── ocr-pipeline.ts
└── n8n-workflows/
    ├── 01-ingest-ocr-classify.json
    ├── 02-metadata-qa.json
    ├── 03-correspondence-sync.json
    ├── 04-ritual-template-ingestion.json
    └── README.md (15 agent workflows for Phase 5)

```

---

## AWS Service Configuration

### S3 Bucket Setup

yaml

`Bucket Name: digital-grimoire-library
Region: us-east-1
Versioning: Enabled
Encryption: AES-256 (default)

Lifecycle Policy:
  - Standard Storage: 0-30 days
  - Infrequent Access: 31-90 days
  - Glacier Deep Archive: 91+ days ($0.004/GB)

CORS Configuration:
  AllowedOrigins: 
    - https://yourdomain.com
    - http://localhost:3000
  AllowedMethods: [GET, PUT, POST, DELETE]
  AllowedHeaders: ['*']

Event Notifications:
  - Event: s3:ObjectCreated:*
  - Destination: Lambda (textract-trigger)
  - Suffix: .pdf`

### Lambda Functions

### 1. textract-trigger.ts

typescript

`*// Triggered by S3 upload// Starts Textract async job// Stores job ID in Supabase*

export const handler = async (event: S3Event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  
  const job = await textract.startDocumentTextDetection({
    DocumentLocation: { S3Object: { Bucket: bucket, Name: key } }
  });
  
  await supabase.from('agent_logs').insert({
    agent_name: 'textract-trigger',
    action: 'start_ocr',
    metadata: { job_id: job.JobId, s3_key: key }
  });
};`

### 2. textract-completion.ts

typescript

`*// Triggered by Textract completion (SNS)// Extracts text and ritual components// Stores in Supabase*

export const handler = async (event: SNSEvent) => {
  const jobId = JSON.parse(event.Records[0].Sns.Message).JobId;
  
  const result = await textract.getDocumentTextDetection({ JobId: jobId });
  const text = extractFullText(result);
  const components = await extractRitualComponents(text); *// AI*
  
  await supabase.from('docs').update({
    ocr_text: text,
    ritual_components: components
  }).eq('textract_job_id', jobId);
};`

### 3. ritual-component-extractor.ts

typescript

`*// Uses Claude API to extract:// - Herbs mentioned// - Crystals/stones// - Tools needed// - Timing requirements*

export const extractComponents = async (text: string) => {
  const prompt = `Extract ritual components from this text:
  ${text}
  
  Return JSON: {
    herbs: [{name, quantity, preparation}],
    crystals: [{name, size, color}],
    tools: [{name, purpose}],
    timing: {moon_phase?, day_of_week?, planetary_hour?}
  }`;
  
  const response = await claude.complete(prompt);
  return JSON.parse(response);
};`

### API Gateway (Optional - Phase 5)

Only needed for:

- n8n webhook endpoints
- Public API for partners
- External integrations

For MVP, Next.js API routes handle everything.

### CloudWatch Alarms

yaml

`Alarms:
  - Name: S3-Storage-Warning
    Metric: BucketSizeBytes
    Threshold: 4.5 GB (90% of free tier)
    Action: SNS notification

  - Name: Lambda-Invocation-Warning
    Metric: Invocations
    Threshold: 900,000 (90% of free tier)
    Action: SNS notification

  - Name: Textract-Pages-Warning
    Metric: PageCount
    Threshold: 900 pages (90% of free tier)
    Action: SNS notification

Billing Alerts:
  - Threshold: $5
  - Threshold: $10
  - Threshold: $25`

---

## AI & Automation - Detailed Implementation

### Multi-Lens AI Architecture

### The Six Lenses

typescript

`interface Lens {
  name: string;
  systemPrompt: string;
  retrievalStrategy: 'semantic' | 'graph' | 'hybrid';
  confidenceThreshold: number;
}

const LENSES: Lens[] = [
  {
    name: 'Scientific',
    systemPrompt: 'Analyze from physics, cosmology, and biology perspective...',
    retrievalStrategy: 'semantic',
    confidenceThreshold: 0.8
  },
  {
    name: 'Psychological',
    systemPrompt: 'Interpret through Jungian psychology, cognitive science...',
    retrievalStrategy: 'semantic',
    confidenceThreshold: 0.75
  },
  {
    name: 'Philosophical',
    systemPrompt: 'Examine metaphysics, ethics, epistemology...',
    retrievalStrategy: 'semantic',
    confidenceThreshold: 0.7
  },
  {
    name: 'Religious/Spiritual',
    systemPrompt: 'Compare theological perspectives and sacred texts...',
    retrievalStrategy: 'hybrid',
    confidenceThreshold: 0.75
  },
  {
    name: 'Historical/Anthropological',
    systemPrompt: 'Trace cultural evolution, mythology, social structures...',
    retrievalStrategy: 'hybrid',
    confidenceThreshold: 0.8
  },
  {
    name: 'Symbolic/Occult',
    systemPrompt: 'Decode through astrology, alchemy, correspondence systems...',
    retrievalStrategy: 'graph',
    confidenceThreshold: 0.85
  }
];`

### Knowledge Architecture: Dual-Layer Reasoning

mermaid

`graph TB
    Query[User Query] --> Router[Lens Router]
    Router --> Semantic[Semantic Layer<br/>pgvector search]
    Router --> Graph[Graph Layer<br/>Neptune Gremlin]
    
    Semantic --> MindsDB[MindsDB Reasoning<br/>NLP over corpus]
    Graph --> Neptune[Correspondence<br/>Relationships]
    
    MindsDB --> Composer[Answer Composer]
    Neptune --> Composer
    
    Composer --> Scientific[Scientific Lens]
    Composer --> Psychological[Psychological Lens]
    Composer --> Philosophical[Philosophical Lens]
    Composer --> Religious[Religious Lens]
    Composer --> Historical[Historical Lens]
    Composer --> Occult[Occult Lens]
    
    Scientific --> Response[Multi-Lens Response<br/>with Citations]
    Psychological --> Response
    Philosophical --> Response
    Religious --> Response
    Historical --> Response
    Occult --> Response`

### Data Refinery Process

`Raw Data → OCR → Structured Data → AI Insights
   ↓          ↓           ↓              ↓
Scanned → Textract → Community → MindsDB + Neptune
  PDFs      Text      Curation     Multi-Lens AI

Value Multiplier: 1x → 5x → 25x → 100x`

### Ritual Recommender Engine (NEW)

### User Flow Examples

**Example 1: "What can I do?"**

typescript

`*// API Route: /api/rituals/match*
export async function POST(req: Request) {
  const { userId } = await req.json();
  
  *// 1. Get user's inventory*
  const inventory = await supabase
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId);
  
  *// 2. Query ritual templates*
  const rituals = await supabase
    .from('ritual_templates')
    .select('*')
    .eq('is_public', true);
  
  *// 3. Match inventory to requirements*
  const matches = rituals.map(ritual => {
    const match = calculateMatch(inventory, ritual.required_items);
    return {
      ritual,
      matchScore: match.score,
      hasAll: match.hasAll,
      missing: match.missing,
      substitutions: match.substitutions
    };
  }).filter(m => m.matchScore > 0.6)
    .sort((a, b) => b.matchScore - a.matchScore);
  
  return Response.json({ matches });
}`

**Example 2: "I want to do X ritual"**

typescript

`*// API Route: /api/rituals/check*
export async function POST(req: Request) {
  const { userId, ritualId } = await req.json();
  
  const ritual = await supabase
    .from('ritual_templates')
    .select('*')
    .eq('id', ritualId)
    .single();
  
  const inventory = await supabase
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId);
  
  *// Check what user has*
  const analysis = {
    required: checkItems(inventory, ritual.required_items),
    optional: checkItems(inventory, ritual.optional_items),
    substitutions: await findSubstitutions(
      ritual.required_items,
      inventory
    )
  };
  
  return Response.json(analysis);
}`

**Example 3: Intelligent Substitutions**

typescript

`*// Neptune Query: Find substitutes*
async function findSubstitutions(missingItem: string, context: string) {
  const query = `
    g.V().has('item', 'name', '${missingItem}')
      .union(
        out('SUBSTITUTES_FOR').where(has('context', '${context}')),
        out('CORRESPONDS_TO').out('CORRESPONDS_TO')
      )
      .dedup()
      .project('name', 'reason', 'effectiveness')
      .by('name')
      .by(coalesce(
        inE('SUBSTITUTES_FOR').values('reason'),
        constant('shares correspondence')
      ))
      .by(coalesce(
        inE('SUBSTITUTES_FOR').values('effectiveness'),
        constant(0.7)
      ))
      .order().by('effectiveness', desc)
      .limit(5)
  `;
  
  return await neptuneClient.execute(query);
}`

### AI-Powered Alternative Suggestions

typescript

`*// Uses Claude for nuanced reasoning*
async function suggestAlternatives(
  missingItems: string[],
  ritual: Ritual,
  inventory: InventoryItem[]
) {
  const prompt = `A user wants to perform this ritual:
  
  Ritual: ${ritual.title}
  Purpose: ${ritual.purpose}
  Missing items: ${missingItems.join(', ')}
  
  Available inventory:
  ${inventory.map(i => `- ${i.item_name} (${i.category})`).join('\n')}
  
  Based on esoteric correspondences and the ritual's intent, suggest:
  1. Items from their inventory that could substitute
  2. Explanation of why the substitute works
  3. Any modifications needed to the ritual
  4. Effectiveness rating (0-1)
  
  Return JSON array of suggestions.`;
  
  const response = await claude.complete(prompt);
  return JSON.parse(response);
}`

### n8n Workflow Integration

### Complete Ingestion Pipeline

json

`{
  "name": "Complete_Document_Ingestion_Pipeline",
  "nodes": [
    {
      "id": "webhook_trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "ingest/upload",
        "method": "POST"
      }
    },
    {
      "id": "virus_scan",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// ClamAV integration or pass-through for MVP"
      }
    },
    {
      "id": "upload_to_s3",
      "type": "n8n-nodes-base.aws.s3",
      "parameters": {
        "bucket": "digital-grimoire-library",
        "fileName": "={{$json.filename}}"
      }
    },
    {
      "id": "wait_for_textract",
      "type": "n8n-nodes-base.wait",
      "parameters": {
        "resume": "webhook",
        "webhookPath": "textract-complete"
      }
    },
    {
      "id": "classify_document",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "model": "gpt-4",
        "prompt": "Classify this document into one of 20 types and extract metadata..."
      }
    },
    {
      "id": "extract_ritual_components",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "model": "claude-3-opus",
        "prompt": "Extract all ritual components: herbs, crystals, tools, timing..."
      }
    },
    {
      "id": "validate_schema",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// JSON Schema validation against document type"
      }
    },
    {
      "id": "human_review_check",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json.confidence_score}}",
              "operation": "smaller",
              "value2": 0.85
            }
          ]
        }
      }
    },
    {
      "id": "manual_approval",
      "type": "n8n-nodes-base.manualApproval",
      "parameters": {
        "message": "Low confidence classification - please review"
      }
    },
    {
      "id": "generate_embeddings",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "model": "text-embedding-3-large",
        "resource": "embedding"
      }
    },
    {
      "id": "upsert_metadata",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "upsert",
        "table": "docs"
      }
    },
    {
      "id": "upsert_chunks",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "table": "doc_chunks"
      }
    },
    {
      "id": "update_neptune_graph",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "{{$env.NEPTUNE_ENDPOINT}}/gremlin",
        "body": "// Gremlin query to add vertices/edges"
      }
    },
    {
      "id": "publish_document",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "update",
        "table": "docs",
        "updateFields": {
          "status": "published"
        }
      }
    },
    {
      "id": "award_contribution_points",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "table": "contributions"
      }
    },
    {
      "id": "notify_curators",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "curators@grimoire.app",
        "subject": "New document published"
      }
    }
  ],
  "connections": {
    "webhook_trigger": { "main": [[{ "node": "virus_scan" }]] },
    "virus_scan": { "main": [[{ "node": "upload_to_s3" }]] },
    "upload_to_s3": { "main": [[{ "node": "wait_for_textract" }]] },
    "wait_for_textract": { "main": [[{ "node": "classify_document" }]] },
    "classify_document": { "main": [[{ "node": "extract_ritual_components" }]] },
    "extract_ritual_components": { "main": [[{ "node": "validate_schema" }]] },
    "validate_schema": { "main": [[{ "node": "human_review_check" }]] },
    "human_review_check": { 
      "main": [
        [{ "node": "manual_approval" }],
        [{ "node": "generate_embeddings" }]
      ] 
    },
    "manual_approval": { "main": [[{ "node": "generate_embeddings" }]] },
    "generate_embeddings": { "main": [[
      { "node": "upsert_metadata" },
      { "node": "upsert_chunks" }
    ]] },
    "upsert_metadata": { "main": [[{ "node": "update_neptune_graph" }]] },
    "upsert_chunks": { "main": [[{ "node": "publish_document" }]] },
    "update_neptune_graph": { "main": [[{ "node": "publish_document" }]] },
    "publish_document": { "main": [[
      { "node": "award_contribution_points" },
      { "node": "notify_curators" }
    ]] }
  }
}`

---

## Security & Ethics

### Privacy by Default

**Personal Grimoire:**

- Private by default, encrypted at rest
- Explicit opt-in for any analytics
- "Minimum viable data" principle
- Users can export and delete all data

**Inventory System:**

- Never shared unless user explicitly publishes ritual
- No tracking of what items users acquire
- Photo uploads stored in private S3 buckets with signed URLs

### Permissions (RBAC)

typescript

`enum Role {
  READER = 'reader',           *// Browse library, use free AI*
  CONTRIBUTOR = 'contributor',  *// + upload, tag, contribute*
  CURATOR = 'curator',         *// + approve, edit metadata, moderate*
  ADMIN = 'admin'              *// + system config, user management*
}

*// Row-level security in Supabase*
create policy "Users can only see their own grimoire"
  on user_grimoires for select
  using (auth.uid() = user_id);

create policy "Users can only see their own inventory"
  on user_inventory for select
  using (auth.uid() = user_id);`

### Cultural Stewardship

**Sensitive Materials Workflow:**

1. Flag documents with indigenous/sacred content
2. Require provenance documentation
3. Curator review for permissions
4. Community consultation where appropriate
5. Respect requests for content removal

**Implementation:**

sql

`alter table docs add column cultural_sensitivity text 
  check (cultural_sensitivity in ('none', 'review', 'restricted'));

alter table docs add column permission_status text 
  check (permission_status in ('public_domain', 'licensed', 'pending', 'restricted'));`

### Content Licensing

**Automated Checks:**

- Only accept public-domain or licensed works
- Uploaders must attest to rights
- Copyright detection via metadata validation
- DMCA compliance workflow

### Ethical AI

**Lens Output Requirements:**

- Must cite sources with page numbers
- Indicate confidence levels
- Avoid prescriptive "ritual advice" without disclaimers
- Include safety warnings for potentially dangerous practices

**Safety Disclaimers:**

typescript

`const SAFETY_WARNINGS = {
  fire: "⚠️ This ritual involves fire. Never leave flames unattended.",
  ingestion: "⚠️ Do not ingest any herbs without consulting a qualified herbalist.",
  psychoactive: "⚠️ This may involve altered states. Ensure you have a sober guide.",
  cultural: "⚠️ This practice has deep cultural significance. Approach with respect."
};`

---

## Testing & QA Framework

### Automated Tests

typescript

`*// Unit Tests*
describe('Schema Validation', () => {
  test('rejects unknown document type', () => {
    const doc = { type: 'invalid_type', title: 'Test' };
    expect(() => validateDocument(doc)).toThrow();
  });
  
  test('enforces required metadata keys', () => {
    const doc = { type: 'book_esoteric' }; *// missing title*
    expect(() => validateDocument(doc)).toThrow();
  });
});

*// Integration Tests*
describe('Ingestion Pipeline', () => {
  test('full OCR → classify → embed workflow', async () => {
    const file = await uploadTestPDF();
    const result = await waitForProcessing(file.id);
    
    expect(result.status).toBe('published');
    expect(result.type).toBeDefined();
    expect(result.embeddings.length).toBeGreaterThan(0);
  });
});

*// Regression Tests*
describe('Search Relevance', () => {
  test('planetary magic query returns Agrippa', async () => {
    const results = await search('planetary magic');
    expect(results[0].title).toContain('Three Books');
  });
});

*// Ritual Matcher Tests*
describe('Inventory Matching', () => {
  test('matches complete ritual requirements', async () => {
    const inventory = [
      { category: 'herb', item_name: 'Sage' },
      { category: 'candle', item_name: 'White Candle' }
    ];
    const ritual = {
      required_items: [
        { category: 'herb', item: 'Sage' },
        { category: 'candle', item: 'White Candle' }
      ]
    };
    
    const match = calculateMatch(inventory, ritual);
    expect(match.hasAll).toBe(true);
    expect(match.score).toBe(1.0);
  });
  
  test('suggests substitutions for missing items', async () => {
    const inventory = [{ category: 'crystal', item_name: 'Clear Quartz' }];
    const ritual = {
      required_items: [{ category: 'crystal', item: 'Rose Quartz' }]
    };
    
    const subs = await findSubstitutions(ritual, inventory);
    expect(subs).toContainEqual(
      expect.objectContaining({
        substitute: 'Clear Quartz',
        reason: expect.stringContaining('correspondence'),
        effectiveness: expect.any(Number)
      })
    );
  });
});`

### Metadata QA

typescript

`*// Contract Tests*
describe('Metadata Contract', () => {
  test('all documents have required keys', async () => {
    const docs = await supabase.from('docs').select('*');
    
    docs.forEach(doc => {
      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('type');
      expect(doc).toHaveProperty('title');
      expect(doc).toHaveProperty('license');
      expect(doc).toHaveProperty('confidence');
    });
  });
  
  test('type values match taxonomy', async () => {
    const docs = await supabase.from('docs').select('type');
    const allowedTypes = [*/* 20 types from taxonomy */*];
    
    docs.forEach(doc => {
      expect(allowedTypes).toContain(doc.type);
    });
  });
});

*// Drift Detection*
describe('Schema Drift Detection', () => {
  test('alerts on new undocumented keys', async () => {
    const docs = await supabase.from('docs').select('*').limit(100);
    const knownKeys = Object.keys(CANONICAL_SCHEMA);
    
    docs.forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (!knownKeys.includes(key)) {
          console.warn(`Unknown key detected: ${key}`);
        }
      });
    });
  });
});`

### Human QA

**Curator Review Queues:**

sql

- `*- Low confidence classifications*
select * from docs
where status = 'pending_review' and metadata->>'confidence_score' < '0.85'
order by created_at asc;
*- Missing required fields*
select * from docs
where title is null or license is null or confidence is null;
*- Ritual component verification*
select * from ritual_templates
where required_items is null or array_length(required_items, 1) = 0;`

**Double-Blind Sampling:**

- Random 5% of correspondences reviewed by two curators
- Discrepancies flagged for discussion
- Accuracy metrics tracked over time

---

## Deployment & Maintenance

### CI/CD Pipeline

yaml

`name: Deploy

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run test:e2e

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN}}
          vercel-args: '--prod'
      - name: Run migrations
        run: npx prisma migrate deploy`

### Infrastructure as Code

terraform

`# terraform/main.tf

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "grimoire_library" {
  bucket = "digital-grimoire-library"
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    enabled = true
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER_DEEP_ARCHIVE"
    }
  }
}

resource "aws_lambda_function" "textract_trigger" {
  filename      = "lambda/textract-trigger.zip"
  function_name = "grimoire-textract-trigger"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  
  environment {
    variables = {
      SUPABASE_URL = var.supabase_url
      SUPABASE_KEY = var.supabase_anon_key
    }
  }
}

resource "aws_s3_bucket_notification" "textract_trigger" {
  bucket = aws_s3_bucket.grimoire_library.id
  
  lambda_function {
    lambda_function_arn = aws_lambda_function.textract_trigger.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".pdf"
  }
}

# Neptune Cluster (use free tier t3.medium)
resource "aws_neptune_cluster" "grimoire_graph" {
  cluster_identifier  = "grimoire-correspondences"
  engine              = "neptune"
  skip_final_snapshot = true
  
  vpc_security_group_ids = [aws_security_group.neptune.id]
}

resource "aws_neptune_cluster_instance" "grimoire_graph" {
  cluster_identifier = aws_neptune_cluster.grimoire_graph.id
  instance_class     = "db.t3.medium"  # 750 hrs free tier
}`

### Observability

**CloudWatch Integration:**

typescript

`import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

export async function trackMetric(metricName: string, value: number) {
  const cloudwatch = new CloudWatchClient({ region: "us-east-1" });
  
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: "DigitalGrimoire",
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: "Count",
      Timestamp: new Date()
    }]
  }));
}

*// Usage*
await trackMetric("DocumentsProcessed", 1);
await trackMetric("RitualMatchesGenerated", 1);
await trackMetric("SearchQueries", 1);`

**Error Budgets:**

typescript

`const SLA_TARGETS = {
  ingest_time: 300_000,      *// 5 min max*
  search_latency: 1_000,     *// 1 sec max*
  lens_answer_time: 10_000,  *// 10 sec max*
  ritual_match_time: 3_000   *// 3 sec max*
};

*// Track against budget*
export async function trackSLA(operation: string, duration: number) {
  const target = SLA_TARGETS[operation];
  const withinSLA = duration <= target;
  
  await trackMetric(`${operation}_sla_met`, withinSLA ? 1 : 0);
  await trackMetric(`${operation}_duration`, duration);
}`

### Versioning

**Content Versioning:**

sql

- `*- Track metadata changes*
create table doc_revisions ( id bigserial primary key, doc_id text references docs(id), revision_number int not null, changed_fields jsonb, changed_by uuid references users(id), created_at timestamptz default now()
);
*- Trigger on update*
create or replace function track_doc_changes()
returns trigger as $
begin insert into doc_revisions (doc_id, revision_number, changed_fields, changed_by) values ( new.id, coalesce((select max(revision_number) + 1 from doc_revisions where doc_id = new.id), 1), jsonb_build_object( 'old', row_to_json(old), 'new', row_to_json(new) ), auth.uid() ); return new;
end;
$ language plpgsql;`

**Software Versioning:**

json

`*// package.json*
{
  "version": "0.1.0",  *// MVP*
  "version": "0.5.0",  *// Beta*
  "version": "1.0.0",  *// Production*
  "version": "1.1.0",  *// Ritual Inventory added*
  "version": "2.0.0",  *// Create Coin launch*
}`