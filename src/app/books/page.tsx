import type { Metadata } from 'next'
import DiscoveryCatalogPage from '@/features/discovery/components/DiscoveryCatalogPage'

export const metadata: Metadata = {
  title: 'Used Books Marketplace',
  robots: { index: false, follow: false },
}

export default function BooksPage() {
  return <DiscoveryCatalogPage kind="book" />
}
