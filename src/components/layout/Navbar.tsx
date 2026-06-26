'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Home, LayoutGrid, UtensilsCrossed, BedDouble, Key,
  LayoutDashboard, MessageSquare, Inbox, CalendarCheck,
  Plus, LogOut, BarChart2, ShieldCheck, User, Flag, Building2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Profile = {
  full_name: string | null
  avatar_url: string | null
  role?: string | null
  verification_status?: string | null
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71m12.02 0-.71-.71M6.34 6.34l-.71-.71M12 5a7 7 0 1 1 0 14A7 7 0 0 1 12 5z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function Navbar() {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingBookingCount, setPendingBookingCount] = useState(0)
  const [myBookingCount, setMyBookingCount] = useState(0)
  const [isOwner, setIsOwner] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Read initial theme from DOM (set by inline script)
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    setMyBookingCount(parseInt(localStorage.getItem('my_booking_updates') || '0', 10))
  }, [])

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)

      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role, verification_status')
          .eq('id', data.user.id)
          .maybeSingle()

        setProfile(profileData)

        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', data.user.id)
          .eq('is_read', false)

        setUnreadCount(msgCount ?? 0)

        const { data: myRooms } = await supabase
          .from('rooms')
          .select('id')
          .eq('owner_id', data.user.id)

        const roomIds = myRooms?.map((r) => r.id) ?? []
        setIsOwner(roomIds.length > 0)

        if (roomIds.length > 0) {
          const { count: bookingCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .in('room_id', roomIds)

          setPendingBookingCount(bookingCount ?? 0)
        }
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION is already handled by loadUser() above — skip to avoid double fetching
      if (event === 'INITIAL_SESSION') return

      setUser(session?.user ?? null)
      if (!session) {
        setProfile(null)
        setUnreadCount(0)
        setPendingBookingCount(0)
        setIsOwner(false)
      } else {
        // Re-fetch profile so isVerified updates immediately after login
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role, verification_status')
          .eq('id', session.user.id)
          .maybeSingle()
        setProfile(profileData)

        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', session.user.id)
          .eq('is_read', false)
        setUnreadCount(msgCount ?? 0)

        const { data: myRooms } = await supabase
          .from('rooms')
          .select('id')
          .eq('owner_id', session.user.id)
        const roomIds = myRooms?.map((r) => r.id) ?? []
        setIsOwner(roomIds.length > 0)
        if (roomIds.length > 0) {
          const { count: bookingCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .in('room_id', roomIds)
          setPendingBookingCount(bookingCount ?? 0)
        }
      }
    })

    const messageChannel = supabase
      .channel('navbar-unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        const { data } = await supabase.auth.getUser()
        if (!data.user) return
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', data.user.id)
          .eq('is_read', false)
        setUnreadCount(count ?? 0)
      })
      .subscribe()

    const bookingChannel = supabase
      .channel('navbar-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => {
        const { data } = await supabase.auth.getUser()
        if (!data.user) return
        const uid = data.user.id

        // OWNER: update pending booking count
        const { data: myRooms } = await supabase.from('rooms').select('id').eq('owner_id', uid)
        const roomIds = myRooms?.map((r) => r.id) ?? []
        if (roomIds.length > 0) {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .in('room_id', roomIds)
          setPendingBookingCount(count ?? 0)
        }

        // TENANT: badge on My Bookings when owner confirms/rejects
        if (payload.eventType === 'UPDATE') {
          const newBooking = payload.new as { user_id: string; status: string }
          if (newBooking.user_id === uid && (newBooking.status === 'confirmed' || newBooking.status === 'rejected')) {
            setMyBookingCount((prev) => {
              const next = prev + 1
              localStorage.setItem('my_booking_updates', String(next))
              return next
            })
          }
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(bookingChannel)
    }
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setUnreadCount(0)
    setPendingBookingCount(0)
    setMenuOpen(false)
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  function closeMenus() {
    setMenuOpen(false)
    setMobileOpen(false)
  }

  function goToMyBookings() {
    setMyBookingCount(0)
    localStorage.removeItem('my_booking_updates')
    closeMenus()
  }

  const initials =
    profile?.full_name
      ?.split(' ')
      ?.map((name) => name[0])
      ?.join('')
      ?.slice(0, 2)
      ?.toUpperCase() ?? 'U'

  const isVerified = profile?.verification_status === 'approved'

  const Avatar = ({ size = 8 }: { size?: number }) => (
    <div
      className={`flex h-${size} w-${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-xs font-semibold text-teal-700`}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95">
      <div className="flex items-center justify-between px-4 py-3 md:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5" onClick={closeMenus}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
            <Home className="h-4 w-4" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white">Students Home </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-0.5 text-sm md:flex">
          {[
            { href: '/listings', label: 'All Rooms' },
            { href: '/listings?type=mess', label: 'Mess' },
            { href: '/listings?type=bachelor', label: 'Bachelor' },
            { href: '/listings?type=sublet', label: 'Sublet' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative rounded-xl px-3.5 py-2 font-medium text-gray-500 transition-colors hover:bg-teal-50 hover:text-teal-700 dark:text-gray-400 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {user && isVerified && (
            <Link
              href="/post-room"
              className="hidden rounded-xl bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 md:block"
            >
              + Post Room
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
            {(unreadCount > 0 || pendingBookingCount > 0 || myBookingCount > 0) && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount + pendingBookingCount + myBookingCount}
              </span>
            )}
          </button>

          {/* Desktop avatar dropdown */}
          {user ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full hover:ring-2 hover:ring-teal-300"
              >
                <Avatar size={8} />
                {(unreadCount > 0 || pendingBookingCount > 0 || myBookingCount > 0) && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-1 ring-white" />
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                    <Avatar size={7} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{profile?.full_name || user.email}</p>
                      {!isVerified && (
                        <span className="text-[10px] text-yellow-600">⏳ Pending</span>
                      )}
                    </div>
                  </div>

                  <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                    <LayoutDashboard className="h-3.5 w-3.5 opacity-50" />Dashboard
                  </Link>

                  {isVerified && (
                    <Link href="/inbox" className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                      <span className="flex items-center gap-2.5"><MessageSquare className="h-3.5 w-3.5 opacity-50" />Inbox</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">{unreadCount}</span>
                      )}
                    </Link>
                  )}

                  {/* Owner section — only shown if user has posted rooms */}
                  {isVerified && isOwner && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-4 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">My Listings</p>
                      <Link href="/dashboard/bookings" className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                        <span className="flex items-center gap-2.5"><Inbox className="h-3.5 w-3.5 opacity-50" />Requests Received</span>
                        {pendingBookingCount > 0 && (
                          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">{pendingBookingCount}</span>
                        )}
                      </Link>
                    </>
                  )}

                  {/* Tenant section — always shown */}
                  {isVerified && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-4 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">My Renting</p>
                      <Link href="/dashboard/my-bookings" className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={goToMyBookings}>
                        <span className="flex items-center gap-2.5"><CalendarCheck className="h-3.5 w-3.5 opacity-50" />My Bookings</span>
                        {myBookingCount > 0 && (
                          <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">{myBookingCount}</span>
                        )}
                      </Link>
                    </>
                  )}

                  {profile?.role === 'admin' && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-4 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin</p>
                      <Link href="/dashboard/analytics" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                        <BarChart2 className="h-3.5 w-3.5 opacity-50" />Analytics
                      </Link>
                      <Link href="/admin/users" className="flex items-center gap-2.5 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <ShieldCheck className="h-3.5 w-3.5" />Admin Users
                      </Link>
                      <Link href="/admin/rooms" className="flex items-center gap-2.5 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <Building2 className="h-3.5 w-3.5" />Admin Rooms
                      </Link>
                      <Link href="/admin/reports" className="flex items-center gap-2.5 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <Flag className="h-3.5 w-3.5" />Report Listings
                      </Link>
                    </>
                  )}

                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <LogOut className="h-3.5 w-3.5" />Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Login</Link>
              <Link href="/auth/register" className="rounded-xl bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">Register</Link>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="border-t border-gray-100 dark:border-gray-800 md:hidden">
          <div className="max-h-[75vh] overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-1.5">

              <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Browse</p>
              {([
                { href: '/listings', Icon: LayoutGrid, label: 'All Rooms' },
                { href: '/listings?type=mess', Icon: UtensilsCrossed, label: 'Mess' },
                { href: '/listings?type=bachelor', Icon: BedDouble, label: 'Bachelor' },
                { href: '/listings?type=sublet', Icon: Key, label: 'Sublet' },
              ] as const).map(({ href, Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-teal-50 hover:text-teal-700 dark:text-gray-300 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
                  onClick={closeMenus}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-60" />
                  {label}
                </Link>
              ))}

              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

              {user ? (
                <>
                  <div className="flex items-center gap-3 rounded-xl bg-teal-50 px-3 py-2.5 dark:bg-teal-900/20">
                    <Avatar size={9} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{profile?.full_name || user.email}</span>
                      {!isVerified ? (
                        <span className="text-[10px] text-yellow-600">⏳ Verification Pending</span>
                      ) : (
                        <span className="text-[10px] text-green-600">✓ Verified</span>
                      )}
                    </div>
                  </div>

                  <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Account</p>

                  {isVerified && (
                    <Link href="/post-room" className="flex items-center gap-3 rounded-xl bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-600 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/40" onClick={closeMenus}>
                      <Plus className="h-4 w-4 shrink-0" />
                      Post Room
                    </Link>
                  )}

                  <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                    <LayoutDashboard className="h-4 w-4 shrink-0 opacity-60" />
                    Dashboard
                  </Link>

                  {isVerified && (
                    <Link href="/inbox" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                      <span className="flex items-center gap-3"><MessageSquare className="h-4 w-4 shrink-0 opacity-60" />Inbox</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">{unreadCount}</span>
                      )}
                    </Link>
                  )}

                  {/* Owner section — only shown if user has posted rooms */}
                  {isVerified && isOwner && (
                    <>
                      <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">My Listings</p>
                      <Link href="/dashboard/bookings" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                        <span className="flex items-center gap-3"><Inbox className="h-4 w-4 shrink-0 opacity-60" />Requests Received</span>
                        {pendingBookingCount > 0 && (
                          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">{pendingBookingCount}</span>
                        )}
                      </Link>
                    </>
                  )}

                  {/* Tenant section — always shown */}
                  {isVerified && (
                    <>
                      <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">My Renting</p>
                      <Link href="/dashboard/my-bookings" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={goToMyBookings}>
                        <span className="flex items-center gap-3"><CalendarCheck className="h-4 w-4 shrink-0 opacity-60" />My Bookings</span>
                        {myBookingCount > 0 && (
                          <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">{myBookingCount}</span>
                        )}
                      </Link>
                    </>
                  )}

                  {profile?.role === 'admin' && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin</p>
                      <Link href="/dashboard/analytics" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                        <BarChart2 className="h-4 w-4 shrink-0 opacity-60" />Analytics
                      </Link>
                      <Link href="/admin/users" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <ShieldCheck className="h-4 w-4 shrink-0" />Admin Users
                      </Link>
                      <Link href="/admin/rooms" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <Building2 className="h-4 w-4 shrink-0" />Admin Rooms
                      </Link>
                      <Link href="/admin/reports" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <Flag className="h-4 w-4 shrink-0" />Report Listings
                      </Link>
                    </>
                  )}

                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <LogOut className="h-4 w-4 shrink-0" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300" onClick={closeMenus}>Login</Link>
                  <Link href="/auth/register" className="rounded-xl bg-teal-600 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-teal-700" onClick={closeMenus}>Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
