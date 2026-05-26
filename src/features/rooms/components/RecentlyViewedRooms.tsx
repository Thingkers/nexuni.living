'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { getRecentlyViewed } from '@/lib/recentlyViewed'

import RoomCard from '@/features/rooms/components/RoomCard'

import type { Room } from '@/features/rooms/types/room.types'

export default function RecentlyViewedRooms() {
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    async function loadRooms() {
      const ids = getRecentlyViewed()

      if (ids.length === 0) return

      const { data } = await supabase
        .from('rooms')
        .select(`
          *,
          profiles(
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .in('id', ids)

      const sorted =
        ids
          .map((id) =>
            (data ?? []).find(
              (room) => room.id === id,
            ),
          )
          .filter(Boolean) || []

      setRooms(sorted as Room[])
    }

    loadRooms()
  }, [])

  if (rooms.length === 0) {
    return null
  }

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Recently Viewed
        </h2>

        <p className="text-sm text-gray-400">
          Your recent room visits
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
          />
        ))}
      </div>
    </section>
  )
}