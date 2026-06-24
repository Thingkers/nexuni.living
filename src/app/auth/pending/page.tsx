'use client'

import Link from 'next/link'

export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center dark:border-gray-700 dark:bg-gray-800">

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-3xl">
          ⏳
        </div>

        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Verification Pending</h1>

        <p className="mb-6 text-sm text-gray-500 leading-relaxed dark:text-gray-400">
          আপনার registration সফল হয়েছে। Admin আপনার Student ID card verify করার পর আপনার account activate হবে।
          সাধারণত <span className="font-medium text-gray-700 dark:text-gray-300">24-48 ঘণ্টা</span> সময় লাগে।
        </p>

        <div className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 text-left dark:bg-blue-900/20 dark:text-blue-400">
          <p className="font-medium mb-1">Verification এর পর আপনি পারবেন:</p>
          <ul className="space-y-1">
            <li>✓ Room browse ও search করতে</li>
            <li>✓ Room post করতে</li>
            <li>✓ Owner কে contact করতে</li>
            <li>✓ Booking request পাঠাতে</li>
          </ul>
        </div>

        <Link
          href="/listings"
          className="block w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Browse Rooms (Read Only)
        </Link>

        <Link
          href="/auth/login"
          className="mt-3 block text-sm text-gray-400 hover:text-gray-600"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
