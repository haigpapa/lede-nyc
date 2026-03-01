import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Set NEXT_PUBLIC_GOOGLE_MAPS_KEY in .env.local
    // Get your key at: https://console.cloud.google.com/apis/credentials
    // Enable: Maps JavaScript API, Visualization API
  },
  images: {
    remotePatterns: [
      {
        // Google profile pictures (lh3.googleusercontent.com)
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
