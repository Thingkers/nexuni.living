import { cache } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import RoomCard from '@/features/rooms/components/RoomCard'
import type { Room } from '@/features/rooms/types/room.types'
import { BRAND, getSiteUrl } from '@/config/brand'

const SITE_URL = getSiteUrl()

type UniversityRow = {
  id: string
  name: string
  name_bn: string | null
  slug: string
  type: string | null
  city: string | null
  division: string | null
  logo_url: string | null
  website: string | null
}

type NearbyLocality = {
  distance_km: number | null
  localities: { id: string; name: string; slug: string } | null
}

type Props = {
  params: Promise<{ slug: string }>
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// React.cache dedupes this between generateMetadata and the page body.
const getUniversity = cache(async (slug: string): Promise<UniversityRow | null> => {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('universities')
    .select('id, name, name_bn, slug, type, city, division, logo_url, website')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data
})

const getNearbyLocalities = cache(async (universityId: string): Promise<NearbyLocality[]> => {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('locality_university')
    .select('distance_km, localities(id, name, slug)')
    .eq('university_id', universityId)
    .order('distance_km', { ascending: true })
  return (data ?? []) as unknown as NearbyLocality[]
})

const getNearbyRooms = cache(async (universityId: string): Promise<Room[]> => {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('rooms')
    .select('*, profiles(full_name, phone, avatar_url, is_verified)')
    .overlaps('nearest_university_ids', [universityId])
    .neq('status', 'booked')
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(24)
  return (data ?? []) as Room[]
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const university = await getUniversity(slug)
  if (!university) return { title: `University Not Found | ${BRAND.name}` }

  const title = `Rooms near ${university.name} | ${BRAND.name}`
  const description = `Find verified mess, bachelor, and sublet rooms near ${university.name}${university.city ? `, ${university.city}` : ''}. Browse listings, average rent, and nearby areas.`

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/universities/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/universities/${slug}`,
      siteName: BRAND.name,
      type: 'website',
    },
    twitter: { card: 'summary', title, description },
  }
}

// Metadata lives only here, not duplicated into a sibling layout.tsx — see
// listings/[id]/ for the anti-pattern (page.tsx and layout.tsx there both
// independently re-fetch the same data) this deliberately avoids.
//
// Fully dynamic (no revalidate/generateStaticParams): the root layout
// already reads a locale cookie for next-intl, which forces the whole app
// dynamic — a per-route ISR override isn't possible without a larger
// restructure. Accepted trade-off, see docs/playbook.md Sprint 3 plan.
export default async function UniversityPage({ params }: Props) {
  const { slug } = await params
  const university = await getUniversity(slug)
  if (!university) notFound()

  const [nearbyLocalities, rooms] = await Promise.all([
    getNearbyLocalities(university.id),
    getNearbyRooms(university.id),
  ])

  const avgRent = rooms.length > 0
    ? Math.round(rooms.reduce((sum, r) => sum + r.rent, 0) / rooms.length)
    : 0

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollegeOrUniversity',
    name: university.name,
    url: `${SITE_URL}/universities/${slug}`,
    ...(university.city ? { address: { '@type': 'PostalAddress', addressLocality: university.city, addressCountry: 'BD' } } : {}),
    ...(university.logo_url ? { logo: university.logo_url } : {}),
    ...(university.website ? { sameAs: university.website } : {}),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Listings', item: `${SITE_URL}/listings` },
      { '@type': 'ListItem', position: 3, name: university.name, item: `${SITE_URL}/universities/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main className="page-shell py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{university.name}</h1>
          {university.name_bn && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{university.name_bn}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {[university.type, university.city, university.division].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{rooms.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active listings</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
              {avgRent > 0 ? `৳${avgRent.toLocaleString('en-US')}` : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Average rent</p>
          </div>
        </div>

        {nearbyLocalities.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Nearby Areas</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyLocalities.map((nl) => nl.localities && (
                <Link
                  key={nl.localities.id}
                  href={`/areas/${nl.localities.slug}`}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-teal-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <MapPin className="h-3.5 w-3.5 text-teal-500" />
                  {nl.localities.name}
                  {nl.distance_km != null && (
                    <span className="text-xs text-gray-400">· {nl.distance_km} km</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Rooms near {university.name}
          </h2>
          {rooms.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No listings found near this campus yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
