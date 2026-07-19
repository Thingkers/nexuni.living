'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, ClipboardList, MessageSquare, CalendarCheck, BarChart2, ShieldCheck,
  Building2, Flag, BookOpen, BriefcaseBusiness, Bus, MapPinned, Users, Wallet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Stats = {
  pendingBookings: number
  unreadMessages: number
  activeBookings: number
}

type MyRoom = {
  id: string
  title: string
  rent: number
  location_name: string | null
  status: string
}

const ROOM_STATUS_LABEL: Record<string, string> = {
  open: '🟢 Open',
  partial: '🟡 Partial',
  booked: '🔴 Booked',
  closed: '⛔ Closed',
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [profile, setProfile] = useState<{ full_name: string | null; role: string | null; avatar_url: string | null } | null>(null)
  const [myRooms, setMyRooms] = useState<MyRoom[]>([])
  const [stats, setStats] = useState<Stats>({
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
        .select('verification_status, full_name, role, avatar_url')
        .eq('id', userId)
        .single()

      setProfile({
        full_name: profileData?.full_name ?? null,
        role: profileData?.role ?? null,
        avatar_url: profileData?.avatar_url ?? null,
      })
      const verified = profileData?.verification_status === 'approved'
      setIsVerified(verified)

      const [
        { count: unreadMessages },
        { count: activeBookings },
      ] = await Promise.all([
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', userId).eq('is_read', false),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['pending', 'confirmed', 'active']),
      ])

      const { data: ownerRooms } = await supabase
        .from('rooms')
        .select('id, title, rent, location_name, status')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
      const roomIds = ownerRooms?.map((r) => r.id) ?? []
      setIsOwner(roomIds.length > 0)
      setMyRooms((ownerRooms ?? []) as MyRoom[])

      let pendingBookings = 0
      if (roomIds.length > 0) {
        const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).in('room_id', roomIds).eq('status', 'pending')
        pendingBookings = count ?? 0
      }

      setStats({
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
      <div className="page-shell py-10">
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
  const initials =
    profile?.full_name
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U'

  return (
    <main className="page-shell py-8">

      {/* Header — profile card */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Link href="/profile" className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-50 text-teal-600 transition hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold">{initials}</span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">
            {profile?.full_name ?? 'My Profile'}
            {isVerified && <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">Verified</span>}
          </p>
          <p className="text-xs text-gray-400">{isVerified ? 'Your account is verified' : '⏳ Pending verification'}</p>
        </div>
        <Link href="/profile" className="text-sm text-gray-400 hover:text-teal-600 dark:hover:text-teal-400">›</Link>
      </div>

      {!isVerified && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-700/30 dark:bg-yellow-900/20 dark:text-yellow-400">
          ⏳ Admin verify করার পর সব features access করতে পারবেন।
        </div>
      )}

      {/* Owner section */}
      {isVerified && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">As Owner</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/post-room"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                <Plus className="h-5 w-5" />
              </span>
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
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                  <ClipboardList className="h-5 w-5" />
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

            {isOwner && (
              <Link
                href="/dashboard/analytics"
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <BarChart2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Listing Analytics</p>
                  <p className="text-xs text-gray-400">Demand and booking insights</p>
                </div>
              </Link>
            )}

            <Link
              href="/inbox"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <MessageSquare className="h-5 w-5" />
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
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                <CalendarCheck className="h-5 w-5" />
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

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Student life</p>
          <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">Roadmap previews</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { href: '/roommates', label: 'Roommates', Icon: Users, live: true },
            { href: '/books', label: 'Used Books', Icon: BookOpen },
            { href: '/services', label: 'Local Services', Icon: MapPinned },
            { href: '/jobs', label: 'Jobs', Icon: BriefcaseBusiness },
            { href: '/transport', label: 'Transport', Icon: Bus },
            { href: '/dashboard/payments', label: 'Payments', Icon: Wallet },
          ].map(({ href, label, Icon, live }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${
                  live ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {live ? 'Live' : 'Preview'}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Admin</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <BarChart2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Analytics</p>
                <p className="text-xs text-gray-400">Platform stats</p>
              </div>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Admin Users</p>
                <p className="text-xs text-gray-400">Verify & manage users</p>
              </div>
            </Link>
            <Link
              href="/admin/rooms"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Admin Rooms</p>
                <p className="text-xs text-gray-400">Manage all listings</p>
              </div>
            </Link>
            <Link
              href="/admin/reports"
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-red-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <Flag className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Report Listings</p>
                <p className="text-xs text-gray-400">Review flagged rooms</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
