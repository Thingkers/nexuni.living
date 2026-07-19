import type { Metadata } from 'next'
import DiscoveryCatalogPage from '@/features/discovery/components/DiscoveryCatalogPage'

export const metadata: Metadata = {
  title: 'Local Student Services',
  robots: { index: false, follow: false },
}

export default function ServicesPage() {
  return <DiscoveryCatalogPage kind="service" />
}
