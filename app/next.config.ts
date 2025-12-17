import {withSentryConfig} from '@sentry/nextjs';
import type { NextConfig } from "next";

// Bundle analyzer for performance monitoring
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

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
    // Explicit domains list for external images used in the app
    domains: [
      'covers.openlibrary.org',
      'th.bing.com',
    ],
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
        hostname: 'th.bing.com',
      },
      {
        protocol: 'https',
        // Allow Google profile pictures
        hostname: '*.googleusercontent.com',
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
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-insights.com https://*.sentry.io https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.cloudflare.com https://*.r2.dev https://*.supabase.co https://*.supabase.in https://covers.openlibrary.org https://th.bing.com https://*.googleusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.cloudflare.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.cognitiveservices.azure.com https://api.openai.com https://*.vercel-insights.com https://*.sentry.io https://vitals.vercel-insights.com",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
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
    
    // Note: OpenTelemetry instrumentation issues are handled by Sentry's Next.js SDK
    // If MODULE_NOT_FOUND errors occur, they're typically resolved by Sentry's webpack config
    
    return config;
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "convergence-qa",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});