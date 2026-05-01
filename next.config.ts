import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // Allow long-running scrape routes
  serverExternalPackages: ['playwright'],
}

export default nextConfig
