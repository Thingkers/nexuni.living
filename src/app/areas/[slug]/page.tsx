import { cache } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import RoomCard from '@/features/rooms/components/RoomCard'
import type { Room } from '@/features/rooms/types/room.types'
import { BRAND, getSiteUrl } from '@/config/brand'

const SITE_URL = getSiteUrl()

type LocalityRow = {
  id: string
  name: string
  name_bn: string | null
  slug: string
  thana: string | null
  city: string | null
  division: string | null
}

type NearbyCampus = {
  distance_km: number | null
  commute_minutes: number | null
  universities: { id: string; name: string; slug: string } | null
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

const getLocality = cache(async (slug: string): Promise<LocalityRow | null> => {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('localities')
    .select('id, name, name_bn, slug, thana, city, division')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data
})

const getNearbyCampuses = cache(async (localityId: string): Promise<NearbyCampus[]> => {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('locality_university')
    .select('distance_km, commute_minutes, universities(id, name, slug)')
    .eq('locality_id', localityId)
    .order('distance_km', { ascending: true })
  return (data ?? []) as unknown as NearbyCampus[]
})

const ROOM_SELECT = '*, profiles(full_name, phone, avatar_url, is_verified)'

// rooms.locality_id is never auto-populated (unlike nearest_university_ids,
// which a trigger keeps in sync), so a query filtering only by locality_id
// would render near-empty for almost every area today — bad for an SEO
// page. Mitigated by also matching rooms whose nearest_university_ids
// overlaps any university linked to this locality, then deduping by id.
const getNearbyRooms = cache(async (localityId: string, universityIds: string[]): Promise<Room[]> => {
  const supabase = getSupabase()

  const [{ data: direct }, { data: viaCampus }] = await Promise.all([
    supabase
      .from('rooms')
      .select(ROOM_SELECT)
      .eq('locality_id', localityId)
      .neq('status', 'booked')
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(24),
    universityIds.length > 0
      ? supabase
          .from('rooms')
          .select(ROOM_SELECT)
          .overlaps('nearest_university_ids', universityIds)
          .neq('status', 'booked')
          .neq('status', 'closed')
          .order('created_at', { ascending: false })
          .limit(24)
      : Promise.resolve({ data: [] as Room[] }),
  ])

  const seen = new Set<string>()
  const merged: Room[] = []
  for (const room of [...(direct ?? []), ...(viaCampus ?? [])] as Room[]) {
    if (seen.has(room.id)) continue
    seen.add(room.id)
    merged.push(room)
  }
  return merged.slice(0, 24)
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const locality = await getLocality(slug)
  if (!locality) return { title: `Area Not Found | ${BRAND.name}` }

  const title = `Rooms in ${locality.name} | ${BRAND.name}`
  const description = `Find verified mess, bachelor, and sublet rooms in ${locality.name}${locality.city ? `, ${locality.city}` : ''}. Browse listings, average rent, and nearby campuses.`

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/areas/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/areas/${slug}`,
      siteName: BRAND.name,
      type: 'website',
    },
    twitter: { card: 'summary', title, description },
  }
}

// Metadata lives only here, not duplicated into a sibling layout.tsx — see
// listings/[id]/ for the anti-pattern this deliberately avoids.
//
// Fully dynamic — same accepted trade-off as /universities/[slug], see
// docs/playbook.md Sprint 3 plan.
export default async function AreaPage({ params }: Props) {
  const { slug } = await params
  const locality = await getLocality(slug)
  if (!locality) notFound()

  const nearbyCampuses = await getNearbyCampuses(locality.id)
  const universityIds = nearbyCampuses
    .map((c) => c.universities?.id)
    .filter((id): id is string => Boolean(id))

  const rooms = await getNearbyRooms(locality.id, universityIds)

  const rentValues = rooms.map((r) => r.rent)
  const avgRent = rentValues.length > 0
    ? Math.round(rentValues.reduce((sum, rent) => sum + rent, 0) / rentValues.length)
    : 0
  const minRent = rentValues.length > 0 ? Math.min(...rentValues) : 0
  const maxRent = rentValues.length > 0 ? Math.max(...rentValues) : 0

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: locality.name,
    url: `${SITE_URL}/areas/${slug}`,
    ...(locality.city
      ? { address: { '@type': 'PostalAddress', addressLocality: locality.city, addressCountry: 'BD' } }
      : {}),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Listings', item: `${SITE_URL}/listings` },
      { '@type': 'ListItem', position: 3, name: locality.name, item: `${SITE_URL}/areas/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locality.name}</h1>
          {locality.name_bn && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{locality.name_bn}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {[locality.thana, locality.city, locality.division].filter(Boolean).join(' · ')}
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
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
              {rentValues.length > 0 ? `৳${minRent.toLocaleString('en-US')}–৳${maxRent.toLocaleString('en-US')}` : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rent range</p>
          </div>
        </div>

        {nearbyCampuses.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Nearby Campuses</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyCampuses.map((nc) => nc.universities && (
                <Link
                  key={nc.universities.id}
                  href={`/universities/${nc.universities.slug}`}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-teal-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-teal-500" />
                  {nc.universities.name}
                  {nc.distance_km != null && (
                    <span className="text-xs text-gray-400">· {nc.distance_km} km</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Rooms in {locality.name}
          </h2>
          {rooms.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No listings found in this area yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
