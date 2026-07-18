import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Home,
  MessageSquare,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { createAnonServerClient } from '@/lib/supabase/server'
import FeaturedRooms from '@/features/rooms/components/FeaturedRooms'
import HeroSearch from '@/features/search/components/HeroSearch'
import MapHubShell from '@/features/map/components/MapHubShell'
import { housingToMapEntity } from '@/features/map/adapters/housing'
import { areaToMapEntity, campusToMapEntity } from '@/features/map/adapters/geography'
import type { MapEntity } from '@/features/map/types'
import type { Room } from '@/features/rooms/types/room.types'
import BrandWordmark from '@/components/brand/BrandWordmark'

// Locale is read from a cookie in the root layout (src/i18n/request.ts),
// which makes every page sharing that layout dynamic — so this page can no
// longer be served from a 60s ISR cache; it re-fetches on every request.
// Accepted trade-off, see docs/playbook.md Sprint 2 Session 2.A plan.

type HomeMapRoom = Pick<
  Room,
  'id' | 'title' | 'rent' | 'latitude' | 'longitude' | 'location_name'
> & {
  locality_id?: string | null
  is_approximate?: boolean
}

type LocalityCoordinate = {
  id: string
  name: string
  slug: string
  lat: number | null
  lng: number | null
}

type CampusCoordinate = LocalityCoordinate

const AREA_CENTERS: Array<{ terms: string[]; lat: number; lng: number }> = [
  { terms: ['kuratoli', 'kuril'], lat: 23.8259, lng: 90.4204 },
  { terms: ['nikunja'], lat: 23.8315, lng: 90.4153 },
  { terms: ['khilkhet'], lat: 23.8262, lng: 90.4270 },
  { terms: ['bashundhara'], lat: 23.8151, lng: 90.4295 },
  { terms: ['badda'], lat: 23.7805, lng: 90.4266 },
]

function normalizedLocation(value: string | null | undefined) {
  return (value ?? '').normalize('NFC').toLowerCase()
}

function markerOffset(id: string) {
  const hash = [...id].reduce((total, character) => total + character.charCodeAt(0), 0)
  return {
    lat: ((hash % 9) - 4) * 0.00022,
    lng: (((hash * 7) % 9) - 4) * 0.00022,
  }
}

function resolveMapRoom(
  room: HomeMapRoom,
  localities: LocalityCoordinate[],
): HomeMapRoom {
  if (room.latitude != null && room.longitude != null) return room

  const location = normalizedLocation(room.location_name)
  const locality = localities.find((item) => {
    if (room.locality_id && item.id === room.locality_id) return true
    const name = normalizedLocation(item.name)
    return Boolean(name && (location.includes(name) || name.includes(location)))
  })
  const area = AREA_CENTERS.find((item) =>
    item.terms.some((term) => location.includes(term)),
  )
  const lat = locality?.lat ?? area?.lat
  const lng = locality?.lng ?? area?.lng
  if (lat == null || lng == null) return room

  const offset = markerOffset(room.id)
  return {
    ...room,
    latitude: lat + offset.lat,
    longitude: lng + offset.lng,
    is_approximate: true,
  }
}

async function getHomeData(): Promise<{
  rooms: Room[]
  mapEntities: MapEntity[]
  totalRooms: number
}> {
  const supabase = createAnonServerClient()
  if (!supabase) return { rooms: [], mapEntities: [], totalRooms: 0 }

  try {
    const [
      { data },
      { count },
      { data: mapData },
      { data: localityData },
      { data: campusData },
    ] = await Promise.all([
      supabase
        .from('rooms')
        .select('*, profiles(full_name, phone, avatar_url)')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(8)
        .abortSignal(AbortSignal.timeout(5000)),
      supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'closed')
        .abortSignal(AbortSignal.timeout(5000)),
      supabase
        .from('rooms')
        .select('id, title, rent, latitude, longitude, location_name, locality_id')
        .neq('status', 'booked')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(60)
        .abortSignal(AbortSignal.timeout(5000)),
      supabase
        .from('localities')
        .select('id, name, slug, lat, lng')
        .eq('is_active', true)
        .abortSignal(AbortSignal.timeout(5000)),
      supabase
        .from('universities')
        .select('id, name, slug, lat, lng')
        .eq('is_active', true)
        .abortSignal(AbortSignal.timeout(5000)),
    ])
    const localities = (localityData ?? []) as LocalityCoordinate[]
    const resolvedMapRooms = ((mapData ?? []) as HomeMapRoom[])
      .map((room) => resolveMapRoom(room, localities))
      .filter((room) => room.latitude != null && room.longitude != null)
    const mapEntities = [
      ...resolvedMapRooms.flatMap((room) => {
        const entity = housingToMapEntity(room)
        return entity ? [entity] : []
      }),
      ...localities.flatMap((locality) => {
        const entity = areaToMapEntity(locality)
        return entity ? [entity] : []
      }),
      ...((campusData ?? []) as CampusCoordinate[]).flatMap((campus) => {
        const entity = campusToMapEntity(campus)
        return entity ? [entity] : []
      }),
    ]

    return {
      rooms: (data ?? []) as Room[],
      mapEntities,
      totalRooms: count ?? 0,
    }
  } catch {
    return { rooms: [], mapEntities: [], totalRooms: 0 }
  }
}

export default async function HomePage() {
  const [{ rooms: featuredRooms, mapEntities, totalRooms }, t] = await Promise.all([
    getHomeData(),
    getTranslations('HomePage'),
  ])

  const HOW_IT_WORKS = [
    { Icon: Search, title: t('step1Title'), description: t('step1Desc') },
    { Icon: MessageSquare, title: t('step2Title'), description: t('step2Desc') },
    { Icon: Home, title: t('step3Title'), description: t('step3Desc') },
  ]

  const POPULAR_SEARCHES = [
    { label: t('chipMess'), href: '/listings?type=mess' },
    { label: t('chipBachelor'), href: '/listings?type=bachelor' },
    { label: t('chipSublet'), href: '/listings?type=sublet' },
    { label: t('chipFemaleOnly'), href: '/listings?gender=female' },
  ]

  return (
    <main className="overflow-hidden bg-[#f3f6f4] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative h-[calc(100dvh-4rem)] min-h-[720px] max-h-[980px] overflow-hidden bg-[#071c19] text-white">
        <MapHubShell entities={mapEntities} />

        <header className="absolute inset-x-3 top-3 z-[500] flex h-[60px] items-center justify-between rounded-[20px] border border-white/15 bg-[#091b19]/88 px-3 shadow-[0_18px_50px_rgba(0,0,0,.38)] backdrop-blur-2xl md:inset-x-5 md:px-4">
          <Link href="/" aria-label="nexUni.living" className="shrink-0 px-2">
            <BrandWordmark inverse />
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold text-slate-200 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
              {mapEntities.filter((entity) => entity.kind === 'housing').length} live
            </span>
            <Link href="/auth/login" className="rounded-full px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">
              Login
            </Link>
            <Link href="/auth/register" className="rounded-full bg-teal-300 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-200">
              Register
            </Link>
          </div>
        </header>

        <div className="absolute left-4 top-1/2 z-[450] w-[calc(100%-2rem)] -translate-y-[46%] sm:left-6 sm:max-w-[520px] lg:left-10">
          <div className="rounded-[26px] border border-white/15 bg-[#091b19]/86 p-5 shadow-[0_24px_80px_rgba(0,0,0,.44)] backdrop-blur-2xl sm:p-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-teal-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
              {t('badge')}
            </div>

            <h1 className="max-w-lg text-4xl font-semibold leading-[0.96] tracking-[-0.055em] text-white sm:text-6xl">
              {t('heroTitleLine1')}{' '}
              <span className="text-teal-300">{t('heroTitleLine2')}</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
              {t('heroSubtitle')}
            </p>

            <div className="mt-6">
              <HeroSearch mapMode />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
              <span className="mr-1 text-slate-400">{t('popularLabel')}</span>
              {POPULAR_SEARCHES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 transition hover:border-teal-300/50 hover:bg-teal-300/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 z-[450] grid overflow-hidden rounded-[20px] border border-white/15 bg-[#091b19]/88 shadow-2xl backdrop-blur-2xl sm:grid-cols-3 md:inset-x-5">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r">
            <Building2 className="h-4 w-4 text-teal-300" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-white">
                {totalRooms > 0 ? `${totalRooms} ${t('trustRoomsListed')}` : t('featuredHeading')}
              </p>
              <p className="text-[9px] text-slate-400">{t('featuredSubtext')}</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 border-r border-white/10 px-4 py-3 sm:flex">
            <ShieldCheck className="h-4 w-4 text-teal-300" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-white">{t('trustVerifiedOwners')}</p>
              <p className="text-[9px] text-slate-400">{t('trustFree')}</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 px-4 py-3 sm:flex">
            <MessageSquare className="h-4 w-4 text-teal-300" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-white">{t('trustDirectChat')}</p>
              <p className="text-[9px] text-slate-400">{t('step2Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:py-28">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
              {t('featuredSubtext')}
            </p>
            <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-white md:text-5xl">
              {t('featuredHeading')}
            </h2>
          </div>
          <Link
            href="/listings"
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {t('viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <FeaturedRooms initialRooms={featuredRooms} />

        <div className="mt-10">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 rounded-full bg-[#071c19] px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950"
          >
            {t('browseAll')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-20 dark:border-slate-800 dark:bg-slate-900 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
              nexUni.living
            </p>
            <h2 className="text-4xl font-semibold tracking-[-0.045em] text-slate-950 dark:text-white md:text-5xl">
              {t('howItWorksHeading')}
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-slate-500 dark:text-slate-400">
              {t('howItWorksSubtext')}
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[28px] border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.title} className="bg-white p-7 dark:bg-slate-900 md:min-h-64">
                <div className="mb-12 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-[0.18em] text-slate-400">
                    0{index + 1}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                    <step.Icon className="h-5 w-5" aria-hidden />
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-teal-400 px-7 py-12 text-slate-950 md:px-14 md:py-16">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-slate-950/5" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-5xl">{t('ctaHeading')}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-800">{t('ctaSubtext')}</p>
            </div>
            <Link
              href="/auth/register"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#071c19] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t('ctaButton')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-10 pt-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 border-t border-slate-300 pt-8 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row">
          <BrandWordmark compact />
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/listings" className="hover:text-slate-950 dark:hover:text-white">{t('footerBrowseRooms')}</Link>
            <Link href="/auth/register" className="hover:text-slate-950 dark:hover:text-white">{t('footerPostRoom')}</Link>
            <Link href="/terms" className="hover:text-slate-950 dark:hover:text-white">{t('footerTerms')}</Link>
            <Link href="/privacy" className="hover:text-slate-950 dark:hover:text-white">{t('footerPrivacy')}</Link>
          </div>
          <p>{t('footerCopyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </main>
  )
}
