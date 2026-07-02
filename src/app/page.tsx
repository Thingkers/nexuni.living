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

async function getFeaturedRooms(): Promise<Room[]> {
  const supabase = createAnonServerClient()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('rooms')
      .select('*, profiles(full_name, phone, avatar_url)')
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(8)
      .abortSignal(AbortSignal.timeout(5000))
    return (data ?? []) as Room[]
  } catch {
    return []
  }
}

export default async function HomePage() {
  const featuredRooms = await getFeaturedRooms()

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden bg-linear-to-br from-teal-600 via-teal-700 to-teal-900 px-4 py-20 text-center md:py-32">
        {/* Background decorations */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-2xl" />

        <div className="relative mx-auto max-w-3xl">
          {/* Heading */}
          <h1 className="mb-8 text-4xl font-extrabold leading-[1.15] tracking-tight text-white md:text-6xl">
            Find your perfect <br />
            <span className="bg-linear-to-r from-teal-200 to-white bg-clip-text text-transparent">
              mess, room or sublet
            </span>
          </h1>

          <HeroSearch />
        </div>
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
