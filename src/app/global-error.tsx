'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

import './globals.css'

// Root layout (and everything it provides — fonts, nav, etc.) never mounts
// when this fires, so global-error must bring its own <html>/<body> and
// re-import global styles. This only catches errors that escape every
// nested error.tsx, i.e. failures in the root layout itself.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center text-gray-900">
        <p className="mb-4 text-5xl">⚠️</p>
        <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>
        <p className="mb-8 text-sm text-gray-400">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          Try Again
        </button>
      </body>
    </html>
  )
}
