# DIGITAL GRIMOIRE - FEATURE BACKLOG & PRIORITIES

**Last Updated:** October 25, 2025  
**Version:** 1.1  

## 🎉 RECENT ACHIEVEMENTS

**Sprint 1 Complete (1h 53m):** Infrastructure, AWS, Supabase, Next.js setup  
**Sprint 2 Complete (2.5 hours):** Authentication, Core UI, Avatar System, Dashboard, Toast Notifications

### Standout Features Delivered:
- ✅ **Production-Ready Avatar System** (crop/zoom/compress/delete)
- ✅ **Complete Authentication** (email/password + protected routes)
- ✅ **Enhanced Dashboard** (animated stats, getting started, highlights)
- ✅ **Toast Notifications** (Sonner with dark theme)
- ✅ **Dark Academia Design** (consistent aesthetic throughout)

**Total Velocity:** 32x faster than traditional development with AI assistance! 🚀

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
| Document upload (admin) | P0 | M | 3 | ⬜ Planned | S3 integration |
| OCR processing (Textract) | P0 | L | 3 | ⬜ Planned | Lambda triggers |
| Metadata extraction (AI) | P0 | M | 3 | ⬜ Planned | Claude Vision |
| Document classification (20 types) | P0 | S | 3 | ⬜ Planned | From taxonomy |
| Full-text search | P0 | M | 4 | ⬜ Planned | PostgreSQL FTS |
| Document viewer (PDF) | P0 | M | 4 | ⬜ Planned | react-pdf |
| Filter by type/domain/year | P0 | S | 4 | ⬜ Planned | Query params |
| Document detail page | P0 | S | 4 | ⬜ Planned | Metadata display |
| Semantic search (vector) | P1 | L | 12 | ⬜ Planned | pgvector |
| Advanced search (Boolean) | P1 | M | Post | ⬜ Planned | AND/OR/NOT |
| OCR quality review | P1 | M | Post | ⬜ Planned | Human-in-loop |
| Document versioning | P2 | L | Post | ⬜ Planned | S3 versions |
| Multi-language support | P2 | XL | Post | ⬜ Planned | i18n |
| Audio narration | P3 | L | Year 2 | ⬜ Planned | Text-to-speech |

### 2. PERSONAL GRIMOIRE

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Tiptap editor setup | P0 | M | 5 | ⬜ Planned | Core blocks |
| Page CRUD operations | P0 | M | 6 | ⬜ Planned | Create/read/update/delete |
| Auto-save functionality | P0 | S | 6 | ⬜ Planned | Debounced |
| Slash command menu | P0 | M | 5 | ⬜ Planned | / trigger |
| Block drag-and-drop | P0 | M | 6 | ⬜ Planned | ⋮⋮ handle |
| Page sidebar navigation | P0 | M | 6 | ⬜ Planned | Tree view |
| Clip from library | P0 | M | 7 | ⬜ Planned | Save passages |
| Wikilinks [[Page]] | P0 | M | 7 | ⬜ Planned | Internal links |
| Export to Markdown | P0 | S | 7 | ⬜ Planned | .md download |
| Export to HTML | P0 | S | 7 | ⬜ Planned | Styled |
| Backlinks panel | P1 | M | 7 | ⬜ Planned | Show incoming links |
| Export to PDF | P1 | M | 7 | ⬜ Planned | jsPDF |
| Export to Notion | P1 | M | 7 | ⬜ Planned | Blocks format |
| Nested pages (hierarchy) | P1 | M | 6 | ⬜ Planned | parent_id |
| Page templates | P2 | M | Post | ⬜ Planned | Ritual, study, etc. |
| Collaborative editing | P2 | XL | Post | ⬜ Planned | Real-time sync |
| Version history | P2 | L | Post | ⬜ Planned | Time travel |
| Custom CSS per page | P3 | M | Year 2 | ⬜ Planned | Advanced users |
| Bi-directional Notion sync | P3 | XL | Year 2 | ⬜ Planned | Premium tier |

### 3. CORRESPONDENCE TABLES

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Neptune cluster setup | P0 | L | 8 | ⬜ Planned | Graph database |
| Graph schema definition | P0 | M | 8 | ⬜ Planned | Vertices + edges |
| Seed data (100+ entities) | P0 | M | 8 | ⬜ Planned | Classical corr. |
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

### 4. MULTI-LENS AI SYSTEM

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Claude API integration | P0 | M | 11 | ⬜ Planned | Primary AI |
| OpenAI API integration | P0 | M | 11 | ⬜ Planned | Fallback |
| Response streaming (SSE) | P0 | M | 11 | ⬜ Planned | Real-time tokens |
| AI response caching | P0 | M | 11 | ⬜ Planned | Hash-based |
| Vector search retrieval | P0 | L | 12 | ⬜ Planned | Semantic |
| Graph-based retrieval | P0 | M | 12 | ⬜ Planned | Neptune queries |
| Hybrid ranking | P0 | L | 12 | ⬜ Planned | Combine signals |
| Citation extraction | P0 | M | 12 | ⬜ Planned | Source passages |
| 6 lens prompts | P0 | L | 13 | ⬜ Planned | Perspectives |
| Per-lens retrieval | P0 | M | 13 | ⬜ Planned | Custom strategies |
| Answer composition | P0 | M | 13 | ⬜ Planned | Merge lenses |
| AI query UI | P0 | M | 14 | ⬜ Planned | Input + display |
| Lens selector | P0 | S | 14 | ⬜ Planned | Checkboxes |
| Conversation history | P0 | M | 14 | ⬜ Planned | Past queries |
| Premium paywall | P0 | M | 14 | ⬜ Planned | Stripe |
| Rate limiting | P0 | M | 14 | ⬜ Planned | Free: 5/mo |
| Confidence scoring | P1 | M | 13 | ⬜ Planned | Per-answer |
| Query refinement | P1 | M | Post | ⬜ Planned | Suggestions |
| Export conversation | P1 | S | Post | ⬜ Planned | Markdown |
| Image generation | P2 | L | Post | ⬜ Planned | DALL-E/Midjourney |
| Voice input | P2 | M | Post | ⬜ Planned | Whisper API |
| Custom AI training | P3 | XL | Year 2 | ⬜ Planned | Pro tier |

### 5. COMMUNITY & TOKENOMICS

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

### 6. RITUAL INVENTORY (NEW)

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

### Authentication & Security

| Feature | Priority | Effort | Sprint | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| Email/password auth | P0 | M | 2 | ✅ Complete | Supabase Auth |
| Protected routes | P0 | S | 2 | ✅ Complete | Middleware |
| Role-based access (RBAC) | P0 | M | 2 | ✅ Complete | Admin, user, contributor |
| RLS policies | P0 | M | 2 | ✅ Complete | Database-level + Storage |
| Password reset | P1 | M | 2 | ⬜ Planned | Email link |
| Email verification | P1 | S | 2 | ⬜ Planned | Required |
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
| Error tracking (Sentry) | P1 | S | Post | ⬜ Planned | Production errors |
| CloudWatch alarms | P1 | M | Post | ⬜ Planned | AWS monitoring |
| Uptime monitoring | P1 | S | Post | ⬜ Planned | Pingdom |
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
| Discord bot | P2 | L | Post | ⬜ Planned | Community |
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

## TOTAL FEATURE COUNT

- **P0 (Must Have):** 127 features
- **P1 (Should Have):** 76 features
- **P2 (Nice to Have):** 45 features
- **P3 (Future):** 18 features

**Total:** 266 features across entire roadmap

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

