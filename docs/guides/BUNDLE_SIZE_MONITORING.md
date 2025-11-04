# Bundle Size Monitoring Guide

## Overview

This guide explains how to monitor and manage bundle sizes in the Digital Grimoire application. Bundle size monitoring helps ensure optimal performance and prevents unexpected regressions.

---

## Manual Monitoring

### Running Bundle Analysis

To analyze bundle sizes locally, use the built-in Next.js bundle analyzer:

```bash
cd Digital-Grimoire/app
pnpm build:analyze
```

This command:
1. Builds the application with bundle analysis enabled
2. Opens an interactive visualization in your browser
3. Shows the size of each chunk and module

### Understanding the Output

The bundle analyzer displays:

- **Chunk Size**: Total size of each JavaScript chunk
- **Module Breakdown**: Individual modules within each chunk
- **Route Analysis**: Bundle sizes per route/page
- **First Load JS**: Total JavaScript loaded on initial page visit

### Interpreting Results

- **Green**: Sizes are within acceptable limits
- **Yellow**: Approaching budget limits (warning)
- **Red**: Exceeding budget limits (action required)

---

## Bundle Budgets

### Budget Configuration

Bundle budgets are defined in `.bundle-budgets.json`:

```json
{
  "budgets": [
    {
      "path": "/",
      "firstLoadJS": 300000,
      "firstLoadCSS": 50000,
      "totalPageSize": 500000
    }
  ],
  "global": {
    "maxTotalSize": 1000000,
    "warningThreshold": 0.9
  }
}
```

### Budget Limits

| Route | First Load JS | CSS | Total Page Size |
|-------|---------------|-----|----------------|
| `/` (Home) | 300 KB | 50 KB | 500 KB |
| `/library` | 350 KB | 50 KB | 600 KB |
| `/library/[id]` | 400 KB | 50 KB | 700 KB |
| `/convergence-machine` | 350 KB | 50 KB | 600 KB |
| `/journal` | 300 KB | 50 KB | 500 KB |
| **Global** | - | - | 1 MB |

### Updating Budgets

To update budget limits:

1. Edit `Digital-Grimoire/app/.bundle-budgets.json`
2. Adjust the `firstLoadJS`, `firstLoadCSS`, or `totalPageSize` values
3. Commit the changes
4. The CI/CD pipeline will use the new budgets on the next build

**Note**: Only increase budgets when absolutely necessary. Consider optimization first.

---

## Automated Monitoring (CI/CD)

### GitHub Actions Workflow

Bundle size checks run automatically on:

- **Pull Requests**: All PRs to `main` branch
- **Pushes to Main**: Every push to main branch
- **Manual Triggers**: Via GitHub Actions UI

### Workflow Steps

1. **Build**: Creates production build with bundle analyzer
2. **Extract**: Parses bundle sizes from analysis output
3. **Check**: Compares sizes against budgets
4. **Report**: Comments on PR with results
5. **Fail**: Fails PR if budgets exceeded

### PR Comments

When a PR is created, the workflow automatically comments with:

- Total bundle size
- Route-specific sizes
- Violations (if any)
- Comparison against budgets

### Workflow Failure

If bundle sizes exceed budgets:

- PR status shows as "failed"
- PR comment highlights violations
- Merge is blocked until fixed

---

## Reducing Bundle Sizes

### Common Strategies

1. **Code Splitting**
   - Use dynamic imports for heavy components
   - Lazy load routes that aren't immediately needed
   - Split vendor bundles from application code

2. **Remove Unused Dependencies**
   - Audit dependencies regularly
   - Remove unused packages
   - Use tree-shaking friendly imports

3. **Optimize Imports**
   - Import only what you need: `import { debounce } from 'lodash/debounce'`
   - Avoid barrel imports when possible
   - Use Next.js `optimizePackageImports` config

4. **Image Optimization**
   - Use Next.js `<Image>` component
   - Serve images in modern formats (WebP, AVIF)
   - Lazy load images below the fold

5. **Bundle Analysis**
   - Identify large dependencies
   - Consider alternatives for heavy libraries
   - Split large dependencies into separate chunks

### Example: Dynamic Import

```typescript
// Before: Eager import (adds to initial bundle)
import HeavyComponent from '@/components/HeavyComponent';

// After: Dynamic import (loads on-demand)
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
```

---

## Troubleshooting

### Bundle Size Suddenly Increased

**Check:**
1. New dependencies added?
2. New routes/pages created?
3. Large files imported?
4. Vendor bundle size changed?

**Solution:**
- Run `pnpm build:analyze` to identify the source
- Check the diff for new imports
- Consider code splitting for new features

### CI Workflow Failing

**Common Issues:**

1. **"Bundle analyzer output not found"**
   - Ensure `ANALYZE=true` is set in build step
   - Check that `@next/bundle-analyzer` is installed

2. **"Budget file not found"**
   - Verify `.bundle-budgets.json` exists in `app/` directory
   - Check file path in workflow

3. **"Incorrect bundle sizes"**
   - Verify build completes successfully
   - Check that environment variables are set correctly

### Updating Budgets Temporarily

If you need to temporarily increase a budget:

1. Update `.bundle-budgets.json`
2. Add a comment explaining why
3. Create an issue to track optimization
4. Revert after optimization is complete

---

## Best Practices

1. **Monitor Regularly**
   - Check bundle sizes before major releases
   - Review PR comments for size changes
   - Set up alerts for significant increases

2. **Optimize Proactively**
   - Don't wait for budgets to be exceeded
   - Review bundle sizes when adding features
   - Consider bundle impact in code reviews

3. **Document Changes**
   - Explain budget increases in PR descriptions
   - Track optimization efforts
   - Share learnings with the team

4. **Use Tools**
   - Leverage Next.js bundle analyzer
   - Use React DevTools Profiler
   - Monitor Core Web Vitals

---

## Related Documentation

- [Performance Optimization Report](../PERFORMANCE_OPTIMIZATION_REPORT.md)
- [Performance Testing Guide](./PERFORMANCE_TESTING.md)
- [Next.js Bundle Analysis](https://nextjs.org/docs/app/building-your-application/analyzing/bundles)

---

## Quick Reference

### Commands

```bash
# Analyze bundle sizes
pnpm build:analyze

# Build without analysis
pnpm build

# Check bundle sizes manually
node -e "const data = require('.next/analyze/client.json'); console.log(JSON.stringify(data, null, 2))"
```

### Files

- `Digital-Grimoire/app/.bundle-budgets.json` - Budget configuration
- `.github/workflows/bundle-size-check.yml` - CI/CD workflow
- `Digital-Grimoire/app/.next/analyze/` - Bundle analysis output

---

**Last Updated**: 2024-12-19

