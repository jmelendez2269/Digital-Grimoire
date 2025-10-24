# DIGITAL GRIMOIRE - QUICK START GUIDE

**Goal:** Get your development environment running in 2 hours  
**Prerequisites:** Basic knowledge of Next.js, React, PostgreSQL  

---

## ⚡ IMMEDIATE SETUP (30 minutes)

### 1. Install Required Software

```bash
# Node.js 20+ (using nvm)
nvm install 20
nvm use 20

# pnpm (faster than npm)
npm install -g pnpm

# Verify installations
node --version  # v20.x.x
pnpm --version  # 8.x.x
git --version   # any recent version
```

### 2. Create Next.js Project

```bash
# Navigate to your projects directory
cd "C:\Users\Jen_a\OneDrive\Documents\Projects\Digital Grimore"

# Create Next.js app
pnpm create next-app@latest digital-grimoire-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# Navigate into project
cd digital-grimoire-app

# Open in VS Code
code .
```

### 3. Install Core Dependencies

```bash
# Database & Auth
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs

# AWS SDK
pnpm add @aws-sdk/client-s3 @aws-sdk/client-textract @aws-sdk/lib-storage

# UI Components
pnpm add @radix-ui/react-dropdown-menu @radix-ui/react-dialog class-variance-authority clsx tailwind-merge lucide-react

# Editor
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image tiptap-markdown

# Forms & Validation
pnpm add react-hook-form zod @hookform/resolvers

# Dev Dependencies
pnpm add -D @types/node prettier prettier-plugin-tailwindcss
```

---

## 🗄️ DATABASE SETUP (20 minutes)

### 1. Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub
3. Create new project:
   - Name: `digital-grimoire`
   - Database Password: (generate strong password - save it!)
   - Region: Choose closest to you

### 2. Run Database Schema

1. Wait for project to finish setting up (~2 minutes)
2. Navigate to SQL Editor in Supabase dashboard
3. Copy contents of `../../supabase-schema.sql` from project root
4. Paste and click "Run"
5. Verify: Check "Tables" tab - should see 10+ tables

### 3. Enable pgvector

```sql
-- In SQL Editor, run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Get API Keys

1. Go to Project Settings → API
2. Copy these values (you'll need them next):
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep secret!)

---

## ☁️ AWS SETUP (30 minutes)

### 1. Create AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Sign up (requires credit card, but we'll use free tier)
3. Complete verification

### 2. Create IAM User

```bash
# In AWS Console:
# 1. Search for "IAM"
# 2. Users → Create User
# 3. Name: digital-grimoire-dev
# 4. Attach policies directly:
#    - AmazonS3FullAccess
#    - AmazonTextractFullAccess
#    - AWSLambdaFullAccess
# 5. Create user
# 6. Security credentials → Create access key
# 7. Use case: "Local code"
# 8. SAVE ACCESS KEY ID and SECRET ACCESS KEY
```

### 3. Create S3 Bucket

```bash
# In AWS Console:
# 1. Search for "S3"
# 2. Create bucket
# 3. Name: digital-grimoire-library-[your-name] (must be globally unique)
# 4. Region: us-east-1 (or your preferred region)
# 5. Uncheck "Block all public access" (we'll use presigned URLs)
# 6. Create bucket
```

### 4. Configure CORS

```json
# In your S3 bucket → Permissions → CORS
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## 🔐 ENVIRONMENT VARIABLES (10 minutes)

Create `.env.local` in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET=digital-grimoire-library-yourname

# AI APIs (get these later, optional for now)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ IMPORTANT:** Add `.env.local` to `.gitignore`!

---

## 🎨 CONFIGURE TAILWIND (10 minutes)

Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Digital Grimoire color palette
        grimoire: {
          bg: {
            primary: "#1A3A3A",
            secondary: "#202A44",
            card: "#2A2A2A",
          },
          accent: {
            gold: "#B48F4A",
            burgundy: "#8B2E2E",
            forest: "#2E5E4A",
          },
          text: {
            primary: "#F0EFEB",
            secondary: "#C0BFBB",
          },
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["Source Code Pro", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 🏃 RUN THE APP (5 minutes)

```bash
# Start development server
pnpm dev

# Open browser to http://localhost:3000
# You should see the Next.js default page
```

---

## ✅ VERIFY SETUP

### 1. Test Supabase Connection

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Test in `src/app/page.tsx`:

```typescript
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function Home() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from('users').select('count');
      setConnected(!error);
    }
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-grimoire-bg-primary text-grimoire-text-primary p-8">
      <h1 className="text-4xl font-serif mb-4">Digital Grimoire</h1>
      <p>Database: {connected ? '✅ Connected' : '❌ Not Connected'}</p>
    </div>
  );
}
```

### 2. Test AWS Connection

Create `src/lib/aws.ts`:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

---

## 📝 FIRST TASK: BUILD HOMEPAGE

Create `src/app/page.tsx`:

```typescript
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-grimoire-bg-primary text-grimoire-text-primary">
      {/* Header */}
      <header className="border-b border-grimoire-accent-gold/20 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-serif text-grimoire-accent-gold">
            Digital Grimoire Library
          </h1>
          <nav className="space-x-4">
            <Link href="/library" className="hover:text-grimoire-accent-gold transition">
              Library
            </Link>
            <Link href="/grimoire" className="hover:text-grimoire-accent-gold transition">
              My Grimoire
            </Link>
            <Link href="/login" className="hover:text-grimoire-accent-gold transition">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-6">
          <h2 className="text-6xl font-serif text-grimoire-accent-gold">
            The Library of Alexandria
            <br />
            <span className="text-4xl text-grimoire-text-secondary">
              for Esoteric Wisdom
            </span>
          </h2>
          
          <p className="text-xl text-grimoire-text-secondary max-w-2xl mx-auto">
            A living, evolving collective grimoire bridging ancient wisdom and modern technology.
            Explore thousands of digitized texts, build your personal practice, and contribute to
            the world's most comprehensive esoteric library.
          </p>

          <div className="flex gap-4 justify-center pt-8">
            <Link
              href="/library"
              className="bg-grimoire-accent-gold text-grimoire-bg-primary px-8 py-3 rounded-lg font-semibold hover:bg-grimoire-accent-gold/90 transition"
            >
              Explore Library
            </Link>
            <Link
              href="/register"
              className="border border-grimoire-accent-gold text-grimoire-accent-gold px-8 py-3 rounded-lg font-semibold hover:bg-grimoire-accent-gold/10 transition"
            >
              Sign Up Free
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-grimoire-bg-card p-6 rounded-lg border border-grimoire-accent-gold/20">
            <h3 className="text-xl font-serif text-grimoire-accent-gold mb-2">
              Public Library
            </h3>
            <p className="text-grimoire-text-secondary">
              Access thousands of digitized esoteric texts with full OCR and semantic search.
            </p>
          </div>

          <div className="bg-grimoire-bg-card p-6 rounded-lg border border-grimoire-accent-gold/20">
            <h3 className="text-xl font-serif text-grimoire-accent-gold mb-2">
              Personal Grimoire
            </h3>
            <p className="text-grimoire-text-secondary">
              Build your digital book of shadows with a Notion-like editor and wikilinks.
            </p>
          </div>

          <div className="bg-grimoire-bg-card p-6 rounded-lg border border-grimoire-accent-gold/20">
            <h3 className="text-xl font-serif text-grimoire-accent-gold mb-2">
              Knowledge Graph
            </h3>
            <p className="text-grimoire-text-secondary">
              Explore interactive correspondences between symbols, planets, and traditions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## 💰 FREE TIER STRATEGY

### Budget Management for Bootstrap

**Start with $0/month infrastructure:**
- Only domain registration required (~$12/year)
- 100% free tier infrastructure during development
- Set up billing alerts at 80% of free tier limits
- Don't exceed free tier until you have paying customers

**Free Tier Limits:**
- **Vercel:** Free hosting (Hobby plan)
- **Supabase:** 500MB database, 1GB file storage, 2GB bandwidth
- **AWS S3:** 5GB storage, 20K GET requests, 2K PUT requests
- **AWS Lambda:** 1M invocations/month, 400K GB-seconds compute
- **AWS Textract:** 1,000 pages/month for first 3 months

**Budget Alerts to Set:**

1. **AWS Billing Alert:**
   - Go to AWS Billing Dashboard
   - Set alert at $10/month (indicates free tier breach)
   - Email notification to your address

2. **Supabase Monitoring:**
   - Check database usage in dashboard
   - Alert at 400MB (80% of 500MB limit)
   - Monitor bandwidth usage weekly

3. **Vercel Bandwidth:**
   - Monitor in Vercel dashboard
   - Free tier: 100GB bandwidth/month
   - Alert at 80GB usage

**Cost Progression:**

**Phase 1 (Months 1-3): $0-50/month**
- Stay on free tier completely
- Only cost: Domain (~$1/month)
- **DON'T UPGRADE until:** 200 users, 15 paying ($225 MRR)

**Phase 2 (Months 4-6): $100-200/month**
- Upgrade when $225 MRR is achieved
- Supabase Pro: $25/month
- AWS overages: $50-100/month
- **DON'T UPGRADE until:** 1000 users, 50 paying ($750 MRR)

**Phase 3 (Months 7-12): $500-1000/month**
- Upgrade when $750 MRR is achieved
- Add Neptune, enhanced AI APIs
- **DON'T UPGRADE until:** 2500 users, 125 paying ($1875 MRR)

---

## 🚀 NEXT STEPS

### Week 1 Priorities

1. **Authentication** (Day 1-2)
   - Follow Supabase Next.js auth guide
   - Create login/register pages
   - Implement auth middleware

2. **Library Shell** (Day 3-4)
   - Create `/library` page
   - Build document card component
   - Add mock data for testing

3. **File Upload** (Day 5-6)
   - Create upload form
   - Implement S3 upload
   - Test with sample PDF

4. **Admin Dashboard** (Day 7)
   - Create `/admin` route
   - Role-based access control
   - Upload interface

### Getting Help

- **Next.js:** [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase:** [supabase.com/docs](https://supabase.com/docs)
- **Tailwind:** [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Project Docs:** See `MASTER_DEVELOPMENT_PLAN.md`

---

## 🐛 TROUBLESHOOTING

### "Cannot connect to Supabase"
- Check `.env.local` has correct URL and keys
- Verify project is running in Supabase dashboard
- Check network/firewall settings

### "AWS Access Denied"
- Verify IAM user has correct policies attached
- Check access keys are correct in `.env.local`
- Ensure S3 bucket name is correct

### "Module not found"
- Run `pnpm install` again
- Delete `node_modules` and `.next`, then reinstall
- Check import paths use `@/` alias

### "Database table not found"
- Verify `supabase-schema.sql` ran without errors
- Check table names in SQL match your code
- Look for RLS policy issues (use service key in server)

---

## 📚 RECOMMENDED LEARNING

Before diving in, brush up on:

1. **Next.js 14 App Router** (2 hours)
   - [Next.js tutorial](https://nextjs.org/learn)
   - Server vs. Client Components
   - API routes

2. **Supabase Basics** (1 hour)
   - [Supabase quickstart](https://supabase.com/docs/guides/getting-started)
   - PostgreSQL queries
   - Row Level Security

3. **Tailwind CSS** (1 hour)
   - [Tailwind fundamentals](https://tailwindcss.com/docs/utility-first)
   - Dark mode
   - Custom theming

---

**You're ready to build! 🚀**

Next: See `PROJECT_ROADMAP.md` for detailed sprint tasks.

