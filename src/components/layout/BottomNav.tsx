'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'

export default function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations('BottomNav')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      setIsLoggedIn(true)

      const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', data.user.id)
        .maybeSingle()

      const verified = profile?.verification_status === 'approved'
      setIsVerified(verified)

      if (verified) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', data.user.id)
          .eq('is_read', false)
        setUnread(count ?? 0)
      }
    }

    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!session) {
        setIsLoggedIn(false)
        setIsVerified(false)
        setUnread(0)
      } else {
        check()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Hide on auth pages
  if (pathname.startsWith('/auth/') || pathname.startsWith('/admin/')) return null

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navCls = (href: string) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
      isActive(href)
        ? 'text-teal-600 dark:text-teal-400'
        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 md:hidden">
      <div className="flex items-stretch">

        <Link href="/" className={navCls('/')}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/') ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {t('home')}
        </Link>

        <Link href="/listings" className={navCls('/listings')}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/listings') ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {t('browse')}
        </Link>

        {isLoggedIn && isVerified ? (
          <Link href="/post-room" className={navCls('/post-room')}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isActive('/post-room') ? 'bg-teal-600' : 'bg-teal-600'}`}>
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-teal-600 dark:text-teal-400">{t('post')}</span>
          </Link>
        ) : (
          <div className={navCls('/post-room') + ' opacity-40 cursor-not-allowed'}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            {t('post')}
          </div>
        )}

        {isLoggedIn && isVerified ? (
          <Link href="/inbox" className={navCls('/inbox')}>
            <div className="relative">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/inbox') ? 2.5 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            {t('inbox')}
          </Link>
        ) : (
          <Link href="/auth/login" className={navCls('/auth/login')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {t('inbox')}
          </Link>
        )}

        <Link href={isLoggedIn ? '/dashboard' : '/auth/login'} className={navCls(isLoggedIn ? '/dashboard' : '/auth/login')}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/dashboard') || isActive('/profile') ? 2.5 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {isLoggedIn ? t('me') : t('login')}
        </Link>

      </div>
    </nav>
  )
}
