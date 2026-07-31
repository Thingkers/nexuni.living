import { BookOpen } from 'lucide-react'

import type { ContentCardProps } from '@/components/cards/ContentCard'
import type { BookListing } from '@/features/books/types'

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  good: 'Good',
  fair: 'Fair',
}

export function mapListingToBookCard(listing: BookListing): ContentCardProps {
  const details = listing.listing_book_details
  const conditionLabel = details?.condition ? CONDITION_LABELS[details.condition] : null

  return {
    href: `/books/${listing.id}`,
    images: listing.images,
    fallbackIcon: BookOpen,
    imageAlt: listing.title,
    eyebrow: details?.course_code ?? undefined,
    title: listing.title,
    summary: listing.description ?? undefined,
    priceLabel: listing.price != null
      ? `৳${listing.price.toLocaleString('en-US')}${details?.negotiable ? ' · negotiable' : ''}`
      : undefined,
    locationLabel: listing.universities?.name ?? undefined,
    pills: conditionLabel ? [{ label: conditionLabel, tone: 'teal' }] : [],
  }
}
