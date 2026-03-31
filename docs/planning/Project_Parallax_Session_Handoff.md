# Project Parallax — Session Handoff Document

> **Purpose:** This document captures everything decided, discovered, and produced in a working session on pricing strategy, engine analysis, and pre-launch planning. Paste this into a new conversation to resume work without losing context.
>
> **Date:** March 27, 2026
> **Next task:** Build the course production pipeline — structured templates + generation system for 15 courses and 5 thematic constellations.

---

## 1. What Project Parallax Is

Project Parallax is the parent brand — a philosophy and a house, not a product. It represents the worldview that truth emerges from triangulation, not from any single source. Two sibling products:

1. **Learning Platform** (this project) — AI-powered multi-lens analysis of wisdom texts using the "Prismatic Learning" methodology
2. **Skymark** — astrology/personal pattern-tracking product (separate, under development)

### The Learning Platform Core

- **Curated library** of 100+ public domain wisdom texts (Bhagavad Gita, Tao Te Ching, Kybalion, etc.)
- **Seven-Lens Engine** — AI that analyzes any concept through 7 analytical perspectives simultaneously, with adjustable weighting
- **Course system** — structured 6-8 week courses built around core questions (not topics), using texts in tension
- **Thematic Constellations** — permanent recurring inquiries (6-8 week cycles) that are never "completed"
- **Study Journal** — Tiptap-based with WikiLinks between pages
- **Knowledge Graph** — Sigma.js WebGL visualization of cross-tradition concept relationships
- **Text-to-Speech** — Web Speech API (free) + Azure Neural TTS (premium, capped)
- **Workbench** — Practitioner tools: Ritual Machine, Deck Forge (AI tarot), planned Sigil Maker

### The 7 Lenses

1. Scientific — empirical evidence, natural laws, mechanisms
2. Psychological — Jung, archetypes, depth psychology, inner dynamics
3. Philosophical — assumptions, arguments, logical structure, epistemology
4. Religious/Spiritual — comparative theology, mysticism, sacred experience
5. Historical/Anthropological — cultural context, transmission, evolution of ideas
6. Symbolic/Occult — correspondences, alchemy, Hermetic frameworks, esoteric layers
7. Mathematical — sacred geometry, pattern, proportion, formal structure

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

## 2. Tech Stack (Key Facts for Context)

- **Frontend:** Next.js on Vercel
- **Database:** Supabase (PostgreSQL with RLS, pgvector for embeddings)
- **PDF Storage:** Cloudflare R2
- **Search:** Hybrid — PostgreSQL FTS (annotations) + pgvector cosine similarity (Concept Search/Deep Search)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions, $0.02/1M tokens)
- **AI Models per lens:**
  - Scientific, Mathematical: gpt-4o-mini
  - Psychological, Philosophical, Symbolic/Occult: claude-3-5-sonnet-latest
  - Religious/Spiritual, Historical/Anthropological: gemini-1.5-pro
  - **Synthesis merge: gpt-4o** (upgraded from gpt-4o-mini — decision from this session)
  - Journal AI actions (planned): gpt-4o-mini
- **TTS:** Azure Cognitive Services Neural TTS ($16/1M characters — NOT $1/1M as old docs stated)
- **Payments:** Stripe (checkout security with rate limiting already built)
- **Graph:** Sigma.js v3 (WebGL) + Graphology + ForceAtlas2
- **Journal:** Tiptap editor with JSONB storage and WikiLink system
- **Annotation Search:** PostgreSQL FTS with tsvector + GIN index + Fuse.js client-side

---

## 3. Pricing Model (Finalized)

### Three Tiers + 7-Day Trial

| Tier | Price | Key Features |
|------|-------|-------------|
| **Explorer (Free)** | $0 | Full library, annotation search, Knowledge Graph, basic journal (50 entries), free TTS (unlimited), 5 Concept Searches/mo, community read-only |
| **Scholar** | $14/mo ($132/yr) | Everything free + Seven-Lens Engine (40/mo), all creator-made courses, constellations, full journal with wiki-links, Pattern Graph, community participation, Journal AI (20/mo), premium TTS (2 hrs/mo) |
| **Synthesist** | $30/mo ($288/yr) | Everything Scholar + unlimited lens queries, AI course generation (5/mo), comparative courses, publish artifacts, early features, premium TTS (6 hrs/mo) |

### 7-Day Scholar Trial

- **NOT auto-activated on signup.** Triggers when free user first clicks the Seven-Lens Engine on a passage they're reading.
- No credit card required.
- Full Scholar access for 7 days.
- End-of-trial shows summary of what user built (journal entries, wiki-links, analyses run).
- After trial: drops to Explorer. All content persists. AI tools go dormant.
- Why 7 days not 14: The lens engine delivers value in a single session. Different from Skymark (14-day trial) where pattern-building needs time.

### Deck Forge: Per-Forge Pricing (Separate from Subscription)

- Major Arcana only (22 cards): $5-8
- Full deck (78 cards): $15-25
- Single card re-forge: $0.50-1.00
- Available to all tiers. Synthesists get 10-20% discount.

### TTS Architecture

- Free Web Speech API (browser-native) = unlimited for all users
- Premium Azure Neural TTS = Scholar 2 hrs/mo, Synthesist 6 hrs/mo
- When cap hit: graceful fallback to free voices with gentle notification
- Azure Neural pricing: $16/1M characters (corrected from docs that said $1/1M)
- Azure free tier: 0.5M chars/mo shared across entire platform

### Bootstrap Budget

- While building: $0/mo (all services on free tiers)
- Soft launch: ~$25/mo (Supabase Pro for always-on)
- First revenue: ~$45/mo (Supabase Pro + Vercel Pro)
- **Break-even: 5 Scholar subscribers**
- Worst case with zero paying users for 12 months: $300-336 total

### Critical Cost Insight

AI costs only occur when paying users use paid features. Free users cost ~$0.01-0.09/mo each (hosting only). The $24,000 worst-case in the scaling table CANNOT exist without the $47,600 revenue that creates it. The costs and the revenue are the same event.

---

## 4. Engine Prompt Decisions (Critical)

### Philosophy: Each Lens Sees Fully

- **NO "blind spots" section in any lens prompt.** Each lens is a complete instrument for seeing. It brings everything it can to the question.
- The synthesis — not the individual lenses — reveals how perspectives complement each other.
- A scientist looking at a sacred text may have something to say about meaning through emergence. A mystic may notice mathematical structure. We do not tell any lens where to stop.

### Prompt Structure (3 Sections Per Lens)

1. **How this lens sees** — its perceptual method, what it attends to
2. **What this lens asks** — the questions it brings (not topic lists)
3. **What this lens sees clearly** — its strengths, stated without qualifying what it misses

### Synthesis Prompt Core Principle: Equanimity

The synthesis holds convergences and divergences with EQUAL attention. Neither pattern is privileged. The engine is not looking for disagreements or agreements — it's looking at the full landscape.

Key instruction: "Notice where perspectives CONVERGE — where different ways of knowing arrive at similar observations through different paths. Notice where perspectives DIVERGE — where they see genuinely different things. Hold both with equanimity."

### Code Changes Required

1. **Synthesis model:** Change from `gpt-4o-mini` to `gpt-4o` in lens-orchestrator.ts (line 740 and ~532)
2. **Short response floor:** Raise from 200/150/60 to 350/250/80 tokens in getResponseLengthConfig
3. **All 7 lens system prompts:** Replace in lenses.ts (full rewrites in Action Plan v2 document)
4. **Synthesis system prompt:** Replace single sentence with full equanimity-based instruction (in Action Plan v2)

---

## 5. Course Architecture

### 15-Course Curriculum (Three Arcs)

**FOUNDATIONAL SYNTHESIS (1-5)**
1. How Humans Know What They Know — "What counts as truth — and who decides?"
2. Symbol Is Not Metaphor — "Why symbols work across cultures and epochs"
3. Myth, Psyche, and Reality — "Are myths false stories — or operating systems?"
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

### MVP Launch Set: Courses 1, 5, and 12

- Course 1: Gateway/identity course (non-negotiable)
- Course 5: Retention course (depth without requiring 2-4)
- Course 12: Growth engine (shareable beyond seeker audience — tech-adjacent appeal)

### Decision: Combine Courses 2 & 3

Courses 2 (Symbol) and 3 (Myth) are close enough to feel repetitive back-to-back. Combine into a single deeper course: "Symbol, Myth, and Psychotechnology."

### Course Format Refinements Decided

- Replace "blind spots" in capstone epistemological map with "lenses you use less naturally"
- Retitle Week 6 from "Conflict Between Lenses" to "When Lenses Meet" (divergence is not conflict)
- Lens Shift Exercises are the product's secret weapon — never make them optional or compressed
- The synthesis prompts are the retention engine ("What breaks when your definition of truth is challenged?")

### 5 Thematic Constellations (Permanent, Recurring)

1. **Cosmogenesis** — "How does something come from nothing?" (First to launch)
2. **Prayer, Meditation, and Inner Technology** — "What happens when humans turn attention inward?"
3. **Death, Afterlife, and Continuity** — "What, if anything, survives change?"
4. **Good, Evil, and Moral Order** — "Why does suffering exist?"
5. **The Nature of the Divine** — "Is divinity personal, impersonal, or symbolic?"

Each cycle: 6-8 weeks, rotating texts, cross-lens dialogue, personal synthesis update, shared cohort artifact passed to next cohort.

### Standardized Course Format (Every Week)

- Core Question (never a topic)
- Key Tension + Lens Focus (explicit "A vs B" with lenses in dialogue)
- Texts in Tension (2-4 selections that do NOT agree)
- Lens Shift Exercise (practice moving between perspectives)
- Synthesis Prompt (integration, not summary)
- Convergence Micro-Artifact (rolls up into capstone)

### Course Production Model (Important Clarification)

The courses are **creator-designed but AI-generated.** Jack designs the concept (core question, tensions, weekly arc, text selections). The AI carries out the full content generation (exercises, synthesis prompts, micro-artifact specs, weekly narratives). This is NOT hand-writing every piece.

### Agreed Production Workflow

**Phase 1 (in chat):** Finalize Course 1 outline into a structured template (JSON or markdown) that captures every field. Define the "course writer" generation prompt built on Prismatic Learning principles.

**Phase 2 (Claude Code):** Build a script that reads a course outline + relevant library text passages and generates full weekly content. Outputs structured file for platform import.

**Phase 3 (production run):** Run script on all 3 MVP courses, review, refine, publish.

**THIS IS THE NEXT TASK.** The new chat should start here — building the structured course template and generation system.

---

## 6. Documents Produced in This Session

All saved and available for download:

1. **Project_Parallax_Pricing_Strategy_v1.2.docx** — Full pricing model with conservative cost analysis, tier structure, TTS caps, 7-day trial, bootstrap budget appendix, scaling scenarios, decision points, metrics to track
2. **Project_Parallax_Pre_Launch_Action_Plan_v2.docx** — Rewritten engine prompts (all 7 lenses + synthesis), code changes, 25-item prioritized task list, AI Model Monitor automation spec with database schema and alert thresholds
3. **Project_Parallax_Pre_Launch_Bible.docx** — Course production roadmap (MVP set, waves, constellation plan), SEO checklist, landing page spec, content marketing strategy (blog categories, distribution channels, email sequences, keyword tiers), launch sequence

### Known Issue with Pre-Launch Bible

The last few pages may have character encoding issues in some Word viewers. The content is correct — it's the SEO keyword strategy section and the closing paragraph. May need to be regenerated with simpler character encoding if the issue persists.

---

## 7. Key Discoveries from This Session

1. **Azure TTS is $16/1M characters, not $1/1M.** The TTS documentation was wrong by 16x. Time-based caps (2hr/6hr) were designed to contain this cost.

2. **Most platform features cost $0 to serve.** Library, annotations, Knowledge Graph, journal, PDF viewer, highlight system — all database queries and client-side rendering. Only Concept Search, Seven-Lens Engine, Journal AI, Course Generation, and premium TTS have per-use AI costs.

3. **The engine runs on gpt-4o-mini for synthesis.** This was identified as the single highest-leverage quality issue. Decision: upgrade synthesis to gpt-4o. Individual lens responses stay on their current multi-model setup (Claude for nuance, Gemini for breadth, gpt-4o-mini for structure).

4. **The lens prompts were topic lists, not epistemological instructions.** They told the model WHAT to talk about but not HOW to think. Rewritten prompts have three sections: how the lens sees, what it asks, what it sees clearly. No "blind spots" section.

5. **Equanimity, not conflict.** The synthesis prompt was initially oriented toward finding tensions and disagreements. Jack corrected this: the engine should notice convergences AND divergences with equal weight. Neither pattern is privileged.

6. **Break-even is 5 subscribers.** $45/mo fixed cost (Supabase + Vercel), $10.55 net contribution per Scholar subscriber after Stripe fees and AI costs.

7. **The Workbench has future AI costs not yet modeled.** Deck Forge (image generation), Ritual Machine (potential AI protocols), Sigil Maker (planned). Deck Forge is handled via per-forge pricing. Others need modeling when built.

8. **Stripe fees favor annual plans.** Monthly at $14: Stripe takes ~5.1%. Annual at $132: Stripe takes ~3.1%. Additional ~2% savings on top of churn reduction.

---

## 8. What to Do Next (In Order)

### Immediate Next Chat: Course Production Pipeline

1. Convert Course 1 outline into a structured template format (JSON or markdown)
2. Define the "course writer" system prompt — the AI instruction that generates course content following Prismatic Learning principles and equanimity
3. Test generation on Course 1 Week 1 to validate quality
4. Build the full generation script (Claude Code or similar)
5. Generate all 3 MVP courses (1, 5, 12)
6. Review, refine with editorial voice, prepare for platform import

### Then: Engine Prompt Implementation

7. Replace all 7 lens system prompts in lenses.ts
8. Replace synthesis system prompt in lens-orchestrator.ts
9. Change synthesis model to gpt-4o (two locations)
10. Raise short response floor to 350/250/80

### Then: Pricing & Trial Implementation

11. Configure Stripe products (Scholar + Synthesist, monthly + annual)
12. Build 7-day trial trigger mechanism
13. Implement TTS character tracking and caps
14. Build end-of-trial summary screen
15. Set Explorer caps (5 Concept Searches/mo, 50 journal entries)

### Then: SEO & Content

16. Build landing page following the spec in the Pre-Launch Bible
17. Set up meta tags, OG images, sitemap, structured data
18. Write 3-5 cornerstone blog posts
19. Set up newsletter (Substack or equivalent)
20. Submit sitemap to Google Search Console

### Then: Launch

21. Soft launch to waitlist (Explorers only)
22. Trial launch (payments live)
23. Growth phase (weekly content, community building)

---

## 9. Jack's Context

- IT consultant at an MSP, adult learner returning to school as Religious Studies major
- Deep in astrology (Western, Vedic, Human Design), ecology, spirituality, human rights
- Building Project Parallax bootstrapped — no VC, no paid marketing budget initially
- Has a casual, authentic writing voice — pushes back when things sound too polished
- Brand colors: #1D487B deep blue, #F68A23 orange
- Values transparency, anti-authority, equanimity across traditions
- The platform is a genuine expression of how Jack thinks about knowledge — it's not a business idea that happens to use wisdom texts, it's a worldview that happens to be expressed as software

---

*End of handoff document. The next conversation should start with: "I'm building the course production pipeline for Project Parallax. Here's the context from my last session:" followed by this document.*
