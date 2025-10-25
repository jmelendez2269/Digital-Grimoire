# Complete Technical Implementation Plan

Status: Active
Type: Permanent Note
Projects: Digital Grimoire  (https://www.notion.so/Digital-Grimoire-293e5ca9a61b80f2826febf7a99f5f00?pvs=21)

# 🛠 Digital Grimoire - Complete Technical Implementation Plan v2.0

**Status:** Active

**Last Updated:** October 22, 2025

**Version:** 2.0 (Ritual Inventory Integration)

---

## Executive Summary

This document provides the complete technical implementation roadmap for the Digital Grimoire platform, incorporating all four core pillars: Public Library, Correspondence Tables, Personal Grimoire, and the new **Ritual Inventory System**. The architecture is optimized for AWS Free Tier during MVP with clear scaling paths.

---

## The Four Pillars - Technical Architecture

### 1. Public Library

**Purpose:** Searchable repository of esoteric texts with robust metadata

**Tech Stack:**

- **Storage:** AWS S3 (5GB free tier) with Glacier lifecycle
- **Database:** Supabase PostgreSQL (500MB free)
- **Search:** Hybrid approach:
    - PostgreSQL Full-Text Search (keyword)
    - pgvector (semantic similarity)
    - Future: Elasticsearch when scaling
- **OCR:** AWS Textract (1,000 pages/month free for 3 months)

**Key Features:**

typescript

`*// Search API with hybrid approach*
export async function searchLibrary(query: string, filters: SearchFilters) {
  *// 1. FTS for exact matches*
  const ftsResults = await supabase
    .from('docs')
    .select('*')
    .textSearch('fts', query)
    .filter('type', 'in', filters.types)
    .filter('domain', 'overlaps', filters.domains);
  
  *// 2. Vector search for semantic matches*
  const embedding = await generateEmbedding(query);
  const vectorResults = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 20
  });
  
  *// 3. Merge and rank results*
  return mergeResults(ftsResults, vectorResults);
}`

### 2. Correspondence Tables

**Purpose:** Interactive graph of magical relationships and symbolic associations

**Tech Stack:**

- **Graph Database:** Amazon Neptune with Gremlin API (750 hrs t3.medium free)
- **Visualization:** D3.js force-directed graph
- **Sync:** PostgreSQL ↔ Neptune bidirectional sync
- **Fallback:** PostgreSQL JSONB for basic relationships if Neptune unavailable

**Graph Schema:**

javascript

`*// Neptune Gremlin Schema// Vertices*
g.addV('Planet').property('name', 'Venus').property('domain', 'love')
g.addV('Metal').property('name', 'Copper')
g.addV('Herb').property('name', 'Rose')
g.addV('Crystal').property('name', 'Rose Quartz')
g.addV('Sephirah').property('name', 'Netzach').property('number', 7)

*// Edges with properties*
g.V().has('Planet','name','Venus')
  .addE('CORRESPONDS_TO').to(g.V().has('Metal','name','Copper'))
  .property('strength', 0.95)
  .property('tradition', 'hermetic')
  .property('source', 'Agrippa Book 1')

g.V().has('Herb','name','Rose')
  .addE('SUBSTITUTES_FOR').to(g.V().has('Crystal','name','Rose Quartz'))
  .property('context', 'love_ritual')
  .property('effectiveness', 0.75)`

**Query Examples:**

javascript

`*// Find all correspondences for Venus*
g.V().has('Planet', 'name', 'Venus')
  .out('CORRESPONDS_TO')
  .project('type', 'name', 'strength')
  .by(label())
  .by('name')
  .by(inE().values('strength'))

*// Find substitutes with context*
g.V().has('Crystal', 'name', 'Amethyst')
  .out('SUBSTITUTES_FOR')
  .where(inE().has('context', 'protection'))
  .values('name')`

### 3. Personal Grimoire

**Purpose:** Private Notion-like workspace for notes and ritual planning

**Tech Stack:**

- **Editor:** Tiptap (full-featured rich text)
- **Storage:** Supabase PostgreSQL with JSONB
- **Export Engine:** Multiple formats
- **Sync (Future Premium):** Notion API integration

**Editor Features:**

typescript

`import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';

const editor = useEditor({
  extensions: [
    StarterKit,
    Image,
    Link,
    Table,
    *// Custom extensions*
    BacklinkExtension,
    ClipExtension,
    RitualTemplateExtension,
  ],
  content: initialContent,
  onUpdate: ({ editor }) => {
    *// Auto-save with debounce*
    debouncedSave(editor.getJSON());
  }
});`

**Export System:**

typescript

`*// Export handlers*
export const exportFormats = {
  markdown: (content: JSONContent) => tiptapToMarkdown(content),
  
  html: (content: JSONContent) => {
    const html = tiptapToHTML(content);
    return addStyles(html); *// CSS styling*
  },
  
  pdf: async (content: JSONContent) => {
    const html = tiptapToHTML(content);
    return await generatePDF(html); *// jsPDF or Puppeteer*
  },
  
  notion: (content: JSONContent) => {
    *// Special formatting for Notion import*
    return tiptapToNotionMarkdown(content);
  }
};`

### 4. Ritual Inventory System (NEW)

**Purpose:** Track magical tools/ingredients and get AI-powered ritual suggestions

**Tech Stack:**

- **Database:** Supabase PostgreSQL
- **AI Matcher:** Claude API for reasoning
- **Graph Integration:** Neptune queries for substitutions
- **Image Storage:** AWS S3 with signed URLs

**Database Schema:**

sql

`create table user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  category text not null check (category in (
    'herb', 'crystal', 'metal', 'candle', 'incense', 'tool',
    'oil', 'resin', 'wood', 'fabric', 'book', 'other'
  )),
  item_name text not null,
  quantity decimal(10,2),
  unit text,
  quality text,
  condition text,
  acquisition_date date,
  notes text,
  photo_url text,
  tags text[] default '{}',
  correspondences jsonb, *-- {planets: [], elements: [], purposes: []}*
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ritual_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  purpose text,
  tradition text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  source_doc_id text references docs(id),
  required_items jsonb,
  optional_items jsonb,
  instructions jsonb,
  timing jsonb,
  safety_warnings text,
  created_at timestamptz default now(),
  is_public boolean default false
);`

**AI Ritual Matcher:**

typescript

`*// API Route: /api/rituals/match*
export async function POST(req: Request) {
  const { userId, query } = await req.json();
  
  *// 1. Get user's inventory*
  const { data: inventory } = await supabase
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId);
  
  *// 2. Get applicable ritual templates*
  const { data: rituals } = await supabase
    .from('ritual_templates')
    .select('*')
    .eq('is_public', true);
  
  *// 3. Calculate match scores*
  const matches = await Promise.all(
    rituals.map(async (ritual) => {
      const match = calculateMatch(inventory, ritual.required_items);
      const substitutions = await findSubstitutions(
        match.missing,
        inventory,
        ritual.purpose
      );
      
      return {
        ritual,
        matchScore: match.score,
        hasAll: match.hasAll,
        hasItems: match.hasItems,
        missing: match.missing,
        substitutions
      };
    })
  );
  
  *// 4. Sort by relevance*
  const sorted = matches
    .filter(m => m.matchScore >= 0.6)
    .sort((a, b) => b.matchScore - a.matchScore);
  
  return Response.json({ matches: sorted });
}

*// Calculate match between inventory and requirements*
function calculateMatch(
  inventory: InventoryItem[],
  required: RequiredItem[]
) {
  const hasItems = [];
  const missing = [];
  
  for (const req of required) {
    const match = inventory.find(
      item => item.category === req.category && 
              item.item_name.toLowerCase() === req.item.toLowerCase()
    );
    
    if (match && match.quantity >= (req.quantity || 0)) {
      hasItems.push({ ...req, inventoryItem: match });
    } else {
      missing.push(req);
    }
  }
  
  const score = hasItems.length / required.length;
  const hasAll = missing.length === 0;
  
  return { score, hasAll, hasItems, missing };
}

*// Find substitutions using Neptune graph*
async function findSubstitutions(
  missingItems: RequiredItem[],
  inventory: InventoryItem[],
  purpose: string
) {
  const substitutions = [];
  
  for (const missing of missingItems) {
    *// Query Neptune for correspondence-based substitutes*
    const query = `
      g.V().has('${missing.category}', 'name', '${missing.item}')
        .union(
          out('SUBSTITUTES_FOR').where(has('context', '${purpose}')),
          out('CORRESPONDS_TO').out('CORRESPONDS_TO')
        )
        .dedup()
        .project('name', 'reason', 'effectiveness', 'type')
        .by('name')
        .by(coalesce(
          inE('SUBSTITUTES_FOR').values('reason'),
          constant('shares correspondence')
        ))
        .by(coalesce(
          inE('SUBSTITUTES_FOR').values('effectiveness'),
          constant(0.7)
        ))
        .by(label())
        .order().by('effectiveness', desc)
        .limit(5)
    `;
    
    const neptuneResults = await executeGremlinQuery(query);
    
    *// Check which substitutes user actually has*
    const availableSubstitutes = neptuneResults
      .filter(result => 
        inventory.some(item => 
          item.item_name.toLowerCase() === result.name.toLowerCase()
        )
      );
    
    if (availableSubstitutes.length > 0) {
      substitutions.push({
        original: missing,
        substitutes: availableSubstitutes
      });
    }
  }
  
  return substitutions;
}`

**AI-Powered Alternative Suggestions:**

typescript

`*// Use Claude for nuanced reasoning when graph doesn't have data*
async function suggestAlternatives(
  missingItems: RequiredItem[],
  ritual: RitualTemplate,
  inventory: InventoryItem[]
) {
  const prompt = `You are an expert in esoteric practices and magical correspondences.

A practitioner wants to perform this ritual:
- Title: ${ritual.title}
- Purpose: ${ritual.purpose}
- Tradition: ${ritual.tradition}

They are missing these items:
${missingItems.map(i => `- ${i.item} (${i.category})`).join('\n')}

They have these items available:
${inventory.map(i => `- ${i.item_name} (${i.category})`).join('\n')}

Based on traditional correspondences and the ritual's intent, suggest:
1. Items from their inventory that could substitute
2. Explanation of why the substitute maintains the ritual's effectiveness
3. Any modifications needed to the ritual procedure
4. Effectiveness rating (0.0-1.0)

Return JSON array of suggestions with this structure:
[{
  "original": "item name",
  "substitute": "available item",
  "reason": "correspondence explanation",
  "effectiveness": 0.85,
  "modifications": "procedural changes if needed"
}]`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.content[0].text);
}`

---

## Complete Tech Stack

### Backend Services

```
ComponentServiceFree TierNotesDatabaseSupabase PostgreSQL500 MB + AuthPrimary data storeFile StorageAWS S35 GB + 20k GET/2k PUTDocuments, imagesVector Searchpgvector (in Postgres)IncludedSemantic searchGraph DatabaseAmazon Neptune750 hrs t3.mediumCorrespondencesOCRAWS Textract1,000 pages/mo (3 mo)Document processingServerlessAWS Lambda1M invocationsEvent processingOrchestrationn8n (self-hosted)EC2 t2.micro 750 hrsAgent workflowsAI (Metadata)Claude APIPay-per-useDocument classificationAI (Multi-Lens)GPT-4 classPay-per-useAnswer generationAI (Embeddings)text-embedding-3-largePay-per-useVector generation
```

### Frontend Stack

```
ComponentTechnologyPurposeFrameworkNext.js 14 (App Router)React with SSR/ISRStylingTailwindCSS + shadcn/uiModern UI componentsEditorTiptapRich text editingGraph VizD3.jsForce-directed layoutsTablesTanStack Table v8Advanced data tablesUploadReact DropzoneFile handlingChartsRechartsData visualization3D (future)Three.js r128Interactive modelsHostingVercelFree tier deployment
```

### Development Tools

```
ToolPurposeTypeScriptType safetyESLint + PrettierCode qualityGitHub ActionsCI/CDTurborepoMonorepo managementTerraformInfrastructure as CodeVitestUnit testingPlaywrightE2E testing
```

---

## Development Roadmap (Updated with Inventory)

### 🎯 Phase 1: MVP Foundation (Weeks 1-2)

**Goal:** Core infrastructure with zero costs

**Week 1-2 Deliverables:**

- ✅ AWS account setup (S3, Lambda, Textract)
- ✅ Supabase project + PostgreSQL schema
- ✅ Next.js 14 initialization with App Router
- ✅ Supabase Auth configuration
- ✅ Admin portal layout
- ✅ Single file upload to S3 with Lambda trigger

**Implementation Priority:**

typescript

`*// Day 1-2: AWS Setup// 1. Create S3 bucket// 2. Configure CORS// 3. Set up Lambda functions// 4. Create IAM roles// Day 3-4: Supabase// 1. Run schema migrations// 2. Configure RLS policies// 3. Test auth flows// 4. Set up pgvector extension// Day 5-7: Next.js// 1. Initialize project// 2. Configure environment variables// 3. Build upload API route// 4. Test S3 integration*`

### 🚀 Phase 2: Core Features (Weeks 3-4)

**Goal:** Complete admin ingestion pipeline

**Week 3-4 Deliverables:**

- ✅ AWS Textract OCR pipeline
- ✅ AI metadata extraction (Claude Vision)
- ✅ Document type classifier (20 types)
- ✅ Basic public library (search + filters)
- ✅ User accounts with RBAC

**Code Example - OCR Pipeline:**

typescript

`*// lambda/textract-trigger.ts*
import { S3Event } from 'aws-lambda';
import { TextractClient, StartDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { createClient } from '@supabase/supabase-js';

export const handler = async (event: S3Event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  
  const textract = new TextractClient({ region: 'us-east-1' });
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  try {
    *// Start Textract job*
    const command = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: { Bucket: bucket, Name: key }
      },
      NotificationChannel: {
        SNSTopicArn: process.env.SNS_TOPIC_ARN,
        RoleArn: process.env.TEXTRACT_ROLE_ARN
      }
    });
    
    const response = await textract.send(command);
    
    *// Log job to database*
    await supabase.from('agent_logs').insert({
      agent_name: 'textract-trigger',
      action: 'start_ocr',
      doc_id: key.split('/').pop()?.split('.')[0],
      status: 'processing',
      metadata: {
        job_id: response.JobId,
        s3_key: key,
        bucket
      }
    });
    
    return { statusCode: 200, body: JSON.stringify({ jobId: response.JobId }) };
  } catch (error) {
    console.error('Textract trigger failed:', error);
    throw error;
  }
};`

### 🎨 Phase 3: Personal Grimoire (Weeks 5-6)

**Goal:** User workspace with exports

**Week 5-6 Deliverables:**

- ✅ Tiptap rich text editor integration
- ✅ Clip/save passages from library
- ✅ Export system (Markdown, HTML, PDF, Notion)
- ✅ Basic note organization
- ✅ Backlinks system

**Tiptap Integration:**

typescript

`*// components/grimoire/TiptapEditor.tsx*
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';

export function TiptapEditor({ 
  initialContent, 
  onSave 
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { languageClassPrefix: 'language-' }
      }),
      Image.configure({ allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Markdown
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      debouncedSave(json);
    }
  });
  
  return (
    <div className="tiptap-editor">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      <ExportMenu editor={editor} />
    </div>
  );
}`

### 📊 Phase 4: Correspondence Tables (Weeks 7-8)

**Goal:** Interactive graph visualization

**Week 7-8 Deliverables:**

- ✅ Neptune setup (within free tier)
- ✅ Basic graph visualization (D3.js)
- ✅ CRUD interface for correspondences
- ✅ Table view with sorting/filtering
- ✅ PostgreSQL ↔ Neptune sync

**D3.js Graph Component:**

typescript

`*// components/KnowledgeGraph.tsx*
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function KnowledgeGraph({ data }: { data: GraphData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    const width = 1200;
    const height = 800;
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    *// Force simulation*
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));
    
    *// Links*
    const link = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength * 5));
    
    *// Nodes*
    const node = svg.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', 10)
      .attr('fill', d => getColorByType(d.type))
      .call(drag(simulation));
    
    *// Labels*
    const label = svg.append('g')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', 12)
      .attr('dx', 15);
    
    *// Update positions*
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
      
      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });
  }, [data]);
  
  return <svg ref={svgRef} />;
}`

### 🧪 Phase 5: Ritual Inventory (Weeks 9-12)

**Goal:** Complete inventory system with AI matching

**Week 9-12 Deliverables:**

- ✅ Inventory database schema
- ✅ Add/edit/delete items UI
- ✅ Item categorization and tagging
- ✅ Photo upload for inventory items
- ✅ Ritual template library
- ✅ AI ritual matcher
- ✅ Substitution engine
- ✅ Shopping list generator

**Inventory UI Component:**

typescript

`*// components/inventory/InventoryGrid.tsx*
export function InventoryGrid({ userId }: { userId: string }) {
  const { data: inventory, refetch } = useQuery({
    queryKey: ['inventory', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return data;
    }
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {inventory?.map(item => (
        <InventoryCard 
          key={item.id} 
          item={item}
          onEdit={() => openEditModal(item)}
          onDelete={() => handleDelete(item.id)}
        />
      ))}
      <AddItemButton onClick={openAddModal} />
    </div>
  );
}`

### 🤖 Phase 6: Multi-Lens AI (Weeks 13-16)

**Goal:** Full AI-powered answer system

**Week 13-16 Deliverables:**

- ✅ Lens-orchestrated RAG
- ✅ Six-lens answer composition
- ✅ Citation system with confidence
- ✅ Streaming responses
- ✅ Rate limiting (free vs. premium)

**Multi-Lens Implementation:**

typescript

`*// lib/ai/multi-lens.ts*
const LENSES = [
  {
    name: 'Scientific',
    systemPrompt: 'Analyze from physics, cosmology, and biology...',
    retrievalStrategy: 'semantic',
    confidenceThreshold: 0.8
  },
  {
    name: 'Psychological',
    systemPrompt: 'Interpret through Jungian psychology...',
    retrievalStrategy: 'semantic',
    confidenceThreshold: 0.75
  },
  {
    name: 'Symbolic/Occult',
    systemPrompt: 'Decode through correspondences and symbolism...',
    retrievalStrategy: 'graph',
    confidenceThreshold: 0.85
  }
  *// ... other lenses*
];

export async function generateMultiLensAnswer(
  query: string,
  activeLenses: string[]
) {
  *// 1. Route query to retrieval strategies*
  const retrievalResults = await Promise.all(
    activeLenses.map(async (lensName) => {
      const lens = LENSES.find(l => l.name === lensName);
      return await retrieve(query, lens.retrievalStrategy);
    })
  );
  
  *// 2. Generate answers per lens*
  const lensAnswers = await Promise.all(
    activeLenses.map(async (lensName, idx) => {
      const lens = LENSES.find(l => l.name === lensName);
      const context = retrievalResults[idx];
      
      return await generateLensAnswer(
        query,
        context,
        lens.systemPrompt
      );
    })
  );
  
  *// 3. Compose final multi-perspective answer*
  return composeFinalAnswer(query, lensAnswers);
}`

### 🌍 Phase 7: n8n Agent Deployment (Weeks 17-20)

**Goal:** Autonomous agent workflows

**Week 17-20 Deliverables:**

- ✅ 15 n8n workflow JSON files
- ✅ n8n instance on EC2/Railway
- ✅ Webhook integration
- ✅ Inter-agent communication
- ✅ Human-in-the-loop nodes

**Example Workflow:**

json

`{
  "name": "Ritual_Component_Extraction",
  "nodes": [
    {
      "id": "webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": { "path": "extract-components" }
    },
    {
      "id": "claude_extraction",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "model": "claude-3-opus",
        "prompt": "Extract ritual components: herbs, crystals, tools..."
      }
    },
    {
      "id": "validate",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Validate against known items"
      }
    },
    {
      "id": "update_neptune",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "{{$env.NEPTUNE_ENDPOINT}}/gremlin"
      }
    }
  ]
}`

---

## Security & Privacy

### Authentication & Authorization

typescript

`*// Supabase RLS Policies*
create policy "Users see only their own grimoire"
  on user_grimoires for select
  using (auth.uid() = user_id);

create policy "Users manage only their own inventory"
  on user_inventory for all
  using (auth.uid() = user_id);

create policy "Curators can approve documents"
  on docs for update
  using (
    exists (
      select 1 from users
      where id = auth.uid()
      and role in ('curator', 'admin')
    )
  );

*// RBAC in Next.js middleware*
export function requireRole(role: Role) {
  return async (req: NextRequest) => {
    const session = await getSession(req);
    if (!session || !hasRole(session.user, role)) {
      return new Response('Forbidden', { status: 403 });
    }
    return null;
  };
}`

### Data Privacy

1. **Personal Grimoire:** Encrypted at rest, private by default
2. **Inventory:** Never shared unless explicitly published
3. **Photos:** Stored in private S3 buckets with signed URLs (24hr expiry)
4. **Analytics:** Opt-in only, no tracking by default
5. **Export:** Users can export and delete all data

### Cultural Stewardship

sql

- `*- Sensitive content flagging*
alter table docs add column cultural_sensitivity text check (cultural_sensitivity in ('none', 'review', 'restricted'));
alter table docs add column permission_status text check (permission_status in ('public_domain', 'licensed', 'pending', 'restricted'));
*- Workflow: flag → curator review → community consultation → decision*`

---

## Testing Strategy

### Unit Tests

typescript

`*// __tests__/ritual-matcher.test.ts*
describe('Ritual Matcher', () => {
  it('matches complete inventory to ritual', () => {
    const inventory = [
      { category: 'herb', item_name: 'Sage', quantity: 10 },
      { category: 'candle', item_name: 'White Candle', quantity: 2 }
    ];
    
    const ritual = {
      required_items: [
        { category: 'herb', item: 'Sage', quantity: 5 },
        { category: 'candle', item: 'White Candle', quantity: 1 }
      ]
    };
    
    const match = calculateMatch(inventory, ritual.required_items);
    expect(match.hasAll).toBe(true);
    expect(match.score).toBe(1.0);
  });
  
  it('suggests substitutions for missing items', async () => {
    const inventory = [
      { category: 'crystal', item_name: 'Clear Quartz', quantity: 1 }
    ];
    
    const ritual = {
      purpose: 'love',
      required_items: [
        { category: 'crystal', item: 'Rose Quartz', quantity: 1 }
      ]
    };
    
    const subs = await findSubstitutions(ritual, inventory);
    expect(subs).toHaveLength(1);
    expect(subs[0].substitutes[0].name).toBe('Clear Quartz');
    expect(subs[0].substitutes[0].effectiveness).toBeGreaterThan(0.6);
  });
});`

### Integration Tests

typescript

`*// __tests__/ingestion-pipeline.test.ts*
describe('Document Ingestion Pipeline', () => {
  it('processes PDF from upload to published', async () => {
    *// 1. Upload file*
    const file = await uploadTestPDF('test-grimoire.pdf');
    expect(file.s3_key).toBeDefined();
    
    *// 2. Wait for OCR*
    await waitForTextract(file.id, { timeout: 60000 });
    
    *// 3. Check metadata extraction*
    const doc = await getDocument(file.id);
    expect(doc.type).toBeDefined();
    expect(doc.title).toBeDefined();
    expect(doc.ocr_text).toBeTruthy();
    
    *// 4. Verify embeddings*
    const chunks = await getDocChunks(file.id);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].embedding).toBeDefined();
    
    *// 5. Check publication*
    expect(doc.status).toBe('published');
  });
});`

### E2E Tests

typescript

`*// e2e/grimoire-workflow.spec.ts*
import { test, expect } from '@playwright/test';

test('complete grimoire workflow', async ({ page }) => {
  *// Login*
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  *// Create new grimoire page*
  await page.goto('/grimoire');
  await page.click('button:has-text("New Page")');
  await page.fill('[placeholder="Untitled"]', 'My First Ritual');
  
  *// Add content*
  await page.locator('.tiptap-editor').click();
  await page.keyboard.type('This is my ritual planning page.');
  
  *// Clip from library*
  await page.goto('/library');
  await page.click('text=Three Books of Occult Philosophy');
  await page.click('button:has-text("Clip to Grimoire")');
  
  *// Verify clip saved*
  await page.goto('/grimoire');
  await expect(page.locator('text=Three Books of Occult Philosophy')).toBeVisible();
  
  *// Export*
  await page.click('button:has-text("Export")');
  await page.click('text=Export as Markdown');
  
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toContain('.md');
});

test('inventory and ritual matching', async ({ page }) => {
  await page.goto('/inventory');
  
  *// Add inventory items*
  await page.click('button:has-text("Add Item")');
  await page.fill('[name="item_name"]', 'Sage');
  await page.selectOption('[name="category"]', 'herb');
  await page.fill('[name="quantity"]', '10');
  await page.click('button:has-text("Save")');
  
  *// Find matching rituals*
  await page.click('button:has-text("Find Rituals")');
  await expect(page.locator('text=Cleansing Ritual')).toBeVisible();
  await expect(page.locator('.match-score')).toContainText('100%');
  
  *// Check ritual details*
  await page.click('text=Cleansing Ritual');
  await expect(page.locator('.has-items')).toContainText('Sage');
});`

---

## Performance Optimization

### Database Indexes

sql

- `*- Full-text search index*
create index docs_fts_idx on docs using gin(to_tsvector('english', title || ' ' || coalesce(ocr_text, '')));
*- Vector similarity index*
create index doc_chunks_embedding_idx on doc_chunks
using ivfflat (embedding vector_cosine_ops) with (lists = 100);
*- Common query patterns*
create index docs_type_domain_idx on docs (type, domain);
create index docs_status_created_idx on docs (status, created_at desc);
create index user_inventory_user_category_idx on user_inventory (user_id, category);
create index user_grimoires_user_parent_idx on user_grimoires (user_id, parent_id);
*- GIN indexes for array columns*
create index docs_tags_idx on docs using gin(tags);
create index user_inventory_tags_idx on user_inventory using gin(tags);`

### Caching Strategy

typescript

`*// Redis-like caching with Supabase*
export async function getCachedDocument(docId: string) {
  *// Check cache first*
  const cached = await supabase
    .from('cache')
    .select('value')
    .eq('key', `doc:${docId}`)
    .single();
  
  if (cached.data && !isExpired(cached.data.expires_at)) {
    return JSON.parse(cached.data.value);
  }
  
  *// Fetch fresh data*
  const { data: doc } = await supabase
    .from('docs')
    .select('*')
    .eq('id', docId)
    .single();
  
  *// Cache for 1 hour*
  await supabase.from('cache').upsert({
    key: `doc:${docId}`,
    value: JSON.stringify(doc),
    expires_at: new Date(Date.now() + 3600000).toISOString()
  });
  
  return doc;
}

*// Edge caching with Vercel*
export const revalidate = 3600; *// 1 hour ISR*`

### Query Optimization

typescript

`*// Batch requests instead of N+1 queries*
async function getInventoryWithCorrespondences(userId: string) {
  *// BAD: N+1 query*
  const inventory = await getInventory(userId);
  for (const item of inventory) {
    item.correspondences = await getCorrespondences(item.id); *// N queries!*
  }
  
  *// GOOD: Single join query*
  const { data } = await supabase
    .from('user_inventory')
    .select(`
      *,
      correspondence_relationships(*)
    `)
    .eq('user_id', userId);
  
  return data;
}

*// Use pagination for large datasets*
async function searchLibrary(query: string, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  
  const { data, count } = await supabase
    .from('docs')
    .select('*', { count: 'exact' })
    .textSearch('fts', query)
    .range(offset, offset + pageSize - 1);
  
  return {
    docs: data,
    totalPages: Math.ceil(count / pageSize),
    currentPage: page
  };
}`

### Image Optimization

typescript

`*// components/OptimizedImage.tsx*
import Image from 'next/image';

export function OptimizedImage({ src, alt, ...props }) {
  *// Generate S3 signed URL with CloudFront*
  const optimizedSrc = useOptimizedImageUrl(src, {
    width: props.width,
    quality: 85,
    format: 'webp'
  });
  
  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      loading="lazy"
      placeholder="blur"
      blurDataURL={generateBlurDataURL(src)}
      {...props}
    />
  );
}`

---

## Deployment & Infrastructure

### Infrastructure as Code (Terraform)

hcl

`*# terraform/main.tf*
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "grimoire-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

*# S3 Bucket for documents*
resource "aws_s3_bucket" "grimoire_library" {
  bucket = "digital-grimoire-library"
  
  tags = {
    Environment = "production"
    Project     = "digital-grimoire"
  }
}

resource "aws_s3_bucket_versioning" "grimoire_library" {
  bucket = aws_s3_bucket.grimoire_library.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "grimoire_library" {
  bucket = aws_s3_bucket.grimoire_library.id
  
  rule {
    id     = "archive-old-documents"
    status = "Enabled"
    
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

*# Lambda for Textract trigger*
resource "aws_lambda_function" "textract_trigger" {
  filename      = "lambda/textract-trigger.zip"
  function_name = "grimoire-textract-trigger"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256
  
  environment {
    variables = {
      SUPABASE_URL        = var.supabase_url
      SUPABASE_SERVICE_KEY = var.supabase_service_key
      SNS_TOPIC_ARN       = aws_sns_topic.textract_completion.arn
    }
  }
}

*# S3 event notification*
resource "aws_s3_bucket_notification" "textract_trigger" {
  bucket = aws_s3_bucket.grimoire_library.id
  
  lambda_function {
    lambda_function_arn = aws_lambda_function.textract_trigger.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".pdf"
  }
}

*# Neptune cluster for correspondence graph*
resource "aws_neptune_cluster" "grimoire_graph" {
  cluster_identifier                  = "grimoire-correspondences"
  engine                              = "neptune"
  backup_retention_period             = 7
  preferred_backup_window             = "07:00-09:00"
  skip_final_snapshot                 = false
  final_snapshot_identifier           = "grimoire-final-snapshot"
  iam_database_authentication_enabled = true
  
  vpc_security_group_ids = [aws_security_group.neptune.id]
  
  tags = {
    Environment = "production"
  }
}

resource "aws_neptune_cluster_instance" "grimoire_graph" {
  cluster_identifier = aws_neptune_cluster.grimoire_graph.id
  instance_class     = "db.t3.medium"
  engine             = "neptune"
}

*# IAM roles*
resource "aws_iam_role" "lambda_exec" {
  name = "grimoire-lambda-exec"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_textract" {
  name = "lambda-textract-policy"
  role = aws_iam_role.lambda_exec.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "textract:StartDocumentTextDetection",
          "textract:GetDocumentTextDetection"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.grimoire_library.arn,
          "${aws_s3_bucket.grimoire_library.arn}/*"
        ]
      }
    ]
  })
}`

### CI/CD Pipeline

yaml

`*# .github/workflows/deploy.yml*
name: Deploy Digital Grimoire

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Run unit tests
        run: npm run test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next

  deploy-preview:
    needs: build
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Comment PR with preview URL
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Preview deployment ready!'
            })

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Deploy Lambda functions
        run: |
          cd lambda
          zip -r textract-trigger.zip textract-trigger.js
          aws lambda update-function-code \
            --function-name grimoire-textract-trigger \
            --zip-file fileb://textract-trigger.zip
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1

  deploy-infrastructure:
    needs: test
    if: github.ref == 'refs/heads/main' && contains(github.event.head_commit.message, '[terraform]')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
      
      - name: Terraform Init
        run: terraform init
        working-directory: terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Terraform Plan
        run: terraform plan
        working-directory: terraform
      
      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: terraform`

### Monitoring & Observability

typescript

`*// lib/monitoring.ts*
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: 'us-east-1' });

export async function trackMetric(
  metricName: string,
  value: number,
  unit: 'Count' | 'Milliseconds' | 'Bytes' = 'Count'
) {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'DigitalGrimoire',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'Environment', Value: process.env.NODE_ENV || 'development' }
      ]
    }]
  }));
}

*// Usage throughout the app*
await trackMetric('DocumentUploaded', 1);
await trackMetric('OCRProcessingTime', duration, 'Milliseconds');
await trackMetric('RitualMatchGenerated', 1);
await trackMetric('SearchQueryExecuted', 1);

*// SLA tracking*
export async function trackSLA(operation: string, duration: number) {
  const targets = {
    ingest_time: 300000, *// 5 min*
    search_latency: 1000, *// 1 sec*
    ritual_match: 3000, *// 3 sec*
  };
  
  const withinSLA = duration <= targets[operation];
  await trackMetric(`${operation}_sla_met`, withinSLA ? 1 : 0);
  await trackMetric(`${operation}_duration`, duration, 'Milliseconds');
}`

### CloudWatch Alarms

hcl

`*# terraform/monitoring.tf*
resource "aws_cloudwatch_metric_alarm" "s3_storage_warning" {
  alarm_name          = "grimoire-s3-storage-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400"
  statistic           = "Average"
  threshold           = "4500000000" *# 4.5 GB (90% of free tier)*
  alarm_description   = "S3 storage approaching free tier limit"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    BucketName = aws_s3_bucket.grimoire_library.id
    StorageType = "StandardStorage"
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_invocations_warning" {
  alarm_name          = "grimoire-lambda-invocations-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Invocations"
  namespace           = "AWS/Lambda"
  period              = "2592000" *# 30 days*
  statistic           = "Sum"
  threshold           = "900000" *# 90% of 1M free tier*
  alarm_description   = "Lambda invocations approaching free tier limit"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "textract_pages_warning" {
  alarm_name          = "grimoire-textract-pages-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "PageCount"
  namespace           = "DigitalGrimoire"
  period              = "2592000" *# 30 days*
  statistic           = "Sum"
  threshold           = "900" *# 90% of 1000 pages*
  alarm_description   = "Textract pages approaching free tier limit"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name = "grimoire-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}`

---

## Cost Tracking & Optimization

### Monthly Budget Tracking

typescript

`*// lib/budget-tracker.ts*
interface ResourceUsage {
  s3Storage: number; *// GB*
  s3Requests: number;
  lambdaInvocations: number;
  textractPages: number;
  claudeApiCalls: number;
  gpt4ApiCalls: number;
}

const FREE_TIER_LIMITS = {
  s3Storage: 5, *// GB*
  s3GetRequests: 20000,
  s3PutRequests: 2000,
  lambdaInvocations: 1000000,
  textractPages: 1000, *// first 3 months*
  supabaseStorage: 0.5, *// GB*
};

export async function checkBudgetStatus(): Promise<BudgetReport> {
  const usage = await getCurrentUsage();
  
  const report = {
    s3: {
      storage: {
        used: usage.s3Storage,
        limit: FREE_TIER_LIMITS.s3Storage,
        percentage: (usage.s3Storage / FREE_TIER_LIMITS.s3Storage) * 100,
        status: usage.s3Storage < FREE_TIER_LIMITS.s3Storage * 0.9 ? 'safe' : 'warning'
      },
      requests: {
        used: usage.s3Requests,
        limit: FREE_TIER_LIMITS.s3GetRequests,
        percentage: (usage.s3Requests / FREE_TIER_LIMITS.s3GetRequests) * 100,
        status: usage.s3Requests < FREE_TIER_LIMITS.s3GetRequests * 0.9 ? 'safe' : 'warning'
      }
    },
    estimatedMonthlyCost: calculateEstimatedCost(usage)
  };
  
  return report;
}

function calculateEstimatedCost(usage: ResourceUsage): number {
  let cost = 0;
  
  *// S3 overage (after 5GB)*
  if (usage.s3Storage > FREE_TIER_LIMITS.s3Storage) {
    cost += (usage.s3Storage - FREE_TIER_LIMITS.s3Storage) * 0.023;
  }
  
  *// Lambda overage (after 1M invocations)*
  if (usage.lambdaInvocations > FREE_TIER_LIMITS.lambdaInvocations) {
    cost += ((usage.lambdaInvocations - FREE_TIER_LIMITS.lambdaInvocations) / 1000000) * 0.20;
  }
  
  *// AI API costs (no free tier)*
  cost += usage.claudeApiCalls * 0.003; *// ~$0.003 per call*
  cost += usage.gpt4ApiCalls * 0.004; *// ~$0.004 per call*
  
  return cost;
}`

### Cost Optimization Strategies

**1. Batch Processing**

typescript

`*// Queue uploads for batch processing*
export async function queueForBatchOCR(fileKey: string) {
  await supabase.from('ocr_queue').insert({
    s3_key: fileKey,
    status: 'queued',
    priority: 'low'
  });
  
  *// Process in batches of 50 during off-peak hours// This reduces Lambda cold starts and optimizes Textract usage*
}`

**2. Intelligent Caching**

typescript

`*// Cache AI responses to avoid duplicate processing*
export async function getAIMetadata(text: string) {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  
  *// Check cache first*
  const cached = await supabase
    .from('ai_cache')
    .select('response')
    .eq('content_hash', hash)
    .single();
  
  if (cached.data) {
    await trackMetric('AICacheHit', 1);
    return cached.data.response;
  }
  
  *// Fresh API call*
  const response = await callClaudeAPI(text);
  
  *// Cache for 30 days*
  await supabase.from('ai_cache').insert({
    content_hash: hash,
    response,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
  
  await trackMetric('AICacheMiss', 1);
  return response;
}`

**3. S3 Lifecycle Management**

typescript

`*// Automatically archive unused files*
const lifecycleRules = [
  {
    id: 'archive-old-documents',
    status: 'Enabled',
    transitions: [
      { days: 30, storageClass: 'STANDARD_IA' }, *// $0.0125/GB*
      { days: 90, storageClass: 'GLACIER_DEEP_ARCHIVE' } *// $0.00099/GB*
    ]
  },
  {
    id: 'delete-temp-files',
    status: 'Enabled',
    prefix: 'temp/',
    expiration: { days: 7 }
  }
];`

**4. Use Free Alternatives Where Possible**

typescript

`*// pgvector (free) instead of Pinecone ($70/mo)// Supabase Storage (1GB free) for user uploads// Vercel (free) instead of EC2 for frontend// Next.js API routes instead of API Gateway*`

---

## Scaling Path (Beyond Free Tier)

### Phase 1: Small Scale (10-100 users)

**Estimated Cost: $50-100/month**

- **Upgrade Supabase:** $25/mo (Pro plan)
- **S3 Storage:** ~$5/mo for 200GB
- **Lambda:** ~$5/mo for 5M invocations
- **Neptune:** $50/mo (t3.medium)
- **AI APIs:** $10-15/mo
- **Total:** ~$100/month

### Phase 2: Medium Scale (100-1,000 users)

**Estimated Cost: $200-400/month**

- **Database:** Consider RDS PostgreSQL ($50-100/mo)
- **Vector DB:** Upgrade to Qdrant Cloud ($50/mo)
- **CDN:** CloudFront ($20/mo)
- **Neptune:** Scale to r5.large ($150/mo)
- **Caching:** ElastiCache Redis ($30/mo)
- **AI APIs:** $50-100/mo
- **Total:** ~$350/month

### Phase 3: Large Scale (1,000-10,000 users)

**Estimated Cost: $1,000-2,000/month**

- **Database:** RDS with read replicas ($200-400/mo)
- **Search:** Elasticsearch/OpenSearch ($150/mo)
- **Caching:** Multi-node Redis ($100/mo)
- **Neptune:** Multi-AZ cluster ($400/mo)
- **CDN + Storage:** $100/mo
- **AI APIs:** $200-400/mo (with caching)
- **Monitoring:** DataDog or New Relic ($100/mo)
- **Total:** ~$1,500/month

### Revenue Model to Support Scaling

**Free Tier:**

- Public library access
- Basic search
- Personal grimoire (limited pages)
- 5 AI queries/month
- Export to Markdown/HTML

**Premium Tier ($10-20/month):**

- Unlimited grimoire pages
- Unlimited AI queries
- All export formats (PDF, Notion)
- Ritual inventory system
- Advanced correspondence graph
- Priority support

**Pro Tier ($50/month):**

- Bi-directional Notion sync
- API access
- Advanced analytics
- Custom AI training on your documents
- Bulk operations
- White-label options