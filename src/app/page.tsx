import Link from 'next/link'
import { Search, MessageSquare, Home } from 'lucide-react'

import { createAnonServerClient } from '@/lib/supabase/server'
import FeaturedRooms from '@/features/rooms/components/FeaturedRooms'
import HeroSearch from '@/features/search/components/HeroSearch'
import type { Room } from '@/features/rooms/types/room.types'

// Rooms are public data, so the whole page is prerendered and served from
// the CDN, then re-generated in the background at most once a minute.
// Per-user bits (navbar session, saved-room state) hydrate client-side.
export const revalidate = 60

const HOW_IT_WORKS = [
  {
    Icon: Search,
    title: 'Search',
    description: 'Find rooms by location, rent, type, and availability.',
  },
  {
    Icon: MessageSquare,
    title: 'Contact',
    description: 'Message the owner directly or call if a phone number is available.',
  },
  {
    Icon: Home,
    title: 'Move In',
    description: 'Send a booking request and move into your selected room.',
  },
]

async function getHomeData(): Promise<{ rooms: Room[]; totalRooms: number }> {
  const supabase = createAnonServerClient()
  if (!supabase) return { rooms: [], totalRooms: 0 }

  try {
    const [{ data }, { count }] = await Promise.all([
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
    ])
    return { rooms: (data ?? []) as Room[], totalRooms: count ?? 0 }
  } catch {
    return { rooms: [], totalRooms: 0 }
  }
}

const POPULAR_SEARCHES = [
  { label: 'Mess', href: '/listings?type=mess' },
  { label: 'Bachelor', href: '/listings?type=bachelor' },
  { label: 'Sublet', href: '/listings?type=sublet' },
  { label: 'Female only', href: '/listings?gender=female' },
]

export default async function HomePage() {
  const { rooms: featuredRooms, totalRooms } = await getHomeData()

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden bg-linear-to-br from-teal-600 via-teal-700 to-teal-900 px-4 pb-24 pt-16 text-center md:pb-32 md:pt-24">
        {/* Background decorations */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-2xl" />
        {/* Subtle dot grid for depth */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />

        <div className="relative mx-auto max-w-3xl">
          {/* Badge pill */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-teal-50 ring-1 ring-white/20 backdrop-blur-sm">
            <span aria-hidden>🎓</span>
            Made for AIUB students
          </div>

          {/* Heading */}
          <h1 className="mb-4 text-4xl font-extrabold leading-[1.15] tracking-tight text-white md:text-6xl">
            Find your perfect <br />
            <span className="bg-linear-to-r from-teal-200 to-white bg-clip-text text-transparent">
              mess, room or sublet
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-teal-100/90 md:text-base">
            Browse verified mess seats, bachelor rooms and sublets near campus —
            message owners directly and book without any broker.
          </p>

          <HeroSearch />

          {/* Popular searches */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-teal-100/70">Popular:</span>
            {POPULAR_SEARCHES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full bg-white/10 px-3.5 py-1.5 font-medium text-white ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Trust / stats row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-teal-100/80 md:text-sm">
            {totalRooms > 0 && (
              <span className="flex items-center gap-1.5">
                <Home className="h-4 w-4 text-teal-200" aria-hidden />
                <strong className="font-semibold text-white">{totalRooms}</strong> rooms listed
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-400/30 text-[10px] text-white" aria-hidden>✓</span>
              Verified owners
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-teal-200" aria-hidden />
              Direct chat — no broker
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-teal-200" aria-hidden>৳</span>
              100% free to use
            </span>
          </div>
        </div>

        {/* Wave divider into the page background */}
        <svg
          className="absolute inset-x-0 -bottom-px h-10 w-full text-white dark:text-gray-950 md:h-14"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0 64h1440V32c-120 20-280 30-480 22C740 46 560 18 380 14 240 11 100 22 0 40v24z"
          />
        </svg>
      </section>

      {/* FEATURED ROOMS */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Latest Available Rooms</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Updated in real time</p>
          </div>
          <Link href="/listings" className="rounded-xl border border-teal-200 px-4 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/20">
            View all →
          </Link>
        </div>

        <FeaturedRooms initialRooms={featuredRooms} />

        <div className="mt-8 text-center">
          <Link
            href="/listings"
            className="inline-block rounded-2xl bg-teal-600 px-8 py-3 text-sm font-semibold text-white shadow hover:bg-teal-700"
          >
            Browse All Listings →
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-50 py-14 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">How it works</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Find and book a room in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={index} className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-gray-800">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                  <step.Icon className="h-6 w-6" />
                </div>
                <div className="mb-1 flex items-center justify-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">{index + 1}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{step.title}</p>
                </div>
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-teal-600 py-12 text-center">
        <div className="mx-auto max-w-xl px-4">
          <h2 className="mb-2 text-xl font-bold text-white">Have a room to offer?</h2>
          <p className="mb-5 text-sm text-teal-100">Post your room for free and reach thousands of students instantly.</p>
          <Link
            href="/auth/register"
            className="inline-block rounded-2xl bg-white px-8 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              Students Home
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400">
              <Link href="/listings" className="hover:text-gray-700 dark:hover:text-gray-300">Browse Rooms</Link>
              <Link href="/auth/register" className="hover:text-gray-700 dark:hover:text-gray-300">Post a Room</Link>
              <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300">Terms</Link>
              <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">Privacy</Link>
            </div>
            <p className="text-xs text-gray-400">© 2026 AIUB Students Home</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
