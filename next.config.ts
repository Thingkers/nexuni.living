import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hktvqwryhpyiujjprymt.supabase.co',
      },
    ],
  },
}

export default nextConfig