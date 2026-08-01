'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BriefcaseBusiness, MapPin } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { JobListing } from '@/features/jobs/types'

const JOB_TYPE_LABELS: Record<string, string> = { part_time: 'Part-time', internship: 'Internship' }
const APPLY_LABELS: Record<string, string> = { link: 'Apply Online', phone: 'Call to Apply', chat: 'Message to Apply' }

function salaryLabel(details: JobListing['listing_job_details']): string | null {
  if (!details || (details.salary_min == null && details.salary_max == null)) return null
  if (details.salary_min != null && details.salary_max != null) {
    return `৳${details.salary_min.toLocaleString('en-US')}–${details.salary_max.toLocaleString('en-US')}`
  }
  const value = details.salary_min ?? details.salary_max
  return value != null ? `৳${value.toLocaleString('en-US')}` : null
}

export default function JobDetailClient({ job }: { job: JobListing }) {
  const [viewerId, setViewerId] = useState<string | null>(null)
  const details = job.listing_job_details

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null))
  }, [])

  const isOwner = viewerId === job.owner_id
  const applyHref = details?.apply_method === 'link' ? details.apply_value ?? undefined
    : details?.apply_method === 'phone' ? `tel:${details.apply_value}`
    : undefined

  return (
    <main className="page-shell py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative h-80 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-700">
          {job.images.length > 0 ? (
            <Image src={job.images[0]} alt={job.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BriefcaseBusiness className="h-20 w-20 text-gray-300 dark:text-gray-600" aria-hidden />
            </div>
          )}
        </div>

        <div>
          {details?.employer && (
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">{details.employer}</p>
          )}
          <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">{job.title}</h1>

          {job.universities?.name && (
            <div className="mb-3 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {job.universities.name}
            </div>
          )}

          {salaryLabel(details) && (
            <p className="mb-4 text-2xl font-bold text-teal-600 dark:text-teal-400">{salaryLabel(details)}</p>
          )}

          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {details?.job_type && (
              <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                {JOB_TYPE_LABELS[details.job_type]}
              </span>
            )}
          </div>

          {job.description && (
            <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400">{job.description}</p>
          )}

          <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-700">
            <p className="mb-1 text-xs text-gray-400">Posted by</p>
            <p className="mb-3 text-sm font-medium text-gray-900 dark:text-white">{job.profiles?.full_name || 'Student'}</p>
            {!isOwner && details?.apply_method === 'chat' && (
              <Link
                href={`/inbox/${job.owner_id}`}
                className="block w-full rounded-xl bg-teal-600 py-2.5 text-center text-sm font-medium text-white hover:bg-teal-700"
              >
                Message to Apply
              </Link>
            )}
            {!isOwner && details?.apply_method !== 'chat' && applyHref && (
              <a
                href={applyHref}
                target={details?.apply_method === 'link' ? '_blank' : undefined}
                rel={details?.apply_method === 'link' ? 'noopener noreferrer' : undefined}
                className="block w-full rounded-xl bg-teal-600 py-2.5 text-center text-sm font-medium text-white hover:bg-teal-700"
              >
                {details?.apply_method ? APPLY_LABELS[details.apply_method] : 'Apply'}
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
