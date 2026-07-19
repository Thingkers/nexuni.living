'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RoomCard from '@/features/rooms/components/RoomCard'
import type { Room } from '@/features/rooms/types/room.types'

// Shape of each row returned by the `saved_rooms` join query before we
// flatten it down to just the nested `rooms` object.
type SavedRoomRow = {
  room_id: string
  rooms: Room | null
}

export default function SavedRoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSaved() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('saved_rooms')
        .select('room_id, rooms(*, profiles(full_name, phone, avatar_url, is_verified))')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })

      const saved = ((data ?? []) as unknown as SavedRoomRow[])
        .map((row) => row.rooms)
        .filter(Boolean) as Room[]

      setRooms(saved)
      setLoading(false)
    }

    loadSaved()
  }, [router])

  if (loading) {
    return (
      <div className="page-shell py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="page-shell py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Saved Rooms</h1>
        <p className="mt-1 text-sm text-gray-400">{rooms.length} saved listing{rooms.length !== 1 ? 's' : ''}</p>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
          <p className="mb-2 text-4xl">🤍</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No saved rooms yet</p>
          <p className="mt-1 text-xs text-gray-400">Tap the heart icon on any listing to save it</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </main>
  )
}