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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
  // Compress output
  compress: true,
  // Production source maps disabled for smaller bundle
  productionBrowserSourceMaps: false,
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
    
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
