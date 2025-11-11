export default {
  site: process.env.UNLIGHTHOUSE_SITE_URL || 'http://localhost:3000',
  
  scanner: {
    // Automatically discover and scan all pages
    dynamicSampling: 10, // Sample up to 10 pages per route pattern
    
    // Scan these key routes
    samples: [
      '/',
      '/library',
      '/search',
      '/upload',
      '/settings',
      '/login',
      '/register',
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
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  },

  // CI mode settings
  ci: {
    buildStatic: true,
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
    jsonExpanded: true,
    generateBadges: true,
  },

  // Cookies for authenticated routes (optional - for testing protected routes)
  // To test protected routes, get your auth cookie from browser DevTools and set:
  // UNLIGHTHOUSE_AUTH_COOKIE="your-supabase-session-cookie"
  cookies: process.env.UNLIGHTHOUSE_AUTH_COOKIE 
    ? [
        {
          name: 'sb-access-token', // Supabase uses this cookie name
          value: process.env.UNLIGHTHOUSE_AUTH_COOKIE,
          domain: 'localhost',
        },
      ]
    : undefined,
}

