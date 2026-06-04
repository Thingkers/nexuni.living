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

const GENDER_OPTIONS = [
  { value: '', label: 'Any Gender' },
  { value: 'male', label: 'Male Only' },
  { value: 'female', label: 'Female Only' },
  { value: 'any', label: 'Mixed' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Any Type' },
  { value: 'single', label: 'Single Room' },
  { value: 'shared', label: 'Shared Room' },
  { value: 'sublet', label: 'Sublet' },
]

// Month list for the "Available From" picker
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getCurrentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function buildMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    options.push({ value, label })
  }
  return options
}

function ListingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get('search') ?? '')
  const [inputValue, setInputValue] = useState(searchParams.get('search') ?? '')
  const [gender, setGender] = useState(searchParams.get('gender') ?? '')
  const [type, setType] = useState(searchParams.get('type') ?? '')
  const [maxRent, setMaxRent] = useState(searchParams.get('rent') ?? '')
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest')

  // New filters
  const [location, setLocation] = useState(searchParams.get('location') ?? '')
  const [locationInput, setLocationInput] = useState(searchParams.get('location') ?? '')
  const [availableMonth, setAvailableMonth] = useState(searchParams.get('month') ?? '')

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const monthOptions = buildMonthOptions()

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

    let queryBuilder = supabase.from('rooms').select(`
      *,
      profiles(full_name, phone, avatar_url, is_verified)
    `)

    queryBuilder = queryBuilder
      .neq('status', 'booked')
      .neq('status', 'closed')

    // Text search (title or location_name)
    if (query.trim()) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,location_name.ilike.%${query}%`,
      )
    }

    // Location filter — separate dedicated filter
    if (location.trim()) {
      queryBuilder = queryBuilder.ilike('location_name', `%${location.trim()}%`)
    }

    if (gender) queryBuilder = queryBuilder.eq('gender_type', gender)
    if (type) queryBuilder = queryBuilder.eq('type', type)
    if (maxRent) queryBuilder = queryBuilder.lte('rent', Number(maxRent))

    // Available from month filter
    // Assumes `available_from` is a date column in the DB (e.g. "2025-07-01")
    // We filter rooms where available_from <= first day of selected month
    // i.e. room is already available by that month
    if (availableMonth) {
      const firstDay = `${availableMonth}-01`
      queryBuilder = queryBuilder.lte('available_from', firstDay)
    }

    if (currentUserId) {
      queryBuilder = queryBuilder.neq('owner_id', currentUserId)
    }





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
  }, [query, location, gender, type, maxRent, sort, availableMonth, currentUserId])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setCurrentUserId(data.user?.id ?? null)
  })
}, [])




  function handleSearch() {
    setQuery(inputValue)
    setLocation(locationInput)
    syncURL({
      search: inputValue,
      location: locationInput,
      gender,
      type,
      rent: maxRent,
      sort,
      month: availableMonth,
    })
  }

  function handleFilterChange(updates: Partial<{
    gender: string
    type: string
    maxRent: string
    sort: string
    availableMonth: string
  }>) {
    const next = {
      gender: updates.gender ?? gender,
      type: updates.type ?? type,
      maxRent: updates.maxRent ?? maxRent,
      sort: updates.sort ?? sort,
      availableMonth: updates.availableMonth ?? availableMonth,
    }
    if (updates.gender !== undefined) setGender(next.gender)
    if (updates.type !== undefined) setType(next.type)
    if (updates.maxRent !== undefined) setMaxRent(next.maxRent)
    if (updates.sort !== undefined) setSort(next.sort)
    if (updates.availableMonth !== undefined) setAvailableMonth(next.availableMonth)

    syncURL({
      search: query,
      location,
      gender: next.gender,
      type: next.type,
      rent: next.maxRent,
      sort: next.sort,
      month: next.availableMonth,
    })
  }

  function clearAll() {
    setQuery('')
    setInputValue('')
    setGender('')
    setType('')
    setMaxRent('')
    setSort('newest')
    setLocation('')
    setLocationInput('')
    setAvailableMonth('')
    router.replace('/listings', { scroll: false })
  }

  const hasFilter =
    query || gender || type || maxRent || sort !== 'newest' || location || availableMonth

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">All Listings</h1>
      </div>

      {/* SEARCH ROW */}
      <div className="mb-4 flex gap-2">
        {/* Keyword search */}
        <input
          className="flex-1 rounded-xl border px-4 py-2"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by title..."
        />
        {/* Location search */}
        <input
          className="w-48 rounded-xl border px-4 py-2"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter Location Name..."
        />
        <button
          onClick={handleSearch}
          className="rounded-xl bg-blue-600 px-5 text-white"
        >
          Search
        </button>
      </div>

      {/* FILTER ROW */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => handleFilterChange({ sort: e.target.value })}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Gender */}
        <select
          value={gender}
          onChange={(e) => handleFilterChange({ gender: e.target.value })}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Room type */}
        <select
          value={type}
          onChange={(e) => handleFilterChange({ type: e.target.value })}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Max rent */}
        <input
          type="number"
          value={maxRent}
          onChange={(e) => handleFilterChange({ maxRent: e.target.value })}
          placeholder="Max rent (৳)"
          className="w-36 rounded-xl border px-3 py-2 text-sm"
          min={0}
        />

        {/* Available from month */}
        <select
          value={availableMonth}
          onChange={(e) => handleFilterChange({ availableMonth: e.target.value })}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">Any Month</option>
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Clear */}
        {hasFilter && (
          <button onClick={clearAll} className="text-sm text-red-500 underline">
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilter && (
        <div className="mb-4 flex flex-wrap gap-2">
          {query && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
              Search: {query}
            </span>
          )}
          {location && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
              Location: {location}
            </span>
          )}
          {gender && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700">
              Gender: {GENDER_OPTIONS.find(o => o.value === gender)?.label}
            </span>
          )}
          {type && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-700">
              Type: {TYPE_OPTIONS.find(o => o.value === type)?.label}
            </span>
          )}
          {maxRent && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700">
              Max rent: ৳{maxRent}
            </span>
          )}
          {availableMonth && (
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs text-teal-700">
              Available by: {monthOptions.find(o => o.value === availableMonth)?.label}
            </span>
          )}
        </div>
      )}

      {/* RESULTS COUNT */}
      <p className="mb-4 text-sm text-gray-500">
        {loading ? 'Loading...' : `${rooms.length} rooms found`}
      </p>

      {/* GRID */}
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
