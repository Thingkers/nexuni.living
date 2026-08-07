import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Home,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { createAnonServerClient } from '@/lib/supabase/server'
import FeaturedRooms from '@/features/rooms/components/FeaturedRooms'
import HeroSearch from '@/features/search/components/HeroSearch'
import type { Room } from '@/features/rooms/types/room.types'
import BrandWordmark from '@/components/brand/BrandWordmark'

// Locale is read from a cookie in the root layout (src/i18n/request.ts),
// which makes every page sharing that layout dynamic — so this page can no
// longer be served from a 60s ISR cache; it re-fetches on every request.
// Accepted trade-off, see docs/playbook.md Sprint 2 Session 2.A plan.

async function getHomeData(): Promise<{
  rooms: Room[]
  totalRooms: number
}> {
  const supabase = createAnonServerClient()
  if (!supabase) return { rooms: [], totalRooms: 0 }

  try {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('rooms')
        .select('*, profiles(full_name, phone, avatar_url)')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(8)
        .abortSignal(AbortSignal.timeout(5000)),
      supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'closed')
        .abortSignal(AbortSignal.timeout(5000)),
    ])

    return {
      rooms: (data ?? []) as Room[],
      totalRooms: count ?? 0,
    }
  } catch {
    return { rooms: [], totalRooms: 0 }
  }
}

export default async function HomePage() {
  const [{ rooms: featuredRooms, totalRooms }, t] = await Promise.all([
    getHomeData(),
    getTranslations('HomePage'),
  ])

  const HOW_IT_WORKS = [
    { Icon: Search, title: t('step1Title'), description: t('step1Desc') },
    { Icon: MessageSquare, title: t('step2Title'), description: t('step2Desc') },
    { Icon: Home, title: t('step3Title'), description: t('step3Desc') },
  ]

  const POPULAR_SEARCHES = [
    { label: t('chipMess'), href: '/listings?type=mess' },
    { label: t('chipBachelor'), href: '/listings?type=bachelor' },
    { label: t('chipSublet'), href: '/listings?type=sublet' },
    { label: t('chipFemaleOnly'), href: '/listings?gender=female' },
  ]

  return (
    <main className="overflow-hidden bg-[#f3f6f4] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative isolate overflow-hidden text-white">
        <Image
          src="/student-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/75 via-teal-950/40 via-40% to-transparent" />

        <div className="page-shell relative z-10 flex max-w-lg flex-col items-start pb-24 pt-16 text-left sm:pb-32 sm:pt-20 [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            {t('badge')}
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl sm:leading-[1.05]">
            {t('heroTitleLine1')}
            <br />
            <span className="text-emerald-100">{t('heroTitleLine2')}</span>
          </h1>

          <div className="mt-6 flex flex-wrap items-center justify-start gap-2.5">
            <span className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              {totalRooms} {t('trustRoomsListed')}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {t('trustVerifiedOwners')}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden />
              {t('trustDirectChat')}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t('trustFree')}
            </span>
          </div>

          <div className="mt-8 w-full max-w-md">
            <HeroSearch />
          </div>
        </div>

        <svg
          className="absolute inset-x-0 bottom-0 z-0 h-14 w-full text-[#f3f6f4] dark:text-slate-950 sm:h-20 md:h-24"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0,64 C240,100 480,100 720,64 C960,28 1200,28 1440,64 L1440,120 L0,120 Z" fill="currentColor" />
        </svg>
      </section>

      <section className="relative overflow-hidden bg-[#f3f6f4] py-20 text-slate-950 dark:bg-slate-950 dark:text-white md:py-28">
        <div className="page-shell relative">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500 dark:bg-teal-300" />
                {t('featuredSubtext')}
              </p>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.045em] text-slate-950 dark:text-white md:text-6xl">
                {t('featuredHeading')}
              </h2>
            </div>
            <Link
              href="/listings"
              className="group inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-teal-300/60 hover:bg-teal-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              {t('viewAll')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          <FeaturedRooms initialRooms={featuredRooms} />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#eef3f1] py-20 dark:border-slate-800 dark:bg-slate-900 md:py-28">
        <div className="page-shell">
          <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
                nexUni.living · {t('howItWorksHeading')}
              </p>
              <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white md:text-6xl">
                {t('howItWorksSubtext')}
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('howItWorksIntro')}
            </p>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="absolute left-[16.66%] right-[16.66%] top-8 hidden border-t border-dashed border-teal-700/30 lg:block" />
            {HOW_IT_WORKS.map((step, index) => (
              <article key={step.title} className="relative rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <div className="mb-10 flex items-center justify-between">
                  <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-8 border-[#eef3f1] bg-teal-600 text-white shadow-lg dark:border-slate-900">
                    <step.Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-4xl font-black tracking-[-0.08em] text-slate-100 dark:text-slate-800">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{step.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-teal-900 pt-16 text-slate-300 dark:border-slate-800">
        <div className="page-shell grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandWordmark inverse compact />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">{t('footerTagline')}</p>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-teal-400">{t('footerDiscoverHeading')}</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/listings" className="hover:text-white">{t('footerBrowseRooms')}</Link></li>
              <li><Link href="/roommates" className="hover:text-white">{t('footerRoommates')}</Link></li>
              <li><Link href="/books" className="hover:text-white">{t('footerBooks')}</Link></li>
              <li><Link href="/jobs" className="hover:text-white">{t('footerJobs')}</Link></li>
              <li><Link href="/transport" className="hover:text-white">{t('footerTransport')}</Link></li>
              <li><Link href="/services" className="hover:text-white">{t('footerServices')}</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-teal-400">{t('footerOwnersHeading')}</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/post-room" className="hover:text-white">{t('footerPostRoom')}</Link></li>
              <li><Link href="/auth/register" className="hover:text-white">{t('footerRegister')}</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">{t('footerDashboard')}</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-teal-400">{t('footerSupportHeading')}</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/terms" className="hover:text-white">{t('footerTerms')}</Link></li>
              <li><Link href="/privacy" className="hover:text-white">{t('footerPrivacy')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="page-shell flex flex-col items-center justify-between gap-4 py-6 text-xs text-slate-400 sm:flex-row">
            <p>{t('footerCopyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
