# Project Parallax - Development Documentation

**The Plurality of Knowing: Explore Truth Through Multiple Lenses**

Project Parallax bridges esoteric traditions, religious texts, philosophical works, and consciousness-exploring sciences to show how all wisdom paths converge. From independent seekers to professional scholars - accessible wisdom for all, synthesized through our multi-lens AI reasoning system (The Parallax Engine).

---

## 📚 Documentation Overview

This repository contains comprehensive planning and development documentation for the Digital Grimoire Library platform. All source documents have been synthesized into actionable development plans.

### Core Planning Documents

| Document | Purpose | Audience | Status |
|----------|---------|----------|--------|
| **MASTER_DEVELOPMENT_PLAN.md** | Comprehensive 48-week roadmap with all features, architecture, and business strategy | All stakeholders | ✅ Complete |
| **PROJECT_ROADMAP.md** | Detailed sprint-by-sprint tasks with time estimates and dependencies | Development team | ✅ Complete |
| **QUICK_START_GUIDE.md** | Get development environment running in 2 hours | New developers | ✅ Complete |
| **FEATURE_BACKLOG.md** | Prioritized feature matrix with 266 features across 4 priority levels | Product managers | ✅ Complete |

### Source Documents (Used)

| Document | Key Information Extracted |
|----------|---------------------------|
| Complete Technical Implementation Plan | Architecture, tech stack, database schema, API design |
| UI/UX Strategy | Design research, competitive analysis, aesthetic guidelines |
| Business Plan | Market analysis, monetization, financial projections |
| Cursor Interaction Rules | UI interaction patterns and accessibility |
| Metadata Guidelines | Document metadata standards |
| Document Type Classification | 20-type taxonomy for content classification |
| supabase-schema.sql | Complete database schema (10+ tables) |
| CORE AI TEAM document | 15 AI agent workflow structure |

---

## 🚀 Getting Started

### Quick Start (Development)

```bash
# Navigate to the app directory
cd app

# Install dependencies (if not already done)
pnpm install

# Set up environment variables
# Copy .env.example to .env.local and fill in your credentials:
# - Supabase URL and keys
# - AWS credentials
# - API keys for Claude and OpenAI

# Run the development server
pnpm dev

# Open http://localhost:3000 in your browser
```

**Current Status:** Sprint 2 Complete! ✅ Ready for Sprint 3  
**See:** [SPRINT_2_COMPLETE.md](SPRINT_2_COMPLETE.md) for Sprint 2 achievements

### Project Structure

```
Digital-Grimoire/
├── app/                         # Next.js 14 application
│   ├── src/
│   │   ├── app/                # App Router pages and API routes
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities and configurations
│   │   └── middleware.ts       # Auth middleware
│   ├── public/                 # Static assets
│   └── package.json            # Dependencies
├── docs/
│   ├── planning/               # Planning documents
│   └── source/                 # Source documents
├── supabase-schema.sql         # Database schema
└── README.md                   # This file
```

---

## 🎯 Project Vision

### Mission

**Convergence presents knowledge for exploration, not as authoritative truth.** We make hidden wisdom accessible while maintaining scholarly rigor, showing how all wisdom paths converge to reveal our fundamental unity.

### What We Include

- **Esoteric & Occult Texts** - Mystery traditions, hidden knowledge, alchemical works
- **Religious Scriptures** - Sacred texts from all major and minor world religions
- **Mystical & Spiritual Traditions** - Contemplative practices, spiritual philosophies
- **Philosophical Works** - Metaphysics, ethics, epistemology
- **Consciousness Sciences** - Quantum physics, psychology, neuroscience
- **Mathematical Patterns** - Sacred geometry, numerology, universal principles
- **Systems & Practices** - Astrology, human design, tarot, I Ching (regardless of scientific validation)

**Religion has been fundamental to human experience.** We honor this by treating religious texts as essential to synthesis.

### The Six Core Components

1. **The Parallax Library** (Free)
   - Esoteric, religious, philosophical, and wisdom texts
   - Full OCR with AI-powered semantic search
   - 20 document type classifications
   - Free public access for all

2. **Study Journal** (Freemium)
   - Private research notebook
   - Notion-like editor with wikilinks
   - Clip passages from library
   - Export to Markdown, HTML, PDF, Notion

3. **Correspondence Tables** (Premium)
   - Traditional esoteric symbolic relationships
   - Planets → Elements → Deities → Metals → Crystals
   - Dual interface: sortable table + visual graph
   - Neptune graph database + D3.js visualization

4. **The Parallax Graph** (Premium)
   - Cross-tradition conceptual unity
   - Shows how all traditions express same truths
   - Example: Buddhist Emptiness ↔ Quantum Zero-point ↔ Christian Void
   - Comparative table + network views

5. **The Parallax Engine** (Premium)
   - **7-lens AI reasoning with adjustable weighting**
   - Scientific, Psychological, Philosophical
   - Religious/Spiritual, Historical/Anthropological
   - Symbolic/Occult, **Mathematical** (NEW)
   - Sliders adjust perspective emphasis (0-100% each)

6. **Community Token Economy**
   - Ethical reward system ("Create Coin")
   - Points, badges, and ranks
   - Governance via utility token
   - Non-speculative, mission-driven design

---

## 🚀 Quick Start

### For Developers

**First time setup (2 hours):**

```bash
# 1. Read docs/planning/QUICK_START_GUIDE.md
# 2. Set up accounts (Supabase, AWS)
# 3. Run installation commands
# 4. Configure environment variables
# 5. Deploy database schema
# 6. Start development server
```

**See:** `docs/planning/QUICK_START_GUIDE.md` for detailed instructions

### For Project Managers

**Planning resources:**

1. Review `docs/planning/MASTER_DEVELOPMENT_PLAN.md` for overall strategy
2. Use `docs/planning/PROJECT_ROADMAP.md` for sprint planning
3. Prioritize features from `docs/planning/FEATURE_BACKLOG.md`
4. Track progress in GitHub Projects

---

## 📊 Project Scope

### Timeline

- **MVP:** 6 months (Sprints 1-8)
- **V1.0:** 12 months (Sprints 1-18)
- **Market Leadership:** 3-5 years

### Budget

- **Bootstrap Budget:** $0-50/month starting, scales with revenue
- **Breakeven:** 15 premium subscribers ($225 MRR covers Phase 2 costs)
- **Milestone-gated phases:** Only invest when revenue covers costs

### Team

- **Solo Developer:** Founder with AI-assisted development (Cursor)
- **Velocity:** Comparable to 2-3 person team due to AI assistance
- **Future Hiring:** Will consider first hire when MRR > $5K/month

---

## 🏗️ Technical Architecture

### Tech Stack

**Frontend:**

- Next.js 14 (App Router)
- TailwindCSS + Radix UI
- Tiptap (rich text editor)
- D3.js (graph visualization)

**Backend:**

- Supabase (PostgreSQL + Auth + Storage)
- AWS S3 (document storage)
- AWS Lambda (serverless processing)
- AWS Textract (OCR)
- Amazon Neptune (graph database)

**AI:**

- Claude API (primary reasoning)
- OpenAI GPT-4 (fallback)
- pgvector (semantic search)
- MindsDB (in-database ML)

**Blockchain:**

- Polygon or Solana (L2)
- ERC-20 token standard

### Database Schema

**12+ Tables:**

- `users` - Authentication & roles
- `texts` - Main library documents with embeddings
- `correspondences` - Traditional esoteric symbolic entities
- `correspondence_relationships` - Traditional correspondence graph edges
- `convergence_concepts` - Cross-tradition concepts (NEW)
- `convergence_relationships` - Cross-tradition relationships (NEW)
- `journal_entries` - Personal study journals (formerly grimoires)
- `user_bookmarks` - Saved passages
- `user_annotations` - Notes on texts
- `badges`, `agent_logs`, etc.

**Key Features:**

- Row-Level Security (RLS)
- Vector embeddings (1536d)
- Full-text search indexes
- JSONB for flexible schemas

### Parallax Engine Technical Details

**AI Model:**

- **GPT-4o (GPT-4 Omni)** - OpenAI's multimodal model used for all lens analysis and synthesis

**Instruction Files:**

- **`app/src/lib/parallax/lenses.ts`** - Contains all 7 lens definitions with their system prompts:
  - Scientific, Psychological, Philosophical, Religious/Spiritual
  - Historical/Anthropological, Symbolic/Occult, Mathematical
  - Each lens includes: `systemPrompt`, `keywords`, `retrievalStrategy`, and metadata
  
- **`app/src/lib/parallax/lens-orchestrator.ts`** - Contains orchestration logic:
  - Multi-lens response generation
  - Synthesis instructions for merging perspectives
  - Length-specific instructions (short/medium/long)
  - Dominance pattern detection and weighting logic

---

## 🎨 Design Philosophy

### Aesthetic: "The Scholar's Study at Midnight"

**Visual Identity:**

- Dark theme with deep greens and blues
- Muted gold accents (old brass)
- Classic serif headings (Garamond)
- Modern sans body text (Inter)
- Subtle textures (aged parchment)

**UI Principles:**

- Academic authority meets modern UX
- Cursor interaction rules for accessibility
- Dark Academia aesthetic
- Esoteric symbolism in icons
- Responsive, mobile-first design

---

## 💰 Business Model

### Two Progression Systems

**Payment Tiers** (Features):

- 🏛️ The Reader → The Scholar → The Archivist

**Community Ranks** (Reputation):

- ⭐ Neophyte → Adept → Magus (earned through contributions)

### Freemium SaaS

**Free Tier (The Reader):**

- Full library access
- Basic search
- Personal Grimoire (25 pages)
- 5 AI queries/month
- Export to Markdown/HTML

**Premium Tier (The Scholar) - $15/month:**

- Unlimited grimoire pages
- Unlimited AI queries
- Interactive correspondence graph
- Ritual inventory system
- Export to PDF + Notion
- Priority support

**Target Metrics (Year 1):**

- 1,000 Monthly Active Users
- 50 Premium subscribers (5% conversion)
- $9,000 ARR
- 7.2:1 LTV:CAC ratio

---

## 📈 Development Phases

### Phase 1: MVP Foundation (Weeks 1-8)

- ✅ Infrastructure setup
- ✅ Document ingestion pipeline
- ✅ Public library frontend
- ✅ User authentication

### Phase 2: Personal Grimoire (Weeks 9-14)

- ✅ Tiptap editor
- ✅ Note management
- ✅ Clip & export system

### Phase 3A: Correspondence Tables (Weeks 15-18)

- ✅ Neptune graph database
- ✅ Traditional esoteric correspondences
- ✅ D3.js visualization + table view
- ✅ CRUD interface

### Phase 3B: The Convergence Graph (Weeks 19-20)

- ✅ Convergence concepts database
- ✅ Cross-tradition relationship mapping
- ✅ Comparative table + network graph
- ✅ Unity visualization

### Phase 4: The Convergence Machine (Weeks 21-28)

- ✅ AI infrastructure
- ✅ Retrieval system
- ✅ **7-lens orchestration** (including Mathematical)
- ✅ **Lens weight sliders**
- ✅ Premium UI with preset system

### Phase 5: Community & Token (Weeks 29-36)

- ✅ Points and badges
- ✅ Forums
- ✅ Smart contracts
- ✅ Token launch prep

### Phase 6: Advanced Features (Weeks 37-48)

- ✅ Ritual inventory
- ✅ n8n agent workflows
- ✅ Advanced graph features

---

## 🎯 Success Metrics

### Product KPIs

| Metric | 6 Months | 12 Months |
|--------|----------|-----------|
| Total Users | 500 | 1,000 |
| Premium Subs | 15 (3%) | 50 (5%) |
| MAU | 300 | 700 |
| DAU/MAU | 27% | 29% |
| Library Texts | 100 | 300 |
| Graph Nodes | 200 | 500 |

### Technical KPIs

| Metric | Target |
|--------|--------|
| Page Load | <2s |
| Search Latency | <500ms |
| API Uptime | >99.5% |
| Test Coverage | >80% |
| Lighthouse | >90 |

**Performance Testing:**

- Automated with [Unlighthouse](https://unlighthouse.dev/) in CI/CD
- Weekly scheduled audits + PR checks
- See [Performance Testing Guide](docs/guides/PERFORMANCE_TESTING.md)

---

## 🤖 AI Agent Architecture

15 specialized agents managed via n8n workflows:

**Leadership:**

- Vision Agent (CEO)
- Coordinator Agent (COO)
- Engineering Agent (CTO)

**Content:**

- Library Science Agent
- Archivist Agent
- Knowledge Graph Agent

**Community:**

- Community Manager
- Marketing Agent
- Social Media Agent

**Product:**

- Frontend Agent
- UX Design Agent
- AI Reasoning Agent

**Operations:**

- Blockchain Agent
- Legal Agent
- Prompt Engineer Agent

---

## 📝 Feature Count

**Total: 266 features across roadmap**

- **P0 (Must Have):** 127 features → MVP
- **P1 (Should Have):** 76 features → V1.0
- **P2 (Nice to Have):** 45 features → V2.0
- **P3 (Future):** 18 features → Years 2-3

---

## 🔒 Legal & Ethical Framework

### Compliance

- **Token:** Utility-only, Legal Opinion required
- **Content:** Public domain + licensed works only
- **Privacy:** GDPR/CCPA compliant, opt-in analytics
- **Cultural:** Ethical sourcing, indigenous protocols
- **Accessibility:** WCAG 2.1 Level AA

### Terms

- Open Terms of Service
- Privacy Policy with data minimization
- Community Guidelines
- Content Moderation Policy

---

## 🌟 Competitive Advantage

**Unique Value Proposition:**

**Project Parallax** is the **only platform** that combines:

1. **Academic rigor** (scholarly metadata, citations) with **accessibility** (independent researchers to professional scholars)
2. **Modern UX** (Notion-like simplicity for Study Journal)
3. **7-lens AI reasoning** with **adjustable weighting** (Scientific, Psychological, Philosophical, Religious/Spiritual, Historical/Anthropological, Symbolic/Occult, Mathematical)
4. **Dual graph systems** (Traditional correspondences + Cross-tradition unity)
5. **Inclusive content** (Esoteric + Religious + Philosophical + Consciousness sciences)
6. **Community ownership** (ethical tokenomics, non-exploitative)
7. **Educational positioning** (presents knowledge for exploration, not as truth)

**Market Position:**

- Fills gap between static archives and superficial consumer apps
- Honors religious traditions as essential to human understanding
- Serves independent researchers, academic scholars, and active practitioners
- Addresses $173B+ spiritual products market with integrity

---

## 🚧 Current Status

**As of October 24, 2025:**

- ✅ All planning documents complete
- ✅ Technical architecture defined
- ✅ Database schema ready
- ✅ UI/UX guidelines established
- ⬜ Development environment setup (next)
- ⬜ Sprint 1 begins (infrastructure)

---

## 📞 Next Actions

### Immediate (Week 1)

1. Set up development environment
2. Create GitHub repository
3. Initialize Next.js project
4. Deploy Supabase database
5. Configure AWS services

### This Month

1. Complete Sprint 1 (infrastructure)
2. Complete Sprint 2 (authentication)
3. Begin Sprint 3 (document ingestion)
4. Recruit additional team members

### This Quarter

1. Launch MVP with core library
2. Onboard first 50 beta users
3. Digitize initial 100 texts
4. Begin content marketing

---

## 📖 Documentation Index

### Planning Documents

- [Master Development Plan](docs/planning/MASTER_DEVELOPMENT_PLAN.md) - Complete roadmap
- [Project Roadmap](docs/planning/PROJECT_ROADMAP.md) - Sprint-by-sprint tasks
- [Feature Backlog](docs/planning/FEATURE_BACKLOG.md) - Prioritized features (with 7-lens slider feature)
- [Quick Start Guide](docs/planning/QUICK_START_GUIDE.md) - Developer setup
- [Executive Summary](docs/planning/EXECUTIVE_SUMMARY.md) - Investor overview
- [**BRANDING.md**](docs/BRANDING.md) - **Brand guidelines, 7-lens system, voice & tone** (NEW)
- [**LEGAL_DISCLAIMERS.md**](docs/LEGAL_DISCLAIMERS.md) - **Legal positioning, disclaimers, user responsibility** (NEW)

### Source Documents

- [Complete Technical Implementation Plan](docs/source/Complete_Technical_Implementation_Plan.md)
- [UI/UX Strategy](docs/source/UI_UX_Strategy.md)
- [Business Plan](docs/source/Business_Plan.md)
- [Cursor Interaction Rules](docs/source/Cursor_Interaction_Rules.md)
- [Metadata Guidelines](docs/source/Metadata_Guidelines.md)
- [Document Type Classification](docs/source/Document_Type_Classification.md)
- [Database Schema](supabase-schema.sql)
- [AI Team Structure](docs/source/CORE_AI_TEAM.md)

---

## 🤝 Contributing

This project is currently in planning phase. Development team formation in progress.

**Interested in joining?**

- Developers: See [Quick Start Guide](docs/planning/QUICK_START_GUIDE.md)
- Designers: Review [UI/UX Strategy](docs/source/UI_UX_Strategy.md)
- Content: Review [Business Plan](docs/source/Business_Plan.md)
- Community: Join our Discord (coming soon)

---

## 📄 License

**Planning Documentation:** CC BY-SA 4.0  
**Code:** (TBD - likely MIT or Apache 2.0)  
**Content:** Various (per source)  

---

## 🙏 Acknowledgments

This project synthesizes insights from:

- Digital Occult Library (CUNY)
- Twilit Grotto Archives
- ESSWE (European Society for Study of Western Esotericism)
- Modern PKM tools (Notion, Obsidian)
- Graph visualization community

---

**Built with ❤️ for everyone seeking to understand themselves, their world, and their universe**

*"Where Hidden Wisdom Reveals Our Unity"*

---

**Last Updated:** October 25, 2025  
**Version:** 2.0 (Convergence Rebrand)  
**Status:** Planning Complete → Development Beginning

---

## 🛡️ Admin Navigation Rule

- Admin navigation pages (routes under `/admin` or admin-only actions) must be added only to the profile avatar dropdown menu.
- The dropdown's admin links are maintained by a single `adminLinks` array in `app/src/components/Header.tsx`.
- Do **not** add admin links to the main navigation bar. All new admin-only navigation should be discoverable from the dropdown for admins only.

---
