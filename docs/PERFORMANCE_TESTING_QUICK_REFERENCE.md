# Unlighthouse Performance Testing - Quick Reference

## 🚀 Common Commands

```bash
# Start dev server (required first)
pnpm dev

# Run performance audit with UI
pnpm perf

# Run CI mode (static reports)
pnpm perf:ci

# Debug mode (verbose logging)
pnpm perf:debug
```

## 📊 Performance Budgets

| Category | Threshold | Current Target |
|----------|-----------|----------------|
| Performance | ≥75 | 🎯 80+ |
| Accessibility | ≥90 | 🎯 95+ |
| Best Practices | ≥85 | 🎯 90+ |
| SEO | ≥90 | 🎯 95+ |

## 🔍 Quick Checks

### Before Committing
```bash
pnpm perf  # Interactive scan
```
Review scores in dashboard at http://localhost:5678

### Testing Specific Routes
Edit `unlighthouse.config.ts`:
```typescript
scanner: {
  samples: [
    '/your-route',
  ],
}
```

### Testing with Auth
```bash
export UNLIGHTHOUSE_AUTH_COOKIE="your-cookie"
pnpm perf
```

## 🎯 Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤2.5s | 2.5-4.0s | >4.0s |
| **FID** (First Input Delay) | ≤100ms | 100-300ms | >300ms |
| **CLS** (Cumulative Layout Shift) | ≤0.1 | 0.1-0.25 | >0.25 |

## 🐛 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| "Cannot connect" | Start dev server: `pnpm dev` |
| "No routes found" | Check site is running, review excludes |
| Chrome errors | Install dependencies or use system Chrome |
| Out of memory | Reduce `maxRoutes` in config |

## 📁 Output Locations

- **Local reports**: `.unlighthouse/`
- **CI reports**: Artifacts in GitHub Actions
- **Config**: `unlighthouse.config.ts`

## 🔗 Key Files

- **Config**: `app/unlighthouse.config.ts`
- **Workflow**: `.github/workflows/performance-testing.yml`
- **Full Guide**: `docs/guides/PERFORMANCE_TESTING.md`

## 💡 Pro Tips

1. **Run locally before PR** to catch issues early
2. **Focus on mobile performance** - it's typically worse
3. **Check console errors** - they hurt best practices score
4. **Use Next.js Image** - automatic optimization
5. **Monitor trends** - one bad score might be okay, trends matter

## 📞 Need Help?

See full guide: `docs/guides/PERFORMANCE_TESTING.md`

