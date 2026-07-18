import type { Metadata } from 'next'
import { BRAND, getSiteUrl } from '@/config/brand'

const siteUrl = getSiteUrl()
const title = `Browse Rooms, Mess & Bachelor Listings | ${BRAND.name}`
const description = 'Find hostel, mess, bachelor, and sublet rooms near your university. Filter by rent, location, gender, and availability.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${siteUrl}/listings`,
  },
  openGraph: {
    title,
    description,
    url: `${siteUrl}/listings`,
    siteName: BRAND.name,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
}

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
