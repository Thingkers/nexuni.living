'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

import { supabase } from '@/lib/supabase'
import RoomCard from '@/features/rooms/components/RoomCard'
import type { Room } from '@/features/rooms/types/room.types'

const RoomsMap = dynamic(
  () => import('@/features/map/components/RoomsMap'),
  { ssr: false },
)

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Lowest Rent' },
  { value: 'price_desc', label: 'Highest Rent' },
]

function ListingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get('search') ?? '')
  const [gender, setGender] = useState(searchParams.get('gender') ?? '')
  const [type, setType] = useState(searchParams.get('type') ?? '')
  const [maxRent, setMaxRent] = useState(searchParams.get('rent') ?? '')
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest')

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState(
    searchParams.get('search') ?? '',
  )

  function syncURL(params: Record<string, string>) {
    const nextParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value) nextParams.set(key, value)
    })

    router.replace(
      `/listings${
        nextParams.toString() ? `?${nextParams.toString()}` : ''
      }`,
      { scroll: false },
    )
  }

  const fetchRooms = useCallback(async () => {
    setLoading(true)

    let queryBuilder = supabase.from('rooms').select(`
      *,
      profiles(full_name, phone, avatar_url, is_verified)
    `)

    queryBuilder = queryBuilder
      .neq('status', 'booked')
      .neq('status', 'closed')

    if (query.trim()) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,location_name.ilike.%${query}%`,
      )
    }

    if (gender) queryBuilder = queryBuilder.eq('gender_type', gender)
    if (type) queryBuilder = queryBuilder.eq('type', type)
    if (maxRent) queryBuilder = queryBuilder.lte('rent', Number(maxRent))

    if (sort === 'price_asc') {
      queryBuilder = queryBuilder.order('rent', { ascending: true })
    } else if (sort === 'price_desc') {
      queryBuilder = queryBuilder.order('rent', { ascending: false })
    } else {
      queryBuilder = queryBuilder.order('created_at', { ascending: false })
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error(error)
      setRooms([])
    } else {
      setRooms((data ?? []) as Room[])
    }

    setLoading(false)
  }, [query, gender, type, maxRent, sort])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  function handleSearch() {
    setQuery(inputValue)
    syncURL({
      search: inputValue,
      gender,
      type,
      rent: maxRent,
      sort,
    })
  }

  function clearAll() {
    setQuery('')
    setInputValue('')
    setGender('')
    setType('')
    setMaxRent('')
    setSort('newest')
    router.replace('/listings', { scroll: false })
  }

  const hasFilter = query || gender || type || maxRent || sort !== 'newest'

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">All Listings</h1>
      </div>

      {/* SEARCH */}
      <div className="mb-5 flex gap-2">
        <input
          className="flex-1 rounded-xl border px-4 py-2"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search..."
        />
        <button
          onClick={handleSearch}
          className="rounded-xl bg-blue-600 px-5 text-white"
        >
          Search
        </button>
      </div>

      {/* FILTER */}
      <div className="mb-5 flex items-center gap-3">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border px-3 py-2"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>


        {hasFilter && (
          <button onClick={clearAll} className="text-sm text-red-500">
            Clear
          </button>
        )}
      </div>

      {/* RESULTS COUNT */}
      <p className="mb-4 text-sm text-gray-500">
        {loading ? 'Loading...' : `${rooms.length} rooms found`}
      </p>

      {/* GRID + MAP */}
      {loading ? (
        <div>Loading...</div>
      ) : rooms.length === 0 ? (
        <p>No rooms found</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </main>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<p className="p-10">Loading...</p>}>
      <ListingsContent />
    </Suspense>
  )
}
