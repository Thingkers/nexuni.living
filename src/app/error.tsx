'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-4 text-5xl">⚠️</p>
      <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
      <p className="mb-8 text-sm text-gray-400 dark:text-gray-500">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try Again
      </button>
    </main>
  )
}
