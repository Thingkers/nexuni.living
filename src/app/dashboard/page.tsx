'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [stats, setStats] = useState({
    listings: 0,
    pendingBookings: 0,
    unreadMessages: 0,
  })

  useEffect(() => {
    async function loadDashboard() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.push('/auth/login')
        return
      }

      const userId = authData.user.id

      // ✅ Check verification status
      const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', userId)
        .single()

      setIsVerified(profile?.verification_status === 'approved')

      const [{ count: listings }, { count: unreadMessages }] =
        await Promise.all([
          supabase
            .from('rooms')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', userId),

          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId)
            .eq('is_read', false),
        ])

      const { data: ownerRooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('owner_id', userId)

      const roomIds = ownerRooms?.map((room) => room.id) ?? []
      let pendingBookings = 0

      if (roomIds.length > 0) {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('room_id', roomIds)
          .eq('status', 'pending')

        pendingBookings = count ?? 0
      }

      setStats({
        listings: listings ?? 0,
        pendingBookings,
        unreadMessages: unreadMessages ?? 0,
      })

      setLoading(false)
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return <div className="p-10 text-gray-500">Loading dashboard...</div>
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mb-8 text-gray-500">Manage your listings, bookings, and messages.</p>

      {/* ✅ Verification warning */}
      {!isVerified && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-700">
          ⏳ আপনার account এখনো verify হয়নি। Admin verify করার পর সব features access করতে পারবেন।
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">My Listings</p>
          <h2 className="mt-2 text-3xl font-bold text-blue-600">{stats.listings}</h2>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Pending Bookings</p>
          <h2 className="mt-2 text-3xl font-bold text-yellow-600">{stats.pendingBookings}</h2>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Unread Messages</p>
          <h2 className="mt-2 text-3xl font-bold text-green-600">{stats.unreadMessages}</h2>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {/* ✅ Only verified users see Post Room */}
        {isVerified ? (
          <Link
            href="/post-room"
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-blue-300"
          >
            <h3 className="font-semibold text-gray-900">+ Post New Room</h3>
            <p className="mt-1 text-sm text-gray-500">Create a new room or mess listing.</p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 opacity-50">
            <h3 className="font-semibold text-gray-400">+ Post New Room</h3>
            <p className="mt-1 text-sm text-gray-400">Verification প্রয়োজন।</p>
          </div>
        )}

        <Link
          href="/profile"
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-blue-300"
        >
          <h3 className="font-semibold text-gray-900">My Profile</h3>
          <p className="mt-1 text-sm text-gray-500">Update your personal information.</p>
        </Link>

        {/* ✅ Only verified users see Bookings & Inbox */}
        {isVerified ? (
          <Link
            href="/dashboard/bookings"
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-blue-300"
          >
            <h3 className="font-semibold text-gray-900">Booking Requests</h3>
            <p className="mt-1 text-sm text-gray-500">Review and manage booking requests.</p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 opacity-50">
            <h3 className="font-semibold text-gray-400">Booking Requests</h3>
            <p className="mt-1 text-sm text-gray-400">Verification প্রয়োজন।</p>
          </div>
        )}

        {isVerified ? (
          <Link
            href="/inbox"
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-blue-300"
          >
            <h3 className="font-semibold text-gray-900">Inbox</h3>
            <p className="mt-1 text-sm text-gray-500">Read and reply to messages.</p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 opacity-50">
            <h3 className="font-semibold text-gray-400">Inbox</h3>
            <p className="mt-1 text-sm text-gray-400">Verification প্রয়োজন।</p>
          </div>
        )}
      </div>
    </main>
  )
}
