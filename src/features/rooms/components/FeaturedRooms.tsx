'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Home } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import FeaturedRoomCard from '@/features/rooms/components/FeaturedRoomCard'
import type { Room } from '@/features/rooms/types/room.types'

type Tab = 'all' | 'male' | 'female'

// The "all" tab is server-rendered (initialRooms) so rooms are visible on
// first paint; only the gender tabs fetch client-side, and results are kept
// per-tab so switching back is instant.
export default function FeaturedRooms({ initialRooms }: { initialRooms: Room[] }) {
  const t = useTranslations('FeaturedRooms')
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [roomsByTab, setRoomsByTab] = useState<Partial<Record<Tab, Room[]>>>({ all: initialRooms })

  useEffect(() => {
    if (activeTab === 'all' || roomsByTab[activeTab]) return

    let cancelled = false
    supabase
      .from('rooms')
      .select('*, profiles(full_name, phone, avatar_url)')
      .neq('status', 'closed')
      .eq('gender_type', activeTab)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (cancelled) return
        setRoomsByTab((prev) => ({ ...prev, [activeTab]: (data ?? []) as Room[] }))
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const rooms = roomsByTab[activeTab]

  return (
    <>
      {/* Tabs */}
      <div className="mb-7 inline-flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
        {[
          { key: 'all', label: t('all') },
          { key: 'male', label: t('male') },
          { key: 'female', label: t('female') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-teal-300 text-slate-950'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {rooms === undefined ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[26px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 h-48 rounded-2xl bg-white/10" />
              <div className="mb-2 h-4 w-3/4 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-slate-500">
            <Home className="h-7 w-7" />
          </div>
          <p className="text-sm text-slate-400">{t('empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {rooms.map((room) => (
            <FeaturedRoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </>
  )
}
