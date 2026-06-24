'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { Room } from '@/features/rooms/types/room.types'
import { isSharedRoom, ROOM_TYPE_LABELS } from '@/features/rooms/types/room.types'

type Props = {
  currentRoomId: string
  type: string
  locationName: string | null
  genderType: string
}

export default function SimilarRooms({ currentRoomId, type, locationName, genderType }: Props) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Try same type + same gender first, fallback to same type only
      let { data } = await supabase
        .from('rooms')
        .select('*, profiles(full_name, avatar_url)')
        .neq('id', currentRoomId)
        .neq('status', 'closed')
        .eq('type', type)
        .eq('gender_type', genderType)
        .order('created_at', { ascending: false })
        .limit(4)

      if (!data || data.length < 2) {
        const { data: fallback } = await supabase
          .from('rooms')
          .select('*, profiles(full_name, avatar_url)')
          .neq('id', currentRoomId)
          .neq('status', 'closed')
          .eq('type', type)
          .order('created_at', { ascending: false })
          .limit(4)
        data = fallback
      }

      setRooms((data ?? []) as Room[])
      setLoading(false)
    }

    load()
  }, [currentRoomId, type, genderType])

  if (loading) {
    return (
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Similar Rooms</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="h-32 rounded-t-2xl bg-gray-100 dark:bg-gray-700" />
              <div className="p-3">
                <div className="mb-2 h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
                <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (rooms.length === 0) return null

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Similar Rooms</h2>
        <Link
          href={`/listings?type=${type}&gender=${genderType}`}
          className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rooms.map((room) => {
          const img = room.images?.[0]
          const shared = isSharedRoom(room.type)
          const statusColor = room.status === 'open' ? 'bg-green-500' : room.status === 'partial' ? 'bg-yellow-400' : 'bg-red-500'

          return (
            <Link
              key={room.id}
              href={`/listings/${room.id}`}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Image */}
              <div className="relative h-28 overflow-hidden bg-gray-100 dark:bg-gray-700 sm:h-32">
                {img ? (
                  <Image src={img} alt={room.title} fill className="object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">🏠</div>
                )}
                <span className={`absolute left-2 top-2 h-2 w-2 rounded-full ${statusColor}`} />
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="mb-1 line-clamp-1 text-xs font-semibold text-gray-900 dark:text-white">
                  {room.title}
                </h3>
                <p className="mb-1 line-clamp-1 text-[10px] text-gray-400 dark:text-gray-500">
                  📍 {room.location_name || '—'}
                </p>
                <p className="text-sm font-bold text-teal-600 dark:text-teal-400">
                  ৳{room.rent.toLocaleString('en-US')}
                  <span className="text-[10px] font-normal text-gray-400">
                    {shared ? '/seat' : '/mo'}
                  </span>
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
