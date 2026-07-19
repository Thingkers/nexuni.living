import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Home,
  MessageSquare,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { createAnonServerClient } from '@/lib/supabase/server'
import FeaturedRooms from '@/features/rooms/components/FeaturedRooms'
import HeroSearch from '@/features/search/components/HeroSearch'
import MapHubShell from '@/features/map/components/MapHubShell'
import { housingToMapEntity } from '@/features/map/adapters/housing'
import { areaToMapEntity, campusToMapEntity } from '@/features/map/adapters/geography'
import { discoveryToMapEntity } from '@/features/map/adapters/discovery'
import type { MapEntity } from '@/features/map/types'
import { DISCOVERY_ITEMS } from '@/features/discovery/data'
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

async function getHomeData(locale: string): Promise<{
  rooms: Room[]
  mapEntities: MapEntity[]
  totalRooms: number
}> {
  const discoveryEntities = DISCOVERY_ITEMS.map((item) => discoveryToMapEntity(item, locale))
  const supabase = createAnonServerClient()
  if (!supabase) return { rooms: [], mapEntities: discoveryEntities, totalRooms: 0 }

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
      ...discoveryEntities,
    ]

    return {
      rooms: (data ?? []) as Room[],
      mapEntities,
      totalRooms: count ?? 0,
    }
  } catch {
    return { rooms: [], mapEntities: discoveryEntities, totalRooms: 0 }
  }
}

export default async function HomePage() {
  const locale = await getLocale()
  const [{ rooms: featuredRooms, mapEntities, totalRooms }, t] = await Promise.all([
    getHomeData(locale),
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

      <section className="relative overflow-hidden bg-[#071c19] py-20 text-white md:py-28">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(45,212,191,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,.12)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="page-shell relative">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
                {t('featuredSubtext')}
              </p>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.045em] md:text-6xl">
                {t('featuredHeading')}
              </h2>
            </div>
            <Link
              href="/listings"
              className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-teal-300/60 hover:bg-white/10"
            >
              {t('viewAll')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          <FeaturedRooms initialRooms={featuredRooms} />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#eef3f1] py-20 dark:border-slate-800 dark:bg-slate-900 md:py-28">
        <div className="page-shell">
          <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
                nexUni.living · {t('howItWorksHeading')}
              </p>
              <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white md:text-6xl">
                {t('howItWorksSubtext')}
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('howItWorksIntro')}
            </p>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="absolute left-[16.66%] right-[16.66%] top-8 hidden border-t border-dashed border-teal-700/30 lg:block" />
            {HOW_IT_WORKS.map((step, index) => (
              <article key={step.title} className="relative rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <div className="mb-10 flex items-center justify-between">
                  <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-8 border-[#eef3f1] bg-teal-600 text-white shadow-lg dark:border-slate-900">
                    <step.Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-4xl font-black tracking-[-0.08em] text-slate-100 dark:text-slate-800">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{step.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell bg-[#eef3f1] py-12 dark:bg-slate-950 md:py-16">
        <div className="grid overflow-hidden rounded-[36px] bg-[#071c19] text-white shadow-[0_30px_90px_rgba(7,28,25,.25)] lg:grid-cols-[1.1fr_.9fr]">
          <div className="p-8 md:p-14 lg:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">{t('ownerEyebrow')}</p>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.05em] md:text-6xl">{t('ctaHeading')}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">{t('ctaSubtext')}</p>
            <Link
              href="/auth/register"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-teal-300 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-teal-200"
            >
              {t('ctaButton')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="relative min-h-80 overflow-hidden bg-teal-400 p-8 text-slate-950 md:p-12">
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(7,28,25,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(7,28,25,.35)_1px,transparent_1px)] [background-size:38px_38px]" />
            <div className="relative ml-auto flex h-full max-w-md flex-col justify-end">
              <div className="rounded-[28px] border border-slate-950/10 bg-white/90 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071c19] text-teal-300">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <span className="flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-[10px] font-bold text-teal-800">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
                    {t('ownerReady')}
                  </span>
                </div>
                <p className="mt-8 text-2xl font-semibold tracking-[-0.04em]">{t('ownerCardTitle')}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t('ownerCardText')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="page-shell pb-10 pt-4">
        <div className="flex flex-col items-center justify-between gap-5 border-t border-slate-300 pt-8 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row">
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
