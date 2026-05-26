'use client'

import { useEffect, useState } from 'react'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { supabase } from '@/lib/supabase'

type Room = {
  id: string
  title: string
  views: number
}

type Booking = {
  status: string
}

export default function AnalyticsPage() {
  const [loading, setLoading] =
    useState(true)

  const [rooms, setRooms] =
    useState<Room[]>([])

  const [bookings, setBookings] =
    useState<Booking[]>([])

  useEffect(() => {
    async function loadData() {
      const { data: auth } =
        await supabase.auth.getUser()

      if (!auth.user) return

      const { data: roomsData } =
        await supabase
          .from('rooms')
          .select('id, title, views')
          .eq('owner_id', auth.user.id)

      const roomIds =
        (roomsData ?? []).map(
          (room) => room.id,
        )

      const { data: bookingsData } =
        await supabase
          .from('bookings')
          .select('status')
          .in('room_id', roomIds)

      setRooms((roomsData ?? []) as Room[])
      setBookings(
        (bookingsData ?? []) as Booking[],
      )

      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        Loading analytics...
      </div>
    )
  }

  const totalViews = rooms.reduce(
    (sum, room) =>
      sum + (room.views || 0),
    0,
  )

  const confirmedBookings =
    bookings.filter(
      (booking) =>
        booking.status === 'confirmed',
    ).length

  const pendingBookings =
    bookings.filter(
      (booking) =>
        booking.status === 'pending',
    ).length

  const topRoom =
    [...rooms].sort(
      (a, b) =>
        (b.views || 0) -
        (a.views || 0),
    )[0]

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Analytics Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Insights about your listings
        </p>
      </div>

      {/* stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Views"
          value={String(totalViews)}
        />

        <StatCard
          title="Confirmed Bookings"
          value={String(
            confirmedBookings,
          )}
        />

        <StatCard
          title="Pending Requests"
          value={String(
            pendingBookings,
          )}
        />

        <StatCard
          title="Top Room"
          value={
            topRoom?.title || 'N/A'
          }
        />
      </div>

      {/* chart */}
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Room Views
          </h2>

          <p className="text-sm text-gray-400">
            Performance of your listings
          </p>
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart data={rooms}>
              <XAxis dataKey="title" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="views"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  )
}

function StatCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <p className="text-sm text-gray-400">
        {title}
      </p>

      <h2 className="mt-2 text-2xl font-semibold text-gray-900">
        {value}
      </h2>
    </div>
  )
}