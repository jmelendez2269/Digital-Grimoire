# Performance Testing with Unlighthouse

This guide covers automated performance testing for Digital Grimoire using Unlighthouse, a modern site-wide performance auditing tool built on Google Lighthouse.

## 🎯 Why Unlighthouse?

- **Automated site-wide scanning** - Discovers and tests all routes automatically
- **Beautiful visual reports** - Interactive UI with detailed metrics
- **Modern TypeScript-first** - Native Next.js integration
- **CI/CD ready** - GitHub Actions workflow included
- **Google Lighthouse under the hood** - Industry-standard metrics

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Local Testing](#local-testing)
- [CI/CD Integration](#cicd-integration)
- [Configuration](#configuration)
- [Performance Budgets](#performance-budgets)
- [Reading Reports](#reading-reports)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Run performance tests locally:

```bash
cd Digital-Grimoire/app

# Start your dev server
pnpm dev

# In another terminal, run Unlighthouse
pnpm perf
```

This will:
1. Scan your site starting from http://localhost:3000
2. Discover all linked pages
3. Run Lighthouse audits on each page
4. Open an interactive dashboard in your browser

## 🔬 Local Testing

### Available Scripts

```bash
# Standard performance audit with interactive UI
pnpm perf

# CI mode (static reports, no UI)
pnpm perf:ci

# Debug mode with verbose logging
pnpm perf:debug
```

### Testing Specific Pages

Edit `unlighthouse.config.ts` to focus on specific routes:

```typescript
scanner: {
  samples: [
    '/',
    '/library',
    '/search',
    // Add your routes here
  ],
}
```

### Testing Authenticated Routes

To test pages that require authentication:

1. **Option A: Use cookies** (Recommended)

```bash
# Get your auth cookie from browser DevTools
export UNLIGHTHOUSE_AUTH_COOKIE="your-cookie-value"
pnpm perf
```

2. **Option B: Disable auth temporarily** for testing (not recommended for production)

### Interactive Dashboard

When you run `pnpm perf`, Unlighthouse opens a dashboard at http://localhost:5678 showing:

- **Overview**: Site-wide performance metrics
- **Routes**: Individual page scores
- **Warnings**: Issues to fix
- **Reports**: Detailed Lighthouse reports for each page

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The workflow runs automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main`
- Weekly on Mondays at 3 AM UTC
- Manual triggers via GitHub Actions UI

### Required GitHub Secrets

Add these secrets in **Settings → Secrets → Actions**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Viewing CI Results

1. Go to **Actions** tab in GitHub
2. Click on the latest **Performance Testing** run
3. Download the `unlighthouse-reports` artifact
4. Extract and open `index.html` in your browser

### Performance Budget Enforcement

The CI workflow fails if scores fall below:
- **Performance**: 75
- **Accessibility**: 90
- **Best Practices**: 85
- **SEO**: 90

### PR Comments

On pull requests, a bot automatically comments with:
- Score summary table
- Pass/fail status for each category
- Link to download full reports

## ⚙️ Configuration

### Main Configuration File

`unlighthouse.config.ts` contains all settings:

```typescript
export default {
  site: 'http://localhost:3000',
  
  scanner: {
    samples: [/* routes to scan */],
    exclude: [/* patterns to skip */],
    maxRoutes: 50,
  },
  
  budgets: {
    performance: 75,
    accessibility: 90,
    'best-practices': 85,
    seo: 90,
  },
}
```

### Common Configuration Options

#### Increase scan depth
```typescript
scanner: {
  dynamicSampling: 20, // Sample more pages per pattern
  maxRoutes: 100,      // Scan more total routes
}
```

#### Add custom Lighthouse options
```typescript
lighthouseOptions: {
  throttling: {
    cpuSlowdownMultiplier: 4,
  },
  screenEmulation: {
    mobile: true,
  },
}
```

#### Test against production
```typescript
site: 'https://your-production-url.com',
```

## 📊 Performance Budgets

### Current Budgets

| Category | Minimum Score | Why |
|----------|--------------|-----|
| Performance | 75 | Fast page loads are critical for UX |
| Accessibility | 90 | Ensure inclusive design |
| Best Practices | 85 | Follow web standards |
| SEO | 90 | Maintain search visibility |

### Adjusting Budgets

Edit `budgets` in `unlighthouse.config.ts`:

```typescript
budgets: {
  performance: 80,  // More strict
  accessibility: 95,
  'best-practices': 90,
  seo: 95,
}
```

Also update the GitHub workflow at `.github/workflows/performance-testing.yml`:

```javascript
if (perf < 80) { // Match your new budget
  console.error('❌ Performance score below threshold (80)');
  failed = true;
}
```

## 📖 Reading Reports

### Key Metrics to Watch

#### Performance
- **First Contentful Paint (FCP)**: When first content appears (< 1.8s good)
- **Largest Contentful Paint (LCP)**: When main content loads (< 2.5s good)
- **Time to Interactive (TTI)**: When page becomes interactive (< 3.8s good)
- **Cumulative Layout Shift (CLS)**: Visual stability (< 0.1 good)
- **Total Blocking Time (TBT)**: Main thread blocking time (< 200ms good)

#### Accessibility
- Color contrast ratios
- ARIA attributes
- Keyboard navigation
- Alt text on images
- Form labels

#### Best Practices
- HTTPS usage
- Console errors
- Image aspect ratios
- Browser compatibility

#### SEO
- Meta descriptions
- Title tags
- Mobile friendliness
- Structured data

### Understanding Scores

- **90-100**: Green (Excellent)
- **50-89**: Orange (Needs improvement)
- **0-49**: Red (Poor)

### Common Issues and Fixes

#### Low Performance Score

**Issue**: Large bundle sizes
- **Fix**: Use dynamic imports, code splitting
- **See**: `next.config.ts` for bundle analyzer

**Issue**: Unoptimized images
- **Fix**: Use Next.js `<Image>` component
- **Check**: All images use `next/image`

**Issue**: Blocking resources
- **Fix**: Defer non-critical JS/CSS
- **Use**: `next/script` with `strategy="defer"`

#### Low Accessibility Score

**Issue**: Missing alt text
- **Fix**: Add descriptive alt attributes to all images

**Issue**: Color contrast
- **Fix**: Use higher contrast colors, check with tools

**Issue**: Missing form labels
- **Fix**: Add labels or aria-label to inputs

#### Low Best Practices Score

**Issue**: Console errors
- **Fix**: Check browser console, fix errors

**Issue**: HTTP resources on HTTPS
- **Fix**: Ensure all resources use HTTPS

## 🔧 Troubleshooting

### "Cannot connect to http://localhost:3000"

**Cause**: Server not running
**Fix**: Start your dev server first with `pnpm dev`

### "No routes found"

**Cause**: Site not accessible or all routes excluded
**Fix**: Check `exclude` patterns in config, ensure site is running

### "Timeout waiting for page"

**Cause**: Page takes too long to load
**Fix**: 
- Increase timeout in config
- Check for infinite loading states
- Ensure dev server is responding

### "Chrome failed to start"

**Cause**: Missing dependencies (Linux)
**Fix**: Install Chrome dependencies
```bash
sudo apt-get install -y chromium-browser
```

### "Out of memory" error

**Cause**: Scanning too many routes
**Fix**: Reduce `maxRoutes` or increase Node memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 pnpm perf
```

### Reports not generating

**Cause**: Write permission issues
**Fix**: Check `.unlighthouse/` directory permissions

### Authentication issues in CI

**Cause**: Missing or invalid auth cookies
**Fix**: Set `UNLIGHTHOUSE_AUTH_COOKIE` secret in GitHub

## 📚 Advanced Usage

### Testing Mobile Performance

```typescript
lighthouseOptions: {
  screenEmulation: {
    mobile: true,
    width: 375,
    height: 667,
  },
}
```

### Custom User Agent

```typescript
chrome: {
  useSystem: false,
  args: [
    '--user-agent=Custom User Agent String'
  ],
}
```

### Testing with Different Network Conditions

```typescript
lighthouseOptions: {
  throttling: {
    rttMs: 150,           // Round trip time
    throughputKbps: 1638, // ~2G speed
    cpuSlowdownMultiplier: 4,
  },
}
```

### Comparing Performance Over Time

1. Save reports with timestamps:
```bash
pnpm perf:ci
mv .unlighthouse/ci-result.json ./reports/$(date +%Y%m%d).json
```

2. Compare results:
```bash
diff reports/20251020.json reports/20251027.json
```

## 🎯 Best Practices

### When to Run Tests

- **Locally**: Before committing major changes
- **CI**: On every PR and main branch push
- **Scheduled**: Weekly to catch regressions
- **Production**: Monthly against live site

### What to Monitor

1. **Core Web Vitals** (Google ranking factors)
   - LCP, FID, CLS
2. **Accessibility scores** (legal compliance)
3. **Performance trends** (regressions over time)
4. **Page-specific issues** (problem areas)

### Performance Testing Workflow

1. **Before feature**: Establish baseline scores
2. **During development**: Test locally with `pnpm perf`
3. **Before PR**: Run full audit, fix issues
4. **CI check**: Automated validation
5. **Post-deployment**: Verify production performance

## 🔗 Related Documentation

- [Next.js Performance Docs](../../docs/PERFORMANCE_MONITORING.md)
- [Unlighthouse Official Docs](https://unlighthouse.dev/)
- [Google Lighthouse Docs](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals Guide](https://web.dev/vitals/)

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review Unlighthouse logs with `pnpm perf:debug`
3. Check GitHub Actions logs for CI failures
4. Consult [Unlighthouse GitHub Issues](https://github.com/harlan-zw/unlighthouse/issues)

---

**Last Updated**: October 27, 2025  
**Version**: 1.0.0  
**Maintained By**: Digital Grimoire Team

