'use client'

import { BookOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'

import ContentCard, { type ContentCardBadge } from '@/components/cards/ContentCard'
import type { LocalizedDiscoveryItem } from '@/features/discovery/types'

export default function BookCard({ item }: { item: LocalizedDiscoveryItem }) {
  const t = useTranslations('Discovery')

  const badges: ContentCardBadge[] = [
    ...(item.featured ? [{ label: t('featured'), tone: 'featured' as const }] : []),
    { label: t('sample'), tone: 'sample' as const },
  ]

  return (
    <ContentCard
      href={`/books/${item.slug}`}
      fallbackIcon={BookOpen}
      imageAlt={item.title}
      eyebrow={item.categoryLabel}
      title={item.title}
      summary={item.summary}
      priceLabel={item.priceLabel}
      locationLabel={`${item.area} · ${item.campus}`}
      badges={badges}
    />
  )
}
