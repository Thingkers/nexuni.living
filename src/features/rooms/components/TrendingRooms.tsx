'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

import RoomCard from '@/features/rooms/components/RoomCard'

import type { Room } from '@/features/rooms/types/room.types'

export default function TrendingRooms() {
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    async function loadRooms() {
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
        .order('views', {
          ascending: false,
        })
        .limit(6)

      setRooms((data ?? []) as Room[])
    }

    loadRooms()
  }, [])

  if (rooms.length === 0) {
    return null
  }

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Trending Rooms 🔥
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Most viewed listings
          </p>
        </div>
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