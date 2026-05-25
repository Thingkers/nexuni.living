'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

type Profile = {
  full_name: string | null
  avatar_url: string | null
  role?: string | null
}

export default function Navbar() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)

      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('id', data.user.id)
          .maybeSingle()

        setProfile(profileData)

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', data.user.id)
          .eq('is_read', false)

        setUnreadCount(count ?? 0)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      if (!session) {
        setProfile(null)
        setUnreadCount(0)
      }
    })

    const messageChannel = supabase
      .channel('navbar-unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async () => {
          const { data } = await supabase.auth.getUser()

          if (!data.user) return

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', data.user.id)
            .eq('is_read', false)

          setUnreadCount(count ?? 0)
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(messageChannel)
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    setMobileOpen(false)
    router.push('/')
  }

  function closeMenus() {
    setMenuOpen(false)
    setMobileOpen(false)
  }

  const initials =
    profile?.full_name
      ?.split(' ')
      ?.map((name) => name[0])
      ?.join('')
      ?.slice(0, 2)
      ?.toUpperCase() ?? 'U'

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-gray-900"
          onClick={closeMenus}
        >
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          Student Hostel
        </Link>

        <div className="hidden items-center gap-6 text-sm text-gray-500 md:flex">
          <Link href="/listings" className="hover:text-gray-900">
            All Listings
          </Link>

          <Link href="/listings?type=mess" className="hover:text-gray-900">
            Mess
          </Link>

          <Link href="/listings?type=bachelor" className="hover:text-gray-900">
            Bachelor
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/post-room"
              className="hidden rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 md:block"
            >
              + Post Room
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 md:hidden"
          >
            Menu
          </button>

          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 hover:ring-2 hover:ring-blue-300"
              >
                {initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
                    {profile?.full_name || user.email}
                  </div>

                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={closeMenus}
                  >
                    My Profile
                  </Link>

                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={closeMenus}
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/inbox"
                    className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={closeMenus}
                  >
                    <span>Inbox</span>

                    {unreadCount > 0 && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/dashboard/bookings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={closeMenus}
                  >
                    Booking Requests
                  </Link>

                  {profile?.role === 'admin' && (
                    <Link
                      href="/admin/reports"
                      className="block px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                      onClick={closeMenus}
                    >
                      Admin Reports
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/auth/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Login
              </Link>

              <Link
                href="/auth/register"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/listings"
              className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={closeMenus}
            >
              All Listings
            </Link>

            <Link
              href="/listings?type=mess"
              className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={closeMenus}
            >
              Mess
            </Link>

            <Link
              href="/listings?type=bachelor"
              className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={closeMenus}
            >
              Bachelor
            </Link>

            {user ? (
              <>
                <Link
                  href="/post-room"
                  className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={closeMenus}
                >
                  Post Room
                </Link>

                <Link
                  href="/profile"
                  className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={closeMenus}
                >
                  My Profile
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={closeMenus}
                >
                  Dashboard
                </Link>

                <Link
                  href="/inbox"
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={closeMenus}
                >
                  <span>Inbox</span>

                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/dashboard/bookings"
                  className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={closeMenus}
                >
                  Booking Requests
                </Link>

                {profile?.role === 'admin' && (
                <Link
                  href="/admin/reports"
                  className="block px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  onClick={closeMenus}
                >
                  Admin Reports
                </Link>
              )}

                <button
                  onClick={handleLogout}
                  className="rounded-xl px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={closeMenus}
                >
                  Login
                </Link>

                <Link
                  href="/auth/register"
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white"
                  onClick={closeMenus}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}