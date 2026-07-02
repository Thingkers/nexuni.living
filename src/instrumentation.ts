import * as Sentry from '@sentry/nextjs'

export async function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // 10% trace sampling in production — full sampling added measurable
    // overhead to every request. Errors are always reported regardless.
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  })
}

export const onRequestError = Sentry.captureRequestError
