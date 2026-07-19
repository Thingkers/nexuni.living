import type { Metadata } from 'next'
import DiscoveryCatalogPage from '@/features/discovery/components/DiscoveryCatalogPage'

export const metadata: Metadata = {
  title: 'Student Jobs and Internships',
  robots: { index: false, follow: false },
}

export default function JobsPage() {
  return <DiscoveryCatalogPage kind="job" />
}
