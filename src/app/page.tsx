'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, MessageSquare, Home } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import RoomCard from '@/features/rooms/components/RoomCard'
import type { Room } from '@/features/rooms/types/room.types'
import SearchSuggestions from '@/features/search/components/SearchSuggestions'

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


export default function HomePage() {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'male' | 'female'>('all')

  useEffect(() => {
    async function loadHomeData() {
      let query = supabase
        .from('rooms')
        .select('*, profiles(full_name, phone, avatar_url)')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(8)

      if (activeTab !== 'all') {
        query = query.eq('gender_type', activeTab)
      }

      const { data: rooms } = await query
      setFeaturedRooms((rooms ?? []) as Room[])
    }

    loadHomeData()
  }, [activeTab])

  function handleSearch() {
    const value = search.trim()
    if (value) {
      router.push(`/listings?search=${encodeURIComponent(value)}`)
    } else {
      router.push('/listings')
    }
  }

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

          {/* Search bar */}
          <div className="relative mx-auto flex max-w-xl overflow-visible rounded-2xl bg-white/10 p-1.5 backdrop-blur-sm ring-1 ring-white/20 focus-within:ring-white/40">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search by area, university or room type..."
                className="w-full rounded-xl bg-transparent py-3 pl-10 pr-4 text-sm text-white placeholder-white/50 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <SearchSuggestions
                query={search}
                onSelect={(value) => {
                  setSearch(value)
                  router.push(`/listings?q=${encodeURIComponent(value)}`)
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 shadow transition hover:bg-teal-50"
            >
              Search
            </button>
          </div>
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

        {/* Tabs */}
        <div className="mb-5 flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'male', label: 'Male' },
            { key: 'female', label: 'Female' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'all' | 'male' | 'female')}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {featuredRooms.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-gray-800">
              <Home className="h-7 w-7" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">No rooms posted yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}

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
