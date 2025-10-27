export default {
  site: process.env.UNLIGHTHOUSE_SITE_URL || 'http://localhost:3000',
  
  scanner: {
    // Automatically discover and scan all pages
    dynamicSampling: 10, // Sample up to 10 pages per route pattern
    
    // Scan these routes
    samples: [
      '/',
      '/library',
      '/search',
      '/upload',
      '/settings',
      '/auth/login',
      '/auth/signup',
    ],
    
    // Skip these patterns
    exclude: [
      '/api/*',
      '/auth/callback',
      '/auth/reset-password',
      '/_next/*',
      '/pdf-worker/*',
    ],
    
    // Throttle to avoid overwhelming the server
    throttle: true,
    maxRoutes: 50,
  },

  // Lighthouse configuration
  lighthouseOptions: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },

  // Chrome options
  chrome: {
    useSystem: false, // Use bundled Chromium
  },

  // CI mode settings
  ci: {
    buildStatic: true, // Generate static HTML reports
  },

  // Performance budgets
  budgets: {
    performance: 75,
    accessibility: 90,
    'best-practices': 85,
    seo: 90,
  },

  // Debug mode (disable in CI)
  debug: process.env.CI !== 'true',

  // Report configuration
  reporter: {
    // Generate both JSON and HTML reports
    jsonExpanded: true,
    generateBadges: true,
  },

  // Cookies for authenticated routes (set these in CI)
  cookies: process.env.UNLIGHTHOUSE_AUTH_COOKIE 
    ? [
        {
          name: 'auth-token',
          value: process.env.UNLIGHTHOUSE_AUTH_COOKIE,
          domain: new URL(process.env.UNLIGHTHOUSE_SITE_URL || 'http://localhost:3000').hostname,
        },
      ]
    : undefined,
}

