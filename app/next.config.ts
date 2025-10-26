import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-pdf'],
  },
  // Optimize external packages
  transpilePackages: ['react-pdf', 'pdfjs-dist'],
  // Webpack configuration for better PDF.js support
  webpack: (config, { isServer }) => {
    // PDF.js worker configuration
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    
    // Handle PDF.js worker files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
};

export default nextConfig;
