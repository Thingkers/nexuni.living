'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

export type RoomOwner = {
  full_name: string | null
  email: string | null
}

export type Room = {
  id: string
  title: string
  rent: number
  location_name: string
  status: string
  created_at: string

  profiles: RoomOwner | RoomOwner[] | null
}

export default function AdminRoomsPage() {
  const router = useRouter()

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRooms() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.push('/auth/login')
        return
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (me?.role !== 'admin') {
        router.push('/')
        return
      }

      const { data } = await supabase
        .from('rooms')
        .select(`
          id,
          title,
          rent,
          location_name,
          status,
          created_at,
          profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      // ✅ FIX: normalize profiles (ARRAY → OBJECT)
      const cleanData =
        (data ?? []).map((item: any) => ({
          ...item,
          profiles: Array.isArray(item.profiles)
            ? item.profiles[0]
            : item.profiles,
        })) as Room[]

      setRooms(cleanData)
      setLoading(false)
    }

    loadRooms()
  }, [router])

  async function toggleStatus(roomId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'open' ? 'closed' : 'open'

    const { error } = await supabase
      .from('rooms')
      .update({ status: nextStatus })
      .eq('id', roomId)

    if (!error) {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? { ...room, status: nextStatus }
            : room,
        ),
      )
    }
  }

  async function deleteRoom(roomId: string) {
    const confirmed = confirm('Delete this room permanently?')
    if (!confirmed) return

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)

    if (!error) {
      setRooms((prev) =>
        prev.filter((room) => room.id !== roomId),
      )
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-gray-400">Loading rooms...</p>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Rooms Management
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Total rooms: {rooms.length}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {rooms.map((room) => {
          const owner = Array.isArray(room.profiles)
            ? room.profiles[0]
            : room.profiles

          return (
            <div
              key={room.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/listings/${room.id}`}
                    className="text-base font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 sm:text-lg"
                  >
                    {room.title}
                  </Link>

                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    📍 {room.location_name} · 💰 ৳{room.rent.toLocaleString()}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      room.status === 'open'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : room.status === 'booked'
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {room.status}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      {owner?.full_name || 'Unknown Owner'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(room.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={() => toggleStatus(room.id, room.status)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {room.status === 'open' ? 'Close Listing' : 'Reopen Listing'}
                  </button>

                  <button
                    onClick={() => deleteRoom(room.id)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}