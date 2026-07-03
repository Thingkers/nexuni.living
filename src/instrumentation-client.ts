import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 10% trace sampling in production — full sampling added measurable
  // overhead to every page load. Errors are always reported regardless.
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
})
