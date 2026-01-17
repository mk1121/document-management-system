import type { NextConfig } from "next";

// Configuration for Capacitor builds - static export without API routes
// API routes should be deployed separately and accessed via NEXT_PUBLIC_API_BASE_URL
const nextConfig: NextConfig = {
  output: 'export',  // Static export for Capacitor
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
  },
};

export default nextConfig;
