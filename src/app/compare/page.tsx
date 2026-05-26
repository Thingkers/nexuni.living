'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'
import { getComparedRooms, toggleCompareRoom } from '@/lib/compareRooms'
import type { Room } from '@/features/rooms/types/room.types'

const ROWS: {
  label: string
  render: (room: Room) => React.ReactNode
}[] = [
  {
    label: 'Monthly Rent',
    render: (room) => (
      <span className="text-lg font-bold text-blue-600">
        ৳{room.rent.toLocaleString('en-US')}
      </span>
    ),
  },
  {
    label: 'Type',
    render: (room) =>
      room.type === 'mess' ? 'Mess' : room.type === 'bachelor' ? 'Bachelor' : 'Sublet',
  },
  {
    label: 'For',
    render: (room) =>
      room.gender_type === 'male' ? '👦 Male' : room.gender_type === 'female' ? '👧 Female' : '👥 Any',
  },
  {
    label: 'Location',
    render: (room) => room.location_name || '—',
  },
  {
    label: 'Available Seats',
    render: (room) => (
      <span>
        <span className="font-semibold text-blue-600">{room.available_seats}</span>
        <span className="text-gray-400"> / {room.total_seats}</span>
      </span>
    ),
  },
  {
    label: 'Status',
    render: (room) => {
      const map: Record<string, { label: string; color: string }> = {
        open: { label: 'Open', color: 'text-green-600' },
        partial: { label: 'Partial', color: 'text-yellow-600' },
        booked: { label: 'Booked', color: 'text-red-500' },
        closed: { label: 'Closed', color: 'text-gray-400' },
      }
      const s = map[room.status] ?? map.open
      return <span className={`font-medium ${s.color}`}>{s.label}</span>
    },
  },
  {
    label: 'WiFi',
    render: (room) => (room.wifi ? '✅' : '❌'),
  },
  {
    label: 'Gas',
    render: (room) => (room.gas ? '✅' : '❌'),
  },
  {
    label: 'Electricity',
    render: (room) => (room.electricity ? '✅' : '❌'),
  },
  {
    label: 'Available From',
    render: (room) =>
      room.available_from
        ? new Date(room.available_from) <= new Date()
          ? 'Now'
          : new Date(room.available_from).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })
        : '—',
  },
]

export default function ComparePage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  async function loadRooms() {
    const ids = getComparedRooms()

    if (ids.length === 0) {
      setRooms([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('rooms')
      .select('*, profiles(full_name, avatar_url, is_verified)')
      .in('id', ids)

    setRooms((data ?? []) as Room[])
    setLoading(false)
  }

  useEffect(() => {
    loadRooms()
  }, [])

  function handleRemove(roomId: string) {
    toggleCompareRoom(roomId)
    setRooms((prev) => prev.filter((r) => r.id !== roomId))
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 animate-pulse">
        <div className="mb-6 h-8 w-48 rounded-xl bg-gray-100" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <p className="text-5xl">⚖️</p>
        <h1 className="mt-5 text-2xl font-semibold text-gray-900">
          No rooms selected for comparison
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Go to listings and click <strong>"⊕ Compare"</strong> on up to 3 rooms
        </p>
        <Link
          href="/listings"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Browse Listings →
        </Link>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Compare Rooms</h1>
          <p className="mt-1 text-sm text-gray-400">
            {rooms.length} room{rooms.length > 1 ? 's' : ''} selected
          </p>
        </div>
        <Link
          href="/listings"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          + Add More
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {/* Label column header */}
              <th className="w-36 p-4 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                Feature
              </th>

              {rooms.map((room) => (
                <th key={room.id} className="min-w-[220px] p-4 text-left">
                  {/* Room image */}
                  <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl bg-gray-100">
                    {room.images?.[0] ? (
                      <Image
                        src={room.images[0]}
                        alt={room.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        🏠
                      </div>
                    )}
                  </div>

                  {/* Room title */}
                  <Link
                    href={`/listings/${room.id}`}
                    className="line-clamp-1 text-sm font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {room.title}
                  </Link>

                  {/* Owner */}
                  <p className="mt-1 text-xs text-gray-400">
                    by {room.profiles?.full_name || 'Owner'}
                    {room.profiles?.is_verified && (
                      <span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white">
                        ✓
                      </span>
                    )}
                  </p>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(room.id)}
                    className="mt-2 text-xs text-red-400 hover:text-red-600"
                  >
                    ✕ Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {ROWS.map((row, idx) => (
              <tr
                key={row.label}
                className={`border-b border-gray-50 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                <td className="p-4 text-xs font-medium text-gray-500">
                  {row.label}
                </td>

                {rooms.map((room) => (
                  <td key={room.id} className="p-4 text-sm text-gray-700">
                    {row.render(room)}
                  </td>
                ))}
              </tr>
            ))}

            {/* View details row */}
            <tr>
              <td className="p-4" />
              {rooms.map((room) => (
                <td key={room.id} className="p-4">
                  <Link
                    href={`/listings/${room.id}`}
                    className="block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
                  >
                    View Listing →
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  )
}
