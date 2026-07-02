'use client'

import { useEffect, useState } from 'react'
import { Home } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import RoomCard from '@/features/rooms/components/RoomCard'
import type { Room } from '@/features/rooms/types/room.types'

type Tab = 'all' | 'male' | 'female'

// The "all" tab is server-rendered (initialRooms) so rooms are visible on
// first paint; only the gender tabs fetch client-side, and results are kept
// per-tab so switching back is instant.
export default function FeaturedRooms({ initialRooms }: { initialRooms: Room[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [roomsByTab, setRoomsByTab] = useState<Partial<Record<Tab, Room[]>>>({ all: initialRooms })

  useEffect(() => {
    if (activeTab === 'all' || roomsByTab[activeTab]) return

    let cancelled = false
    supabase
      .from('rooms')
      .select('*, profiles(full_name, phone, avatar_url)')
      .neq('status', 'closed')
      .eq('gender_type', activeTab)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (cancelled) return
        setRoomsByTab((prev) => ({ ...prev, [activeTab]: (data ?? []) as Room[] }))
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const rooms = roomsByTab[activeTab]

  return (
    <>
      {/* Tabs */}
      <div className="mb-5 flex gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'male', label: 'Male' },
          { key: 'female', label: 'Female' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
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

      {rooms === undefined ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 h-44 rounded-xl bg-gray-100 dark:bg-gray-700" />
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
              <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-gray-800">
            <Home className="h-7 w-7" />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">No rooms posted yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </>
  )
}
