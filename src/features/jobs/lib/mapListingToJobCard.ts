import { BriefcaseBusiness } from 'lucide-react'

import type { ContentCardProps } from '@/components/cards/ContentCard'
import type { JobListing } from '@/features/jobs/types'

const JOB_TYPE_LABELS: Record<string, string> = {
  part_time: 'Part-time',
  internship: 'Internship',
}

function salaryLabel(details: JobListing['listing_job_details']): string | undefined {
  if (!details || (details.salary_min == null && details.salary_max == null)) return undefined
  if (details.salary_min != null && details.salary_max != null) {
    return `৳${details.salary_min.toLocaleString('en-US')}–${details.salary_max.toLocaleString('en-US')}`
  }
  const value = details.salary_min ?? details.salary_max
  return value != null ? `৳${value.toLocaleString('en-US')}` : undefined
}

export function mapListingToJobCard(listing: JobListing): ContentCardProps {
  const details = listing.listing_job_details
  const jobTypeLabel = details?.job_type ? JOB_TYPE_LABELS[details.job_type] : null

  return {
    href: `/jobs/${listing.id}`,
    images: listing.images,
    fallbackIcon: BriefcaseBusiness,
    imageAlt: listing.title,
    eyebrow: details?.employer,
    title: listing.title,
    summary: listing.description ?? undefined,
    priceLabel: salaryLabel(details),
    locationLabel: listing.universities?.name ?? undefined,
    pills: jobTypeLabel ? [{ label: jobTypeLabel, tone: 'blue' }] : [],
  }
}
