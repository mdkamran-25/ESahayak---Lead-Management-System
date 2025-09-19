import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only run ESLint on specific directories during production builds
    dirs: ['src'],
    // Ignore ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during production builds if needed
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
