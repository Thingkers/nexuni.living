'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, LogOut } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useSavedRooms } from '@/features/rooms/components/SavedRoomsProvider'
import { useTheme } from '@/hooks/useTheme'
import { SunIcon, MoonIcon } from '@/components/icons/ThemeIcons'

export default function HomeHeaderAuth() {
  const t = useTranslations('Navbar')
  const router = useRouter()
  const { userId } = useSavedRooms()
  const { theme, toggleTheme } = useTheme()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
        aria-label={t('toggleDarkMode')}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      {userId ? (
        <>
          <Link href="/dashboard" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 sm:flex">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {t('dashboard')}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full bg-teal-300 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('logout')}
          </button>
        </>
      ) : (
        <>
          <Link href="/auth/login" className="rounded-full px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">
            {t('login')}
          </Link>
          <Link href="/auth/register" className="rounded-full bg-teal-300 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-teal-200">
            {t('register')}
          </Link>
        </>
      )}
    </>
  )
}
