# Digital Grimoire - Quick Start Guide

## Starting the Server

### Development Mode (Recommended for Development)

```bash
cd Digital-Grimoire\app
pnpm dev
```

- Runs on **<http://localhost:3000>**
- Includes hot reloading
- Best for active development

### Production Mode

```bash
cd Digital-Grimoire\app
pnpm build
pnpm start
```

- First build the optimized production bundle
- Then start the production server
- Use this for testing production behavior

## Other Useful Commands

### Linting

```bash
cd Digital-Grimoire\app
pnpm lint
```

### Performance Testing

```bash
cd Digital-Grimoire\app
pnpm perf                # Run performance analysis
pnpm perf:debug         # Run with debug output
pnpm perf:ci            # Run in CI mode with static build
```

### Bundle Analysis

```bash
cd Digital-Grimoire\app
pnpm build:analyze
```

- Analyzes the build bundle size
- Helps identify large dependencies

### Seed Kybalion Data

```bash
cd Digital-Grimoire\app
pnpm seed:kybalion
```

- Seeds the database with Kybalion content
- See KYBALION_IMPLEMENTATION.md for more details

## Project Structure

```
Digital-Grimoire/
├── app/                    # Next.js application
│   ├── src/               # Source code
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utility libraries
│   ├── public/           # Static assets
│   └── scripts/          # Utility scripts
├── docs/                  # Documentation
├── migrations/           # Database migrations
└── lambda/               # AWS Lambda functions
```

## Environment Setup

Make sure you have a `.env.local` file in the `app` directory with the required environment variables:

- Supabase credentials
- Azure/AWS credentials (if using OCR)
- Any other service API keys

See the setup documentation in `docs/Setup Docs/` for detailed configuration.

## Prerequisites

- Node.js (v20+)
- pnpm package manager
- Supabase project configured
- Environment variables set up

## Common Issues

### EBUSY Error

If you encounter EBUSY errors on Windows, run:

```powershell
.\fix-ebusy.ps1
```

### Port Already in Use

If port 3000 is already in use, you can specify a different port:

```bash
pnpm dev -- -p 3001
```

**Note:** The application is configured to use port 3000 by default. If you need to use a different port, make sure to update CORS configurations and redirect URLs in Supabase/Google OAuth accordingly.

## Documentation

For more detailed information, see:

- `KYBALION_IMPLEMENTATION.md` - Kybalion feature implementation
- `docs/` - Comprehensive documentation
- `README.md` - Project overview
- `WHATS_NEW.md` - Latest features and changes
- `DEVELOPMENT_WORKFLOW.md` - **READ THIS**: Safe development & deployment guide
