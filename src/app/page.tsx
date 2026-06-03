'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'
import RoomCard from '@/features/rooms/components/RoomCard'
import type { Room } from '@/features/rooms/types/room.types'
import SearchSuggestions from '@/features/search/components/SearchSuggestions'


const HOW_IT_WORKS = [
  {
    icon: '🔍',
    title: 'Search',
    description: 'Find rooms by location, rent, type, and availability.',
  },
  {
    icon: '💬',
    title: 'Contact',
    description: 'Message the owner directly or call if a phone number is available.',
  },
  {
    icon: '🏠',
    title: 'Move In',
    description: 'Send a booking request and move into your selected room.',
  },
]

export default function HomePage() {

  const router = useRouter()

  const [search, setSearch] = useState('')
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([])
  const [stats, setStats] = useState({ rooms: 0, users: 0 })
  const [activeTab, setActiveTab] = useState<'all' | 'male' | 'female'>('all')

  useEffect(() => {

    async function loadHomeData() {
      let query = supabase
        .from('rooms')
        .select('*, profiles(full_name, phone, avatar_url)')
        .neq('status', 'booked')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(6)

      if (activeTab !== 'all') {
        query = query.eq('gender_type', activeTab)
      }

      const [{ data: rooms }, { count: roomCount }, { count: userCount }] =
        await Promise.all([
          query,
          supabase.from('rooms').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
        ])

      setFeaturedRooms((rooms ?? []) as Room[])
      
      setStats({
        rooms: roomCount ?? 0,
        users: userCount ?? 0,
      })
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

      <section className="bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4 py-16 text-center">

        <div className="mx-auto max-w-2xl">

          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            Built for university students
          </span>

          <h1 className="mt-4 mb-3 text-3xl font-bold leading-tight text-gray-900 md:text-5xl">
            Find your next
            <span className="text-blue-600"> mess, room or sublet</span>
          </h1>

          <p className="mx-auto mb-8 max-w-lg text-sm text-gray-500 md:text-base">
            A dedicated platform for students to find nearby mess, bachelor rooms,
            and sublets without messy social media posts.
          </p>

          <div className="relative mx-auto mb-4 flex max-w-md gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by area or university..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
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
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: '🏠 All Rooms', href: '/listings' },
              { label: '👦 Male', href: '/listings?gender=male' },
              { label: '👧 Female', href: '/listings?gender=female' },
              { label: '🍳 Mess', href: '/listings?type=mess' },
              { label: '🛋 Bachelor', href: '/listings?type=bachelor' },
            ].map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-400 hover:text-blue-700"
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 py-6">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 text-center">
          {[
            { value: stats.rooms, label: 'Room Listings' },
            { value: stats.users, label: 'Users' },
            { value: '100%', label: 'Free Service' },
          ].map((stat, index) => (
            <div key={index}>
              <p className="text-2xl font-bold text-blue-600">
                {stat.value}
                {typeof stat.value === 'number' ? '+' : ''}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Latest Available Rooms
          </h2>

          <Link href="/listings" className="text-sm text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>

        <div className="mb-5 flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'male', label: 'Male' },
            { key: 'female', label: 'Female' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'all' | 'male' | 'female')}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {featuredRooms.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="mb-2 text-3xl">🏠</p>
            <p className="text-sm">No rooms have been posted yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
            
          </div>
        )}
      </section>

      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-center text-lg font-semibold text-gray-900">
            How it works
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                  {step.icon}
                </div>

                <p className="mb-1 font-medium text-gray-900">{step.title}</p>
                <p className="text-xs leading-relaxed text-gray-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">
          © 2026 Student Hostel · Built for university students
        </p>
      </footer>
    </main>
  )
}