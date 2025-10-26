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

### Sprint 3: Document Ingestion (Weeks 5-6)

#### Tasks

**File Upload UI**
- [ ] P0: Create `/admin/upload` page
- [ ] P0: Build drag-and-drop upload component (react-dropzone)
- [ ] P0: Add file validation (PDF, DOCX, size limits)
- [ ] P0: Show upload progress bar
- [ ] P1: Support batch uploads (multiple files)
- [ ] P1: Add upload queue with status
- [ ] P2: Implement resume for failed uploads

**S3 Upload Pipeline**
- [ ] P0: Create API route: `POST /api/upload`
- [ ] P0: Generate presigned S3 URLs
- [ ] P0: Upload files to S3 from browser
- [ ] P0: Store metadata in `texts` table
- [ ] P1: Generate thumbnails for PDFs
- [ ] P1: Add virus scanning (ClamAV or AWS)
- [ ] P2: Implement S3 lifecycle rules

**AWS Lambda Functions**
- [ ] P0: Create Lambda: `textract-trigger`
  - Triggered by S3 upload
  - Start Textract job
  - Log to Supabase
- [ ] P0: Create Lambda: `textract-completion`
  - Triggered by SNS
  - Retrieve OCR text
  - Update `texts.content`
- [ ] P1: Add error handling and retries
- [ ] P1: Implement dead-letter queue (DLQ)
- [ ] P2: Add CloudWatch metrics

**Metadata Extraction**
- [ ] P0: Create Claude Vision API integration
- [ ] P0: Extract: title, author, year, type
- [ ] P0: Classify into 20 document types
- [ ] P0: Update database with extracted metadata
- [ ] P1: Add human review UI for low-confidence
- [ ] P1: Implement metadata correction workflow
- [ ] P2: Train custom classifier

**Deliverables:**
- ✅ File upload interface
- ✅ S3 storage pipeline
- ✅ OCR processing with Textract
- ✅ Metadata extraction with AI

**Time Estimate:** 60 hours

---

### Sprint 4: Public Library & Search (Weeks 7-8)

#### Tasks

**Library Homepage**
- [ ] P0: Create `/library` page
- [ ] P0: Design hero section with search bar
- [ ] P0: Show featured/recent texts
- [ ] P0: Add filter sidebar (type, domain, year)
- [ ] P1: Implement tag cloud
- [ ] P1: Add "Random text" button
- [ ] P2: Create curated collections

**Document Listing**
- [ ] P0: Build document card component
  - Thumbnail
  - Title, author, year
  - Document type badge
  - Tags
- [ ] P0: Implement grid/list view toggle
- [ ] P0: Add pagination (20 per page)
- [ ] P1: Add sorting (date, title, author)
- [ ] P1: Show loading placeholders
- [ ] P2: Infinite scroll option

**Search Implementation**
- [ ] P0: Create search API: `GET /api/search?q={query}`
- [ ] P0: Implement PostgreSQL full-text search
- [ ] P0: Add filter by type, domain, year
- [ ] P0: Display search results with highlighting
- [ ] P1: Add autocomplete suggestions
- [ ] P1: Show search result count
- [ ] P2: Add advanced search (Boolean operators)

**Document Viewer**
- [ ] P0: Create `/library/[id]` dynamic route
- [ ] P0: Display full document metadata
- [ ] P0: Embed PDF viewer (react-pdf)
- [ ] P0: Show OCR text in scrollable panel
- [ ] P1: Add text selection for clipping
- [ ] P1: Implement bookmark button
- [ ] P2: Add "Cite this" button (BibTeX, APA)

**Deliverables:**
- ✅ Searchable library interface
- ✅ Document listing with filters
- ✅ Full-text search
- ✅ Document detail pages with viewer

**Time Estimate:** 55 hours

---

## PHASE 2: PERSONAL GRIMOIRE (Sprints 5-7, Weeks 9-14)

### Sprint 5: Tiptap Editor Foundation (Weeks 9-10)

#### Tasks

**Editor Setup**
- [ ] P0: Install Tiptap packages:
  - `@tiptap/react`
  - `@tiptap/starter-kit`
  - `@tiptap/extension-image`
  - `@tiptap/extension-link`
  - `@tiptap/extension-table`
  - `tiptap-markdown`
- [ ] P0: Create `TiptapEditor.tsx` component
- [ ] P0: Configure StarterKit extension
- [ ] P0: Add basic styling

**Block Types**
- [ ] P0: Text (paragraph)
- [ ] P0: Headings (H1, H2, H3, H4)
- [ ] P0: Bulleted list
- [ ] P0: Numbered list
- [ ] P0: Blockquote
- [ ] P0: Code block
- [ ] P1: Toggle list
- [ ] P1: Callout/admonition
- [ ] P2: Divider

**Slash Command Menu**
- [ ] P0: Create command menu popup
- [ ] P0: Trigger on "/" key
- [ ] P0: Filter items by typing
- [ ] P0: Insert block on Enter/Click
- [ ] P1: Show keyboard shortcuts
- [ ] P1: Group by category
- [ ] P2: Add icons for each block type

**Toolbar**
- [ ] P0: Bold, Italic, Underline
- [ ] P0: Heading level selector
- [ ] P0: Link insertion
- [ ] P0: Image upload
- [ ] P1: Text alignment
- [ ] P1: Text color
- [ ] P2: Highlight color

**Deliverables:**
- ✅ Working Tiptap editor
- ✅ Block types implemented
- ✅ Slash command menu
- ✅ Formatting toolbar

**Time Estimate:** 45 hours

---

### Sprint 6: Note Management (Weeks 11-12)

#### Tasks

**Page CRUD**
- [ ] P0: Create `/grimoire` page
- [ ] P0: API routes:
  - `POST /api/grimoire` - create page
  - `GET /api/grimoire/[id]` - read page
  - `PUT /api/grimoire/[id]` - update page
  - `DELETE /api/grimoire/[id]` - delete page
- [ ] P0: Save editor content as JSONB
- [ ] P0: Implement auto-save (debounced)
- [ ] P1: Add manual save button
- [ ] P1: Show last saved timestamp
- [ ] P2: Add version history

**Sidebar Navigation**
- [ ] P0: List all user pages
- [ ] P0: Show page hierarchy (nested)
- [ ] P0: Add "New Page" button
- [ ] P0: Implement page reordering (drag-drop)
- [ ] P1: Add page search/filter
- [ ] P1: Show page icons
- [ ] P2: Collapsible folders

**Page Metadata**
- [ ] P0: Editable page title
- [ ] P0: Page icon picker (emoji)
- [ ] P1: Cover image upload
- [ ] P1: Page tags
- [ ] P2: Created/modified dates

**Drag Handle**
- [ ] P0: Show `⋮⋮` on block hover
- [ ] P0: Implement block drag-and-drop
- [ ] P0: Add context menu on click:
  - Delete block
  - Duplicate block
  - Turn into...
  - Copy link
- [ ] P1: Add color picker
- [ ] P2: Add block comments

**Deliverables:**
- ✅ Full CRUD for grimoire pages
- ✅ Sidebar with page tree
- ✅ Auto-save functionality
- ✅ Block manipulation

**Time Estimate:** 50 hours

---

### Sprint 7: Clipping & Export (Weeks 13-14)

#### Tasks

**Clip from Library**
- [ ] P0: Add "Clip to Grimoire" button on library texts
- [ ] P0: Text selection UI
- [ ] P0: Create clip preview modal
- [ ] P0: Save clip to grimoire page
- [ ] P1: Add source citation automatically
- [ ] P1: Link back to original text
- [ ] P2: Show all clips from a source

**Wikilinks**
- [ ] P0: Implement `[[Page Name]]` syntax
- [ ] P0: Autocomplete page names
- [ ] P0: Convert to clickable links
- [ ] P0: Create backlinks index
- [ ] P1: Show backlinks panel
- [ ] P1: Create page if doesn't exist
- [ ] P2: Alias support `[[Page|Alias]]`

**Export System**
- [ ] P0: Export to Markdown
  - Convert Tiptap JSON to MD
  - Preserve formatting
  - Include metadata frontmatter
- [ ] P0: Export to HTML
  - Add CSS styling
  - Standalone file
- [ ] P1: Export to PDF
  - Use jsPDF or Puppeteer
  - Format for printing
- [ ] P1: Export to Notion
  - Convert to Notion blocks format
  - Generate import instructions
- [ ] P2: Bulk export (entire grimoire)

**Deliverables:**
- ✅ Clipping from library to grimoire
- ✅ Internal wikilinks
- ✅ Multi-format export

**Time Estimate:** 45 hours

---

## PHASE 3: CORRESPONDENCE TABLES (Sprints 8-10, Weeks 15-20)

### Sprint 8: Neptune Graph Setup (Weeks 15-16)

#### Tasks

**Neptune Cluster**
- [ ] P0: Create Neptune cluster in AWS
- [ ] P0: Configure VPC and security groups
- [ ] P0: Set up Gremlin endpoint
- [ ] P0: Install Gremlin Node.js driver
- [ ] P1: Enable IAM authentication
- [ ] P1: Set up Neptune Streams
- [ ] P2: Configure backups

**Graph Schema Design**
- [ ] P0: Define vertex types:
  - Planet, Element, Deity, Metal, Crystal
  - Herb, Animal, Color, Number, Card
  - Sephirah, Chakra, Rune, Hexagram
- [ ] P0: Define edge types:
  - CORRESPONDS_TO
  - RULES
  - INFLUENCED_BY
  - SUBSTITUTES_FOR
- [ ] P0: Add edge properties (strength, tradition, source)
- [ ] P1: Create schema validation

**Data Ingestion**
- [ ] P0: Write seed data script
- [ ] P0: Import classical correspondences:
  - 7 classical planets
  - 4 elements
  - 12 zodiac signs
  - 10 sephiroth
- [ ] P1: Import from CSV sources
- [ ] P1: Deduplicate entries
- [ ] P2: Import user contributions

**PostgreSQL Sync**
- [ ] P0: Create sync service
- [ ] P0: Bi-directional updates
- [ ] P0: Handle conflicts (last-write-wins)
- [ ] P1: Add change log table
- [ ] P2: Real-time sync with triggers

**Deliverables:**
- ✅ Neptune cluster running
- ✅ Graph schema defined
- ✅ 100+ entities seeded
- ✅ PostgreSQL sync working

**Time Estimate:** 55 hours

---

### Sprint 9: Graph Visualization (Weeks 17-18)

#### Tasks

**D3.js Component**
- [ ] P0: Create `KnowledgeGraph.tsx`
- [ ] P0: Set up SVG canvas
- [ ] P0: Implement force simulation
- [ ] P0: Render nodes as circles
- [ ] P0: Render edges as lines
- [ ] P0: Add node labels
- [ ] P1: Color nodes by type
- [ ] P1: Size nodes by connection count

**Interactions**
- [ ] P0: Hover to highlight connections
- [ ] P0: Click node to view details
- [ ] P0: Pan and zoom controls
- [ ] P0: Drag nodes to reposition
- [ ] P1: Right-click context menu
- [ ] P1: Double-click to expand
- [ ] P2: Minimap overview

**Filters**
- [ ] P0: Filter by entity type
- [ ] P0: Filter by tradition (Hermetic, Vedic, etc.)
- [ ] P0: Search for specific entity
- [ ] P1: Hide orphan nodes
- [ ] P1: Show only N-hop neighbors
- [ ] P2: Save filter presets

**Performance**
- [ ] P0: Lazy load large graphs
- [ ] P0: Implement clustering for 1000+ nodes
- [ ] P1: Use WebGL for >5000 nodes
- [ ] P1: Add level-of-detail (LOD)
- [ ] P2: Worker thread for simulation

**Deliverables:**
- ✅ Interactive D3.js graph
- ✅ Hover/click interactions
- ✅ Filtering system
- ✅ Performant for 500+ nodes

**Time Estimate:** 60 hours

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

### Sprint 11: AI Infrastructure (Weeks 21-22)

#### Tasks

**API Integrations**
- [ ] P0: Set up Claude API client
- [ ] P0: Set up OpenAI API client
- [ ] P0: Implement rate limiting
- [ ] P0: Add retry logic with exponential backoff
- [ ] P1: Implement fallback (Claude → GPT-4)
- [ ] P1: Add timeout handling
- [ ] P2: Track usage costs

**Caching System**
- [ ] P0: Create `ai_cache` table
- [ ] P0: Hash query + context
- [ ] P0: Store responses with TTL
- [ ] P0: Check cache before API call
- [ ] P1: Implement cache warming
- [ ] P1: Add cache analytics
- [ ] P2: Distributed cache (Redis)

**Streaming**
- [ ] P0: Implement SSE (Server-Sent Events)
- [ ] P0: Stream tokens from AI APIs
- [ ] P0: Handle connection errors
- [ ] P1: Show typing indicator
- [ ] P2: Resume interrupted streams

**Deliverables:**
- ✅ AI API clients configured
- ✅ Caching system working
- ✅ Streaming responses
- ✅ Error handling robust

**Time Estimate:** 45 hours

---

### Sprint 12: Retrieval System (Weeks 23-24)

#### Tasks

**Vector Search**
- [ ] P0: Generate embeddings for all texts
- [ ] P0: Store in `texts.embedding` column
- [ ] P0: Implement semantic search query
- [ ] P0: Use pgvector for similarity
- [ ] P1: Batch embedding generation
- [ ] P1: Optimize vector index
- [ ] P2: Incremental updates

**Graph Retrieval**
- [ ] P0: Query Neptune for relevant nodes
- [ ] P0: Traverse N-hop neighbors
- [ ] P0: Calculate path relevance
- [ ] P0: Return subgraph context
- [ ] P1: Pattern matching queries
- [ ] P2: Community detection

**Hybrid Ranking**
- [ ] P0: Combine vector + keyword + graph scores
- [ ] P0: Implement reciprocal rank fusion
- [ ] P0: Add recency boost
- [ ] P0: Personalize by user history
- [ ] P1: A/B test ranking algorithms
- [ ] P2: Learning-to-rank with ML

**Citation Extraction**
- [ ] P0: Extract relevant passages
- [ ] P0: Include source metadata
- [ ] P0: Add page/section numbers
- [ ] P0: Link to original text
- [ ] P1: Highlight matching text
- [ ] P2: Generate BibTeX

**Deliverables:**
- ✅ Vector semantic search
- ✅ Graph-based retrieval
- ✅ Hybrid ranking system
- ✅ Source citations

**Time Estimate:** 55 hours

---

### Sprint 13: The Convergence Machine - Lens System (Weeks 25-26)

#### Tasks

**7-Lens System Definitions**
- [ ] P0: Define 7 lens system prompts (6 + Mathematical)
- [ ] P0: **Scientific Lens**:
  - Focus: Physics, biology, cosmology
  - Keywords: empirical, measurable, natural laws
- [ ] P0: **Psychological Lens**:
  - Focus: Jung, archetypes, shadow work, cognitive science
  - Keywords: unconscious, individuation, symbols
- [ ] P0: **Philosophical Lens**:
  - Focus: Metaphysics, ethics, ontology, epistemology
  - Keywords: being, truth, virtue, knowledge
- [ ] P0: **Religious/Spiritual Lens**:
  - Focus: Comparative theology, mysticism, sacred texts
  - Keywords: sacred, divine, transcendent
- [ ] P0: **Historical/Anthropological Lens**:
  - Focus: Cultural evolution, mythology
  - Keywords: context, tradition, ritual
- [ ] P0: **Symbolic/Occult Lens**:
  - Focus: Correspondences, alchemy, astrology
  - Keywords: as above so below, transmutation
- [ ] P0: **Mathematical Lens (NEW)**:
  - Focus: Sacred geometry, numerology, patterns, ratios
  - Keywords: golden ratio, fibonacci, platonic solids, universal principles

**Retrieval Strategies**
- [ ] P0: Map each lens to retrieval type:
  - Scientific → Vector search (academic papers)
  - Psychological → Vector + keyword (Jung, Freud, archetypes)
  - Philosophical → Vector search (philosophical texts)
  - Religious/Spiritual → Vector + keyword (sacred texts, theology)
  - Historical/Anthropological → Vector + temporal context
  - Symbolic → Graph traversal (correspondences)
  - Mathematical → Pattern matching + graph (sacred geometry, ratios)
- [ ] P0: Adjust search parameters per lens
- [ ] P0: Lens weighting algorithm implementation
- [ ] P1: Confidence scoring per lens

**Answer Composition**
- [ ] P0: Generate answer per lens
- [ ] P0: Merge with clear section headers
- [ ] P0: Add lens-specific citations
- [ ] P0: Include confidence scores
- [ ] P1: Generate synthesis/comparison
- [ ] P2: Visual comparison (radar chart)

**Deliverables:**
- ✅ 7 lens prompts defined (including Mathematical)
- ✅ Per-lens retrieval strategies
- ✅ Lens weighting algorithm
- ✅ Multi-perspective answer composition

**Time Estimate:** 55 hours

---

### Sprint 14: The Convergence Machine - Premium UI (Weeks 27-28)

#### Tasks

**AI Query Interface**
- [ ] P0: Create `/convergence-machine` page (premium-gated)
- [ ] P0: Build query input (textarea)
- [ ] P0: **Add 7 lens weight sliders (0-100% each)**
  - Scientific slider
  - Psychological slider
  - Philosophical slider
  - Religious/Spiritual slider
  - Historical/Anthropological slider
  - Symbolic/Occult slider
  - Mathematical slider
- [ ] P0: Add lens on/off toggles
- [ ] P0: Default preset (equal weights at ≈14% each)
- [ ] P0: Display streaming response
- [ ] P0: Show source citations
- [ ] P0: Lens weight visualization (bar chart or pie chart)
- [ ] P1: Save custom lens presets
- [ ] P1: Load saved presets
- [ ] P1: Preset templates (Scholar, Practitioner, Seeker)
- [ ] P1: Add example queries
- [ ] P1: Query refinement suggestions

**Conversation History**
- [ ] P0: Save queries and responses
- [ ] P0: Display past conversations
- [ ] P0: Continue previous conversation
- [ ] P1: Search conversation history
- [ ] P1: Export conversation
- [ ] P2: Share conversation link

**Premium Paywall**
- [ ] P0: Implement subscription check
- [ ] P0: Show upgrade prompt for free users
- [ ] P0: Track query usage (5 free/month)
- [ ] P1: Stripe integration for payments
- [ ] P1: Subscription management UI
- [ ] P2: Trial period (7 days)

**Rate Limiting**
- [ ] P0: Limit free tier to 5 queries/month
- [ ] P0: Unlimited for premium users
- [ ] P0: Show remaining queries
- [ ] P1: Soft limit warnings
- [ ] P2: Pay-per-query option

**Deliverables:**
- ✅ The Convergence Machine query interface
- ✅ 7 lens weight sliders with visual feedback
- ✅ Lens preset system (default + custom + templates)
- ✅ Conversation history
- ✅ Premium paywall

**Time Estimate:** 60 hours

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

