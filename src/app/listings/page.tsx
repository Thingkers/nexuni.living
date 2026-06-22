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

const PAGE_SIZE = 12

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
  { value: 'mess', label: 'Mess' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'single', label: 'Single Room' },
  { value: 'shared', label: 'Shared Room' },
  { value: 'sublet', label: 'Sublet' },
]

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

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-blue-500'
const selectCls = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'

function ListingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get('search') ?? '')
  const [inputValue, setInputValue] = useState(searchParams.get('search') ?? '')
  const [gender, setGender] = useState(searchParams.get('gender') ?? '')
  const [type, setType] = useState(searchParams.get('type') ?? '')
  const [maxRent, setMaxRent] = useState(searchParams.get('rent') ?? '')
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest')
  const [location, setLocation] = useState(searchParams.get('location') ?? '')
  const [locationInput, setLocationInput] = useState(searchParams.get('location') ?? '')
  const [availableMonth, setAvailableMonth] = useState(searchParams.get('month') ?? '')
  const [showFilters, setShowFilters] = useState(false)

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const monthOptions = buildMonthOptions()
  const hasMore = rooms.length < totalCount

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

  function buildQuery() {
    let qb = supabase.from('rooms').select(`
      *,
      profiles(full_name, phone, avatar_url, is_verified)
    `, { count: 'exact' })
      .neq('status', 'booked')
      .neq('status', 'closed')

    if (query.trim()) {
      qb = qb.or(`title.ilike.%${query}%,location_name.ilike.%${query}%`)
    }
    if (location.trim()) {
      qb = qb.ilike('location_name', `%${location.trim()}%`)
    }
    if (gender) qb = qb.eq('gender_type', gender)
    if (type) qb = qb.eq('type', type)
    if (maxRent) qb = qb.lte('rent', Number(maxRent))
    if (availableMonth) qb = qb.lte('available_from', `${availableMonth}-01`)
    if (currentUserId) qb = qb.neq('owner_id', currentUserId)

    if (sort === 'price_asc') {
      qb = qb.order('rent', { ascending: true })
    } else if (sort === 'price_desc') {
      qb = qb.order('rent', { ascending: false })
    } else {
      qb = qb.order('created_at', { ascending: false })
    }

    return qb
  }

  // Initial load and filter changes — always resets to page 1
  const fetchRooms = useCallback(async () => {
    setLoading(true)
    setPage(1)

    const { data, error, count } = await buildQuery().range(0, PAGE_SIZE - 1)

    if (!error) {
      setRooms((data ?? []) as Room[])
      setTotalCount(count ?? 0)
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, location, gender, type, maxRent, sort, availableMonth, currentUserId])

  async function loadMore() {
    setLoadingMore(true)
    const nextPage = page + 1
    const from = page * PAGE_SIZE
    const to = nextPage * PAGE_SIZE - 1

    const { data, error } = await buildQuery().range(from, to)

    if (!error && data) {
      setRooms((prev) => [...prev, ...(data as Room[])])
      setPage(nextPage)
    }
    setLoadingMore(false)
  }

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  // Debounce inputValue → query (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== query) {
        setQuery(inputValue)
        syncURL({ search: inputValue, location, gender, type, rent: maxRent, sort, month: availableMonth })
      }
    }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

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

  const activeFilterCount = [query, gender, type, maxRent, location, availableMonth].filter(Boolean).length

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* HEADER */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Listings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Browse available rooms for students</p>
      </div>

      {/* SEARCH ROW — stacks on mobile */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          className={`flex-1 ${inputCls}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by title or keyword..."
        />
        <input
          className={`sm:w-44 ${inputCls}`}
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Location..."
        />
        <button
          onClick={handleSearch}
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {/* FILTER TOGGLE — mobile */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setShowFilters((p) => !p)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 sm:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M10 12h4" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
          )}
        </button>

        {hasFilter && (
          <button onClick={clearAll} className="text-sm text-red-500 underline sm:hidden">
            Clear all
          </button>
        )}
      </div>

      {/* FILTER ROW — always visible on desktop, toggle on mobile */}
      <div className={`mb-4 ${showFilters ? 'block' : 'hidden sm:block'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(e) => handleFilterChange({ sort: e.target.value })}
            className={selectCls}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={gender}
            onChange={(e) => handleFilterChange({ gender: e.target.value })}
            className={selectCls}
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => handleFilterChange({ type: e.target.value })}
            className={selectCls}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            type="number"
            value={maxRent}
            onChange={(e) => handleFilterChange({ maxRent: e.target.value })}
            placeholder="Max rent (৳)"
            className={`w-36 ${inputCls}`}
            min={0}
          />

          <select
            value={availableMonth}
            onChange={(e) => handleFilterChange({ availableMonth: e.target.value })}
            className={selectCls}
          >
            <option value="">Any Month</option>
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {hasFilter && (
            <button onClick={clearAll} className="hidden text-sm text-red-500 underline sm:block">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Active filter chips — each has an × to remove */}
      {hasFilter && (
        <div className="mb-4 flex flex-wrap gap-2">
          {query && (
            <button onClick={() => { setQuery(''); setInputValue(''); syncURL({ search: '', location, gender, type, rent: maxRent, sort, month: availableMonth }) }} className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
              Search: {query} <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {location && (
            <button onClick={() => { setLocation(''); setLocationInput(''); syncURL({ search: query, location: '', gender, type, rent: maxRent, sort, month: availableMonth }) }} className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
              📍 {location} <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {gender && (
            <button onClick={() => handleFilterChange({ gender: '' })} className="flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
              {GENDER_OPTIONS.find(o => o.value === gender)?.label} <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {type && (
            <button onClick={() => handleFilterChange({ type: '' })} className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">
              {TYPE_OPTIONS.find(o => o.value === type)?.label} <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {maxRent && (
            <button onClick={() => handleFilterChange({ maxRent: '' })} className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
              Max ৳{maxRent} <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {availableMonth && (
            <button onClick={() => handleFilterChange({ availableMonth: '' })} className="flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-400">
              By: {monthOptions.find(o => o.value === availableMonth)?.label} <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
        </div>
      )}

      {/* RESULTS COUNT */}
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {loading
          ? 'Loading...'
          : totalCount === 0
          ? 'No rooms found'
          : `Showing ${rooms.length} of ${totalCount} room${totalCount !== 1 ? 's' : ''}`}
      </p>

      {/* GRID */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 h-44 rounded-xl bg-gray-100 dark:bg-gray-700" />
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
              <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-2 text-4xl">🔍</p>
          <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">No rooms found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your filters</p>
          {hasFilter && (
            <button onClick={clearAll} className="mt-3 text-sm text-blue-600 underline">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {rooms.length} of {totalCount} rooms
              </p>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-xl border border-gray-200 bg-white px-8 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Loading...
                  </span>
                ) : `Load more rooms`}
              </button>
            </div>
          )}

          {!hasMore && totalCount > PAGE_SIZE && (
            <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
              All {totalCount} rooms loaded
            </p>
          )}
        </>
      )}
    </main>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 h-8 w-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 h-44 rounded-xl bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    }>
      <ListingsContent />
    </Suspense>
  )
}
