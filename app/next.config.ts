import type { NextConfig } from "next";

// Bundle analyzer for performance monitoring
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});


import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  // Set workspace root to prevent multiple lockfile warnings
  outputFileTracingRoot: require('path').join(__dirname),
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
  },
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    // Use remotePatterns instead of deprecated domains
    remotePatterns: [
      {
        protocol: 'https',
        // Allow images from Cloudflare (R2 and related endpoints)
        hostname: 'cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
      {
        protocol: 'https',
        hostname: '*.bing.com',
      },
      {
        protocol: 'https',
        hostname: '*.mm.bing.net',
      },
      {
        protocol: 'https',
        hostname: '*.bing.net',
      },
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'images.gr-assets.com',
      },
      {
        protocol: 'https',
        // Allow Internet Archive images
        hostname: 'archive.org',
      },
      {
        protocol: 'https',
        // Allow Google profile pictures
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        // Allow Amazon book cover images
        hostname: '*.media-amazon.com',
      },
      {
        protocol: 'https',
        // Allow Amazon SSL image domains (Goodreads, etc.)
        hostname: '*.ssl-images-amazon.com',
      },
      {
        protocol: 'https',
        // Allow Project Gutenberg images
        hostname: 'www.gutenberg.org',
      },
      {
        protocol: 'https',
        // Allow ThriftBooks images
        hostname: 'i.thriftbooks.com',
      },
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.getimg.ai',
      },
      {
        protocol: 'https',
        hostname: 'www.mjppublishers.com',
      },
      {
        protocol: 'https',
        hostname: 'enlightenmentmedianews.com',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
    ],
  },
  // Compress output
  compress: true,
  // Production source maps disabled for smaller bundle
  productionBrowserSourceMaps: false,
  // Security headers
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Content Security Policy
    // Allow necessary services: Supabase, Cloudflare R2, Azure, OpenAI, Vercel Analytics, Sentry
    // In development, allow localhost connections for Sentry tunnel
    const connectSrc = isProduction
      ? "'self' https://*.supabase.co https://*.supabase.in https://*.cloudflare.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.cognitiveservices.azure.com https://api.openai.com https://*.vercel-insights.com https://*.sentry.io https://vitals.vercel-insights.com https://cloudflareinsights.com https://static.cloudflareinsights.com"
      : "'self' http://localhost:* http://127.0.0.1:* https://*.supabase.co https://*.supabase.in https://*.cloudflare.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.cognitiveservices.azure.com https://api.openai.com https://*.vercel-insights.com https://*.sentry.io https://vitals.vercel-insights.com https://cloudflareinsights.com https://static.cloudflareinsights.com";

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-insights.com https://*.sentry.io https://va.vercel-scripts.com https://accounts.google.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.cloudflare.com https://*.r2.dev https://*.supabase.co https://*.supabase.in https://covers.openlibrary.org https://*.bing.com https://*.mm.bing.net https://*.bing.net https://archive.org https://*.googleusercontent.com https://*.media-amazon.com https://*.ssl-images-amazon.com https://www.gutenberg.org https://i.thriftbooks.com https://books.google.com https://*.googleapis.com https://*.getimg.ai https://www.mjppublishers.com https://*.gstatic.com https://images.gr-assets.com https://enlightenmentmedianews.com https://images-na.ssl-images-amazon.com https://m.media-amazon.com",
      "font-src 'self' data:",
      `connect-src ${connectSrc} https://accounts.google.com`,
      "worker-src 'self' blob:",
      "frame-src 'self' https://*.supabase.co https://*.supabase.in https://accounts.google.com https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join('; ');

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Strict-Transport-Security (HSTS) - only in production
          ...(isProduction
            ? [
              {
                key: 'Strict-Transport-Security',
                value: 'max-age=31536000; includeSubDomains; preload',
              },
            ]
            : []),
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy (formerly Feature Policy)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      // Static assets with content hash - long-term caching
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images from Next.js Image Optimization
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Public static files - match common file extensions
      {
        source: '/:path*.:ext(ico|png|jpg|jpeg|svg|webp|avif|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    // Completely ignore canvas module
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^canvas$/,
        contextRegExp: /.*/,
      })
    );

    // Set canvas alias to false
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };

    // Fallback for node modules  
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      canvas: false,
    };

    // Ensure proper module resolution for TypeScript path aliases
    if (!isServer) {
      config.resolve.modules = [
        ...(config.resolve.modules || []),
        require('path').join(__dirname, 'src'),
      ];
    }

    // Note: OpenTelemetry instrumentation issues are handled by Sentry's Next.js SDK
    // If MODULE_NOT_FOUND errors occur, they're typically resolved by Sentry's webpack config

    return config;
  },
};

// Wrap with Sentry
export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during bundling
  silent: true,
  org: "convergence-qa",
  project: "javascript-nextjs",

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Routes HTTP requests through "Monitoring" to circumvent ad-blockers (requires additional setup)
  tunnelRoute: "/monitoring",

  // Bundler-level optimizations
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  },
});



