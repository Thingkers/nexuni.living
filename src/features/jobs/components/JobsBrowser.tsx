'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'

import ContentCard from '@/components/cards/ContentCard'
import { mapListingToJobCard } from '@/features/jobs/lib/mapListingToJobCard'
import type { JobListing } from '@/features/jobs/types'

export default function JobsBrowser({ listings }: { listings: JobListing[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return listings
    return listings.filter((listing) => {
      const details = listing.listing_job_details
      const haystack = [listing.title, details?.employer]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [listings, query])

  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Student Jobs and Internships</h1>
          <p className="mt-1 text-sm text-gray-400">Part-time and internship opportunities near your campus.</p>
        </div>
        <Link
          href="/post-job"
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" aria-hidden /> Post a Job
        </Link>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or employer"
          className="h-11 w-full rounded-full border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <p className="text-sm text-gray-400">
            {listings.length === 0 ? 'No jobs posted yet — be the first!' : 'No jobs match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((listing) => (
            <ContentCard key={listing.id} {...mapListingToJobCard(listing)} />
          ))}
        </div>
      )}
    </main>
  )
}
