import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'

import DiscoveryDetailPage from '@/features/discovery/components/DiscoveryDetailPage'
import { BOOKS, getDiscoveryItem } from '@/features/discovery/data'

export function generateStaticParams() {
  return BOOKS.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const item = getDiscoveryItem('book', slug)
  return {
    title: item?.title[locale === 'bn' ? 'bn' : 'en'] ?? 'Book preview',
    robots: { index: false, follow: false },
  }
}

export default async function BookDetailRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <DiscoveryDetailPage kind="book" slug={slug} />
}
