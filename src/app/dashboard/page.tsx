'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Stats = {
  listings: number
  pendingBookings: number
  unreadMessages: number
  myBookings: number
  savedRooms: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [profile, setProfile] = useState<{ full_name: string | null; role: string | null } | null>(null)
  const [stats, setStats] = useState<Stats>({
    listings: 0,
    pendingBookings: 0,
    unreadMessages: 0,
    myBookings: 0,
    savedRooms: 0,
  })

  useEffect(() => {
    async function loadDashboard() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }
      const userId = authData.user.id

      const { data: profileData } = await supabase
        .from('profiles')
        .select('verification_status, full_name, role')
        .eq('id', userId)
        .single()

      setProfile({ full_name: profileData?.full_name ?? null, role: profileData?.role ?? null })
      const verified = profileData?.verification_status === 'approved'
      setIsVerified(verified)

      const [
        { count: listings },
        { count: unreadMessages },
        { count: myBookings },
        { count: savedRooms },
      ] = await Promise.all([
        supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', userId).eq('is_read', false),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['pending', 'confirmed']),
        supabase.from('saved_rooms').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ])

      const { data: ownerRooms } = await supabase.from('rooms').select('id').eq('owner_id', userId)
      const roomIds = ownerRooms?.map((r) => r.id) ?? []
      let pendingBookings = 0
      if (roomIds.length > 0) {
        const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).in('room_id', roomIds).eq('status', 'pending')
        pendingBookings = count ?? 0
      }

      setStats({
        listings: listings ?? 0,
        pendingBookings,
        unreadMessages: unreadMessages ?? 0,
        myBookings: myBookings ?? 0,
        savedRooms: savedRooms ?? 0,
      })

      setLoading(false)
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Hi, {firstName} 👋
        </h1>
        <p className="mt-0.5 text-sm text-gray-400">
          {isVerified ? 'Your account is verified.' : 'Your account is pending verification.'}
        </p>
      </div>

      {/* Verification warning */}
      {!isVerified && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-700/30 dark:bg-yellow-900/20 dark:text-yellow-400">
          ⏳ Admin verify করার পর সব features access করতে পারবেন।
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-400">My Listings</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{stats.listings}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-400">Pending Requests</p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-3xl font-bold text-yellow-500">{stats.pendingBookings}</p>
            {stats.pendingBookings > 0 && <span className="mb-1 text-xs text-yellow-500">action needed</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-400">Unread Messages</p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-3xl font-bold text-green-600">{stats.unreadMessages}</p>
            {stats.unreadMessages > 0 && <span className="mb-1 text-xs text-green-600">new</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-400">Saved Rooms</p>
          <p className="mt-1 text-3xl font-bold text-pink-500">{stats.savedRooms}</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

        {isVerified ? (
          <Link href="/post-room" className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-900/30">➕</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Post a Room</p>
              <p className="text-xs text-gray-400">Create a new listing</p>
            </div>
          </Link>
        ) : (
          <div className="flex cursor-not-allowed items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 opacity-50 dark:border-gray-700 dark:bg-gray-800/50">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl dark:bg-gray-700">➕</span>
            <div>
              <p className="font-semibold text-gray-500 dark:text-gray-400">Post a Room</p>
              <p className="text-xs text-gray-400">Verification required</p>
            </div>
          </div>
        )}

        <Link href="/dashboard/bookings" className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-yellow-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-yellow-600">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-xl dark:bg-yellow-900/30">
            📋
            {stats.pendingBookings > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-white">
                {stats.pendingBookings}
              </span>
            )}
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Booking Requests</p>
            <p className="text-xs text-gray-400">Manage incoming requests</p>
          </div>
        </Link>

        <Link href="/inbox" className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-green-600">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl dark:bg-green-900/30">
            💬
            {stats.unreadMessages > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                {stats.unreadMessages}
              </span>
            )}
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Inbox</p>
            <p className="text-xs text-gray-400">Read and reply to messages</p>
          </div>
        </Link>

        <Link href="/dashboard/my-bookings" className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-900/30">
            🗓
            {stats.myBookings > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                {stats.myBookings}
              </span>
            )}
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">My Bookings</p>
            <p className="text-xs text-gray-400">Track your booking status</p>
          </div>
        </Link>

        <Link href="/dashboard/saved" className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-pink-600">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-xl dark:bg-pink-900/30">🤍</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Saved Rooms</p>
            <p className="text-xs text-gray-400">{stats.savedRooms} saved listing{stats.savedRooms !== 1 ? 's' : ''}</p>
          </div>
        </Link>

        <Link href="/profile" className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-500">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl dark:bg-gray-700">👤</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">My Profile</p>
            <p className="text-xs text-gray-400">Update personal information</p>
          </div>
        </Link>

        {profile?.role === 'admin' && (
          <>
            <Link href="/dashboard/analytics" className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl dark:bg-purple-900/30">📊</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Analytics</p>
                <p className="text-xs text-gray-400">Platform stats</p>
              </div>
            </Link>
            <Link href="/admin/users" className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-900/30">🛡️</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Admin Users</p>
                <p className="text-xs text-gray-400">Verify & manage users</p>
              </div>
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
