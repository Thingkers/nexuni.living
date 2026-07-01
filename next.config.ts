import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hktvqwryhpyiujjprymt.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // The default runtime caching tries to intercept every route, including
  // auth pages and API calls. Login/signup/password-reset (and any /api/*
  // request) must always hit the network directly — letting the service
  // worker try to cache or replay these causes "no-response" promise
  // rejections that hang the login form forever. NetworkOnly here means
  // the service worker steps aside completely for these paths.
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/auth'),
        handler: 'NetworkOnly',
      },
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/api'),
        handler: 'NetworkOnly',
      },
    ],
  },
})(nextConfig)

export default withSentryConfig(pwaConfig, {
  org: 'rayhan-ky',
  project: 'student-hostel-system',
  silent: !process.env.CI,
  disableLogger: true,
  telemetry: false,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
})