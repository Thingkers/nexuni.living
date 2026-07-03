// Streams instantly on navigation while the server fetches the first page of
// rooms, so the user never stares at a blank screen.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-2 h-8 w-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      <div className="mb-5 h-4 w-64 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className="mb-6 h-24 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-800/60" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 h-44 rounded-xl bg-gray-100 dark:bg-gray-700" />
            <div className="mb-2 h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  )
}
