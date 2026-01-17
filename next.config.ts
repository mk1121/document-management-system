import type { NextConfig } from "next";

const nextConfig: NextConfig = {  // output: 'export',  // Disabled for API routes to work - use next.config.capacitor.ts for Capacitor builds
  // পরিবর্তন: 'http://' বাদ দেওয়া হয়েছে
  allowedDevOrigins: [
    "localhost:3000",
    "192.168.1.154:3000" 
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
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
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '/home/nts/**', 
          '!/home/nts/project/docu3/**', 
          '**/node_modules/**',
          '**/react/**',
          '**/.next/**',
          '**/backend/**',
          '**/docs/**',
          '**/dev-dist/**',
          '**/public/**',
        ],
        poll: false,
        followSymlinks: false, 
      };
    }
    return config;
  },
};

export default nextConfig;