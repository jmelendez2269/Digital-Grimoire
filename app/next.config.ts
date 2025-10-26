import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['lucide-react', '@react-pdf-viewer/core', '@react-pdf-viewer/default-layout'],
  },
  webpack: (config, { isServer }) => {
    // Exclude canvas from client-side bundle
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
};

export default nextConfig;
