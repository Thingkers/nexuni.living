'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { User } from '@supabase/supabase-js'
import {
  LayoutGrid, BookOpen, BriefcaseBusiness, Bus, MapPinned,
  LayoutDashboard, MessageSquare, Inbox, CalendarCheck, Wallet,
  Plus, LogOut, BarChart2, ShieldCheck, Flag, Building2, List, Users,
  Hourglass, CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { setLocaleAction } from '@/features/i18n/actions'
import type { AppLocale } from '@/i18n/request'
import BrandWordmark from '@/components/brand/BrandWordmark'
import { useTheme } from '@/hooks/useTheme'
import { SunIcon, MoonIcon } from '@/components/icons/ThemeIcons'

type Profile = {
  full_name: string | null
  avatar_url: string | null
  role?: string | null
  verification_status?: string | null
}

// Moved outside the component so it isn't re-created on every render
// (React flags components defined inside another component's render body).
function Avatar({
  size = 8,
  avatarUrl,
  initials,
}: {
  size?: number
  avatarUrl?: string | null
  initials: string
}) {
  return (
    <div
      className={`flex h-${size} w-${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-xs font-semibold text-teal-700`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('Navbar')
  const locale = useLocale() as AppLocale
  const [isLocalePending, startLocaleTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)
  // Room ids owned by the logged-in user — kept in a ref so the realtime
  // callbacks can check relevance without re-querying on every event.
  const ownedRoomIdsRef = useRef<string[]>([])

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingBookingCount, setPendingBookingCount] = useState(0)

  // Lazily read initial values from the browser (DOM / localStorage) once,
  // instead of setting state inside a useEffect after mount.
  const [myBookingCount, setMyBookingCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    return parseInt(localStorage.getItem('my_booking_updates') || '0', 10)
  })
  const [isOwner, setIsOwner] = useState(false)
  const { theme, toggleTheme } = useTheme()

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
    // Profile, unread count, and owned rooms don't depend on each other, so
    // they run in parallel; only the pending-bookings count has to wait for
    // the room ids. (Previously all five calls ran one after another.)
    async function loadUserExtras(uid: string) {
      const [{ data: profileData }, { count: msgCount }, { data: myRooms }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, avatar_url, role, verification_status')
          .eq('id', uid)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', uid)
          .eq('is_read', false),
        supabase
          .from('rooms')
          .select('id')
          .eq('owner_id', uid),
      ])

      setProfile(profileData)
      setUnreadCount(msgCount ?? 0)

      const roomIds = myRooms?.map((r) => r.id) ?? []
      ownedRoomIdsRef.current = roomIds
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

    // Realtime channels are only opened for logged-in users (anonymous
    // visitors used to open them too), and every callback first checks that
    // the event actually concerns this user before hitting the database —
    // otherwise each message/booking anywhere in the system made every
    // connected client run count queries.
    let channels: ReturnType<typeof supabase.channel>[] = []

    function subscribeRealtime(uid: string) {
      const messageChannel = supabase
        .channel(`navbar-unread-messages-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
          // Server-side filters on UPDATE need REPLICA IDENTITY FULL, so the
          // relevance check happens client-side instead.
          const row = (payload.new ?? payload.old) as { receiver_id?: string } | null
          if (row?.receiver_id !== uid) return
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', uid)
            .eq('is_read', false)
          setUnreadCount(count ?? 0)
        })
        .subscribe()

      const bookingChannel = supabase
        .channel(`navbar-bookings-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => {
          const newBooking = payload.new as { room_id?: string; user_id?: string; status?: string } | null

          // OWNER: refresh pending count only when the booking is on one of my rooms
          if (newBooking?.room_id && ownedRoomIdsRef.current.includes(newBooking.room_id)) {
            const { count } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending')
              .in('room_id', ownedRoomIdsRef.current)
            setPendingBookingCount(count ?? 0)
          }

          // TENANT: badge on My Bookings when owner confirms/rejects
          if (payload.eventType === 'UPDATE' && newBooking?.user_id === uid &&
              (newBooking.status === 'confirmed' || newBooking.status === 'rejected')) {
            setMyBookingCount((prev) => {
              const next = prev + 1
              localStorage.setItem('my_booking_updates', String(next))
              return next
            })
          }
        })
        .subscribe()

      channels = [messageChannel, bookingChannel]
    }

    function unsubscribeRealtime() {
      channels.forEach((channel) => supabase.removeChannel(channel))
      channels = []
    }

    async function loadUser() {
      // getSession reads the locally stored session — no auth-server round
      // trip just to render the navbar (middleware still validates for real).
      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) {
        await loadUserExtras(sessionUser.id)
        subscribeRealtime(sessionUser.id)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION is already handled by loadUser() above — skip to avoid double fetching
      if (event === 'INITIAL_SESSION') return
      // TOKEN_REFRESHED fires periodically for the same user — nothing changed
      if (event === 'TOKEN_REFRESHED') return

      setUser(session?.user ?? null)
      unsubscribeRealtime()
      if (!session) {
        ownedRoomIdsRef.current = []
        setProfile(null)
        setUnreadCount(0)
        setPendingBookingCount(0)
        setIsOwner(false)
      } else {
        // Re-fetch so isVerified updates immediately after login
        await loadUserExtras(session.user.id)
        subscribeRealtime(session.user.id)
      }
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeRealtime()
    }
  }, [])

  function toggleLocale() {
    const next: AppLocale = locale === 'en' ? 'bn' : 'en'
    startLocaleTransition(async () => {
      localStorage.setItem('locale', next)
      await setLocaleAction(next)
      router.refresh()
    })
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

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="page-shell flex h-[68px] items-center justify-between">

        {/* Logo */}
        <Link href="/" aria-label={t('brand')} onClick={closeMenus}>
          <BrandWordmark compact />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-5 lg:flex">
          {[
            { href: '/listings', label: t('housing'), Icon: LayoutGrid },
            { href: '/roommates', label: t('roommates'), Icon: Users },
            { href: '/books', label: t('books'), Icon: BookOpen, preview: true },
            { href: '/services', label: t('services'), Icon: MapPinned, preview: true },
            { href: '/jobs', label: t('jobs'), Icon: BriefcaseBusiness, preview: true },
            { href: '/transport', label: t('transport'), Icon: Bus, preview: true },
            // Payments lives under /dashboard, which the proxy gates behind
            // auth — only show it to logged-in users so guests don't get
            // bounced straight to the login page.
            ...(user ? [{ href: '/dashboard/payments', label: t('payments'), Icon: Wallet, preview: true }] : []),
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <link.Icon className="h-4 w-4" aria-hidden />
              {link.label}
              {link.preview && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t('preview')}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={t('toggleDarkMode')}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Language toggle — shows the language it will switch TO */}
          <button
            onClick={toggleLocale}
            disabled={isLocalePending}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={t('toggleLanguage')}
          >
            {locale === 'en' ? 'বাং' : 'EN'}
          </button>

          {user && isVerified && (
            <Link
              href="/post-room"
              className="hidden rounded-full bg-[#071c19] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-teal-400 dark:text-slate-950 lg:block"
            >
              {t('postRoom')}
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300 lg:hidden"
            aria-label={t('toggleMenu')}
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
            <div className="relative hidden lg:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full hover:ring-2 hover:ring-teal-300"
              >
                <Avatar size={8} avatarUrl={profile?.avatar_url} initials={initials} />
                {(unreadCount > 0 || pendingBookingCount > 0 || myBookingCount > 0) && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1 ring-white dark:ring-slate-950">
                    {unreadCount + pendingBookingCount + myBookingCount}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                    <Avatar size={7} avatarUrl={profile?.avatar_url} initials={initials} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{profile?.full_name || user.email}</p>
                      {!isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-yellow-600"><Hourglass className="h-2.5 w-2.5" aria-hidden /> {t('pending')}</span>
                      )}
                    </div>
                  </div>

                  <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                    <LayoutDashboard className="h-3.5 w-3.5 opacity-50" />{t('dashboard')}
                  </Link>

                  {isVerified && (
                    <Link href="/inbox" className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                      <span className="flex items-center gap-2.5"><MessageSquare className="h-3.5 w-3.5 opacity-50" />{t('inbox')}</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">{unreadCount}</span>
                      )}
                    </Link>
                  )}

                  {/* Owner section — only shown if user has posted rooms */}
                  {isVerified && isOwner && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-4 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('myListings')}</p>
                      <Link href="/profile?tab=rooms" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                        <List className="h-3.5 w-3.5 opacity-50" />{t('myRooms')}
                      </Link>
                      <Link href="/dashboard/bookings" className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                        <span className="flex items-center gap-2.5"><Inbox className="h-3.5 w-3.5 opacity-50" />{t('requestsReceived')}</span>
                        {pendingBookingCount > 0 && (
                          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">{pendingBookingCount}</span>
                        )}
                      </Link>
                      <Link href="/dashboard/analytics" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                        <BarChart2 className="h-3.5 w-3.5 opacity-50" />{t('analytics')}
                      </Link>
                    </>
                  )}

                  {/* Tenant section — always shown */}
                  {isVerified && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-4 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('myRenting')}</p>
                      <Link href="/dashboard/my-bookings" className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={goToMyBookings}>
                        <span className="flex items-center gap-2.5"><CalendarCheck className="h-3.5 w-3.5 opacity-50" />{t('myBookings')}</span>
                        {myBookingCount > 0 && (
                          <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">{myBookingCount}</span>
                        )}
                      </Link>
                      <Link href="/dashboard/payments" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                        <Wallet className="h-3.5 w-3.5 opacity-50" />{t('payments')}
                        <span className="ml-auto text-[8px] uppercase text-teal-600">{t('preview')}</span>
                      </Link>
                    </>
                  )}

                  {profile?.role === 'admin' && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-4 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('admin')}</p>
                      <Link href="/dashboard/analytics" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" onClick={closeMenus}>
                        <BarChart2 className="h-3.5 w-3.5 opacity-50" />{t('analytics')}
                      </Link>
                      <Link href="/admin/users" className="flex items-center gap-2.5 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <ShieldCheck className="h-3.5 w-3.5" />{t('adminUsers')}
                      </Link>
                      <Link href="/admin/rooms" className="flex items-center gap-2.5 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <Building2 className="h-3.5 w-3.5" />{t('adminRooms')}
                      </Link>
                      <Link href="/admin/reports" className="flex items-center gap-2.5 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <Flag className="h-3.5 w-3.5" />{t('reportListings')}
                      </Link>
                    </>
                  )}

                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <LogOut className="h-3.5 w-3.5" />{t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-3 lg:flex">
              <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">{t('login')}</Link>
              <Link href="/auth/register" className="rounded-full bg-[#071c19] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-teal-400 dark:text-slate-950">{t('register')}</Link>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="border-t border-gray-100 dark:border-gray-800 lg:hidden">
          <div className="max-h-[75vh] overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-1.5">

              <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('browse')}</p>
              {([
                { href: '/listings', Icon: LayoutGrid, label: t('housing') },
                { href: '/roommates', Icon: Users, label: t('roommates') },
                { href: '/books', Icon: BookOpen, label: t('books'), preview: true },
                { href: '/services', Icon: MapPinned, label: t('services'), preview: true },
                { href: '/jobs', Icon: BriefcaseBusiness, label: t('jobs'), preview: true },
                { href: '/transport', Icon: Bus, label: t('transport'), preview: true },
                ...(user ? [{ href: '/dashboard/payments', Icon: Wallet, label: t('payments'), preview: true }] : []),
              ]).map(({ href, Icon, label, preview }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-teal-50 hover:text-teal-700 dark:text-gray-300 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
                  onClick={closeMenus}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-60" />
                  {label}
                  {preview && (
                    <span className="ml-auto rounded-full bg-teal-50 px-2 py-0.5 text-[8px] font-bold uppercase text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                      {t('preview')}
                    </span>
                  )}
                </Link>
              ))}

              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

              {user ? (
                <>
                  <div className="flex items-center gap-3 rounded-xl bg-teal-50 px-3 py-2.5 dark:bg-teal-900/20">
                    <Avatar size={9} avatarUrl={profile?.avatar_url} initials={initials} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{profile?.full_name || user.email}</span>
                      {!isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-yellow-600"><Hourglass className="h-2.5 w-2.5" aria-hidden /> {t('verificationPending')}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600"><CheckCircle2 className="h-2.5 w-2.5" aria-hidden /> {t('verified')}</span>
                      )}
                    </div>
                  </div>

                  <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('account')}</p>

                  {isVerified && (
                    <Link href="/post-room" className="flex items-center gap-3 rounded-xl bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-600 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/40" onClick={closeMenus}>
                      <Plus className="h-4 w-4 shrink-0" />
                      {t('postRoomShort')}
                    </Link>
                  )}

                  <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                    <LayoutDashboard className="h-4 w-4 shrink-0 opacity-60" />
                    {t('dashboard')}
                  </Link>

                  {isVerified && (
                    <Link href="/inbox" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                      <span className="flex items-center gap-3"><MessageSquare className="h-4 w-4 shrink-0 opacity-60" />{t('inbox')}</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">{unreadCount}</span>
                      )}
                    </Link>
                  )}

                  {/* Owner section — only shown if user has posted rooms */}
                  {isVerified && isOwner && (
                    <>
                      <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('myListings')}</p>
                      <Link href="/profile?tab=rooms" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                        <List className="h-4 w-4 shrink-0 opacity-60" />{t('myRooms')}
                      </Link>
                      <Link href="/dashboard/bookings" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                        <span className="flex items-center gap-3"><Inbox className="h-4 w-4 shrink-0 opacity-60" />{t('requestsReceived')}</span>
                        {pendingBookingCount > 0 && (
                          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">{pendingBookingCount}</span>
                        )}
                      </Link>
                      <Link href="/dashboard/analytics" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                        <BarChart2 className="h-4 w-4 shrink-0 opacity-60" />{t('analytics')}
                      </Link>
                    </>
                  )}

                  {/* Tenant section — always shown */}
                  {isVerified && (
                    <>
                      <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('myRenting')}</p>
                      <Link href="/dashboard/my-bookings" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={goToMyBookings}>
                        <span className="flex items-center gap-3"><CalendarCheck className="h-4 w-4 shrink-0 opacity-60" />{t('myBookings')}</span>
                        {myBookingCount > 0 && (
                          <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">{myBookingCount}</span>
                        )}
                      </Link>
                      <Link href="/dashboard/payments" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                        <Wallet className="h-4 w-4 shrink-0 opacity-60" />{t('payments')}
                        <span className="ml-auto text-[8px] uppercase text-teal-600">{t('preview')}</span>
                      </Link>
                    </>
                  )}

                  {profile?.role === 'admin' && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('admin')}</p>
                      <Link href="/dashboard/analytics" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" onClick={closeMenus}>
                        <BarChart2 className="h-4 w-4 shrink-0 opacity-60" />{t('analytics')}
                      </Link>
                      <Link href="/admin/users" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <ShieldCheck className="h-4 w-4 shrink-0" />{t('adminUsers')}
                      </Link>
                      <Link href="/admin/rooms" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <Building2 className="h-4 w-4 shrink-0" />{t('adminRooms')}
                      </Link>
                      <Link href="/admin/reports" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20" onClick={closeMenus}>
                        <Flag className="h-4 w-4 shrink-0" />{t('reportListings')}
                      </Link>
                    </>
                  )}

                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <LogOut className="h-4 w-4 shrink-0" />
                    {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300" onClick={closeMenus}>{t('login')}</Link>
                  <Link href="/auth/register" className="rounded-xl bg-teal-600 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-teal-700" onClick={closeMenus}>{t('register')}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}