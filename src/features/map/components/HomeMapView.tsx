'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

const RoomsMap = dynamic(() => import('./RoomsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full animate-pulse bg-slate-200 dark:bg-slate-800" />
  ),
})

type MapRoom = {
  id: string
  title: string
  rent: number
  latitude: number | null
  longitude: number | null
  location_name: string | null
  is_approximate?: boolean
}

export default function HomeMapView({ rooms }: { rooms: MapRoom[] }) {
  const t = useTranslations('HomePage')
  const [focusQuery, setFocusQuery] = useState('')

  useEffect(() => {
    function handleMapFocus(event: Event) {
      const query = (event as CustomEvent<{ query?: string }>).detail?.query?.trim()
      if (query) setFocusQuery(query)
    }

    window.addEventListener('nexuni:map-focus', handleMapFocus)
    return () => window.removeEventListener('nexuni:map-focus', handleMapFocus)
  }, [])

  return (
    <div className="home-map-shell absolute inset-0">
      <RoomsMap
        rooms={rooms}
        className="h-full"
        frameClassName="rounded-none"
        focusQuery={focusQuery}
        nearbyControl
      />

      <div className="absolute right-4 top-24 z-[450] hidden items-center gap-3 rounded-2xl border border-white/20 bg-[#091b19]/85 px-3 py-2.5 text-white shadow-2xl backdrop-blur-2xl sm:flex md:right-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-300 text-slate-950">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-semibold">{t('mapLabel')}</p>
          <p className="text-[9px] text-slate-300">{t('mapLive')}</p>
        </div>
        <Link
          href="/listings"
          className="pointer-events-auto ml-2 flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold transition hover:bg-white/10"
        >
          {t('mapExplore')}
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
