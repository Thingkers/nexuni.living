import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'
import { withSentryConfig } from '@sentry/nextjs'

// Only enforced in production — dev's HMR/websocket traffic doesn't fit a
// locked-down CSP and the header would just get in the way locally.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://hktvqwryhpyiujjprymt.supabase.co https://images.unsplash.com https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://hktvqwryhpyiujjprymt.supabase.co wss://hktvqwryhpyiujjprymt.supabase.co https://nominatim.openstreetmap.org https://*.sentry.io",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), browsing-topics=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(process.env.NODE_ENV === 'production'
    ? [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Content-Security-Policy', value: CSP },
      ]
    : []),
]

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
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