import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['lucide-react', '@react-pdf-viewer/core', '@react-pdf-viewer/default-layout'],
  },
};

export default nextConfig;
