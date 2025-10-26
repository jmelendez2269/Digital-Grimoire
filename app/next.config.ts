import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['lucide-react', '@react-pdf-viewer/core', '@react-pdf-viewer/default-layout'],
  },
  webpack: (config, { isServer, webpack }) => {
    // Exclude canvas and other native modules from client-side bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        encoding: false,
      };
      
      // Use IgnorePlugin to completely ignore canvas module
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^canvas$/,
          contextRegExp: /pdfjs-dist|canvas/,
        })
      );
    }
    
    // Fallback for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    
    return config;
  },
};

export default nextConfig;
