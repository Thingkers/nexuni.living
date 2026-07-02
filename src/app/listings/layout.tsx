import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://student-hostel.vercel.app'
const title = 'Browse Rooms, Mess & Bachelor Listings | Student Hostel'
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
    siteName: 'Student Hostel',
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
