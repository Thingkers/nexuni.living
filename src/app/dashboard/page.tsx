'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Stats = {
  listings: number
  pendingBookings: number
  unreadMessages: number
  activeBookings: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [profile, setProfile] = useState<{ full_name: string | null; role: string | null } | null>(null)
  const [stats, setStats] = useState<Stats>({
    listings: 0,
    pendingBookings: 0,
    unreadMessages: 0,
    activeBookings: 0,
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
        { count: activeBookings },
      ] = await Promise.all([
        supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', userId).eq('is_read', false),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['pending', 'confirmed', 'active']),
      ])

      const { data: ownerRooms } = await supabase.from('rooms').select('id').eq('owner_id', userId)
      const roomIds = ownerRooms?.map((r) => r.id) ?? []
      setIsOwner(roomIds.length > 0)

      let pendingBookings = 0
      if (roomIds.length > 0) {
        const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).in('room_id', roomIds).eq('status', 'pending')
        pendingBookings = count ?? 0
      }

      setStats({
        listings: listings ?? 0,
        pendingBookings,
        unreadMessages: unreadMessages ?? 0,
        activeBookings: activeBookings ?? 0,
      })

      setLoading(false)
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
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
  const isAdmin = profile?.role === 'admin'

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hi, {firstName} 👋</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          {isVerified ? 'Your account is verified.' : 'Your account is pending verification.'}
        </p>
      </div>

      {!isVerified && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-700/30 dark:bg-yellow-900/20 dark:text-yellow-400">
          ⏳ Admin verify করার পর সব features access করতে পারবেন।
        </div>
      )}

      {/* Profile quick link */}
      <Link
        href="/profile"
        className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:border-gray-200 dark:border-gray-700 dark:bg-gray-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg dark:bg-gray-700">👤</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.full_name ?? 'My Profile'}</p>
          <p className="text-xs text-gray-400">Edit profile & my rooms</p>
        </div>
        <span className="text-gray-300 dark:text-gray-600">›</span>
      </Link>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-400">My Rooms</p>
          <p className="mt-1 text-3xl font-bold text-teal-600">{stats.listings}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-400">Pending Requests</p>
          <p className="mt-1 text-3xl font-bold text-yellow-500">{stats.pendingBookings}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-400">Unread Messages</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{stats.unreadMessages}</p>
        </div>
      </div>

      {/* Owner section */}
      {isVerified && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">As Owner</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/post-room"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xl dark:bg-teal-900/30">➕</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Post a Room</p>
                <p className="text-xs text-gray-400">Create a new listing</p>
              </div>
            </Link>

            {isOwner && (
              <Link
                href="/dashboard/bookings"
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-yellow-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
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
            )}

            <Link
              href="/inbox"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
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
          </div>
        </div>
      )}

      {/* Tenant section */}
      {isVerified && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">As Tenant</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/my-bookings"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xl dark:bg-teal-900/30">
                🗓
                {stats.activeBookings > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">
                    {stats.activeBookings}
                  </span>
                )}
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">My Bookings</p>
                <p className="text-xs text-gray-400">Track your booking status</p>
              </div>
            </Link>

          </div>
        </div>
      )}

      {/* Admin section */}
      {isAdmin && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Admin</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl dark:bg-purple-900/30">📊</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Analytics</p>
                <p className="text-xs text-gray-400">Platform stats</p>
              </div>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xl dark:bg-teal-900/30">🛡️</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Admin Users</p>
                <p className="text-xs text-gray-400">Verify & manage users</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
