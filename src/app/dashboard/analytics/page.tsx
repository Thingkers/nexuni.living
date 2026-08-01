'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Home, CheckCircle2, Hourglass, Trophy, type LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Room    = { id: string; title: string }
type Booking = { status: string; room_id: string }

export default function AnalyticsPage() {
  const [loading, setLoading]   = useState(true)
  const [rooms, setRooms]       = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isDark, setIsDark]     = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function loadData() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return

      const { data: roomsData } = await supabase
        .from('rooms').select('id, title').eq('owner_id', auth.user.id)

      const roomIds = (roomsData ?? []).map((r) => r.id)

      const { data: bookingsData } = roomIds.length
        ? await supabase.from('bookings').select('status, room_id').in('room_id', roomIds)
        : { data: [] }

      setRooms((roomsData ?? []) as Room[])
      setBookings((bookingsData ?? []) as Booking[])
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="page-shell animate-pulse py-8">
        <div className="mb-2 h-7 w-48 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="mb-8 h-4 w-32 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
        <div className="mt-8 h-80 rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    )
  }

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length
  const pendingBookings   = bookings.filter((b) => b.status === 'pending').length
  const topRoom           = rooms.map((r) => ({
    ...r,
    count: bookings.filter((b) => b.room_id === r.id).length,
  })).sort((a, b) => b.count - a.count)[0]

  const chartData = rooms.map((r) => ({
    title: r.title,
    bookings: bookings.filter((b) => b.room_id === r.id).length,
  }))

  const axisColor   = isDark ? '#9ca3af' : '#6b7280'
  const gridColor   = isDark ? '#374151' : '#f3f4f6'
  const tooltipBg   = isDark ? '#1f2937' : '#ffffff'
  const tooltipText = isDark ? '#f9fafb' : '#111827'

  return (
    <main className="page-shell py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Insights about your listings</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard title="Total Rooms"        value={String(rooms.length)}        icon={Home} color="teal" />
        <StatCard title="Confirmed Bookings" value={String(confirmedBookings)} icon={CheckCircle2} color="green" />
        <StatCard title="Pending Requests"   value={String(pendingBookings)}   icon={Hourglass} color="yellow" />
        <StatCard title="Top Room"           value={topRoom?.title || 'N/A'}   icon={Trophy} color="purple" small />
      </div>

      {/* Bar chart */}
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bookings per Room</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">Total booking requests per listing</p>
        </div>

        {rooms.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No rooms posted yet
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="title"
                  tick={{ fill: axisColor, fontSize: 12 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: tooltipBg,
                    border: `1px solid ${gridColor}`,
                    borderRadius: 12,
                    color: tooltipText,
                    fontSize: 13,
                  }}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="bookings" radius={[8, 8, 0, 0]} fill={isDark ? '#14b8a6' : '#0d9488'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Booking breakdown */}
      {bookings.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Booking Status</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Confirmed', count: confirmedBookings, color: 'bg-green-500' },
              { label: 'Pending',   count: pendingBookings,   color: 'bg-yellow-400' },
              { label: 'Rejected',  count: bookings.filter((b) => b.status === 'rejected').length,  color: 'bg-red-400' },
              { label: 'Cancelled', count: bookings.filter((b) => b.status === 'cancelled').length, color: 'bg-gray-400' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-gray-500 dark:text-gray-400">{row.label}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-2 rounded-full ${row.color} transition-all duration-500`}
                    style={{ width: bookings.length ? `${(row.count / bookings.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-medium text-gray-600 dark:text-gray-300">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function StatCard({
  title, value, icon: Icon, color, small = false,
}: {
  title: string; value: string; icon: LucideIcon; color: string; small?: boolean
}) {
  const colorMap: Record<string, string> = {
    teal:   'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${colorMap[color]}`}>
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{title}</p>
      <h2 className={`mt-1 font-semibold text-gray-900 dark:text-white ${small ? 'truncate text-base' : 'text-2xl'}`}>
        {value}
      </h2>
    </div>
  )
}
