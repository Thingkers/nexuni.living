'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import RoomCard from '@/features/rooms/components/RoomCard'
import type { Room } from '@/features/rooms/types/room.types'

const GENDER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'mess', label: 'Mess' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'sublet', label: 'Sublet' },
]

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
  const [inputValue, setInputValue] = useState(searchParams.get('search') ?? '')

  function syncURL(params: Record<string, string>) {
    const nextParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value) nextParams.set(key, value)
    })

    router.replace(
      `/listings${nextParams.toString() ? `?${nextParams.toString()}` : ''}`,
      { scroll: false },
    )
  }

  const fetchRooms = useCallback(async () => {
    setLoading(true)

    let queryBuilder = supabase
      .from('rooms')
      .select('*, profiles(full_name, phone, avatar_url)')
      .neq('status', 'booked')
      .neq('status', 'closed')

    if (query.trim()) {
      const searchValue = query.trim()
      queryBuilder = queryBuilder.or(
        `title.ilike.%${searchValue}%,location_name.ilike.%${searchValue}%`,
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

    if (!error) {
      setRooms((data ?? []) as Room[])
    }

    setLoading(false)
  }, [query, gender, type, maxRent, sort])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  function handleSearch() {
    setQuery(inputValue)
    syncURL({ search: inputValue, gender, type, rent: maxRent, sort })
  }

  function changeGender(value: string) {
    setGender(value)
    syncURL({ search: query, gender: value, type, rent: maxRent, sort })
  }

  function changeType(value: string) {
    setType(value)
    syncURL({ search: query, gender, type: value, rent: maxRent, sort })
  }

  function changeMaxRent(value: string) {
    setMaxRent(value)
    syncURL({ search: query, gender, type, rent: value, sort })
  }

  function changeSort(value: string) {
    setSort(value)
    syncURL({ search: query, gender, type, rent: maxRent, sort: value })
  }

  function clearSearch() {
    setInputValue('')
    setQuery('')
    syncURL({ gender, type, rent: maxRent, sort })
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          All Listings
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Search and filter available student rooms, mess seats, and sublets.
        </p>
      </div>

      <div className="mb-5 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 focus-within:border-blue-500">
          <span className="text-gray-300">🔍</span>

          <input
            type="text"
            placeholder="Search by area or room title..."
            className="flex-1 bg-transparent text-sm outline-none"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
          />

          {inputValue && (
            <button
              onClick={clearSearch}
              className="text-lg text-gray-300 hover:text-gray-500"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={handleSearch}
          className="rounded-xl bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {GENDER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => changeGender(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              gender === option.value
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            {option.label}
          </button>
        ))}

        <div className="h-4 w-px bg-gray-200" />

        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => changeType(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              type === option.value
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            {option.label}
          </button>
        ))}

        <div className="h-4 w-px bg-gray-200" />

        <input
          type="number"
          placeholder="Max rent"
          className="w-32 rounded-full border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
          value={maxRent}
          onChange={(event) => changeMaxRent(event.target.value)}
        />

        <div className="h-4 w-px bg-gray-200" />

        <select
          value={sort}
          onChange={(event) => changeSort(event.target.value)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {hasFilter && (
          <button
            onClick={clearAll}
            className="ml-auto text-xs text-red-400 hover:text-red-600"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      <div className="mb-5 flex items-center gap-2">
        <p className="text-sm text-gray-400">
          {loading ? 'Searching...' : `${rooms.length} listings found`}
        </p>

        {query && !loading && (
          <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
            🔍 “{query}”
            <button onClick={clearSearch} className="ml-1 hover:text-red-500">
              ×
            </button>
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-20 text-center">
          <p className="mb-3 text-4xl">🔍</p>
          <p className="mb-1 font-medium text-gray-500">
            No listings found
          </p>
          <p className="mb-4 text-sm text-gray-400">
            Try changing your search or filters.
          </p>

          <button
            onClick={clearAll}
            className="rounded-xl border border-blue-300 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
          >
            View all listings
          </button>
        </div>
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
    <Suspense fallback={<div className="p-10 text-gray-500">Loading listings...</div>}>
      <ListingsContent />
    </Suspense>
  )
}