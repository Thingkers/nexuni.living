import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-4 text-6xl font-extrabold text-teal-600">404</p>
      <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="mb-8 text-sm text-gray-400 dark:text-gray-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          Go Home
        </Link>
        <Link
          href="/listings"
          className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Browse Rooms
        </Link>
      </div>
    </main>
  )
}
