'use client'

import { BookOpen, BriefcaseBusiness, Building2, Home, MapPinned, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

export type HubLayer = 'housing' | 'roommates' | 'campuses' | 'books' | 'services' | 'jobs'

const LAYERS = [
  { key: 'housing', Icon: Home, available: true },
  { key: 'roommates', Icon: Users, available: true },
  { key: 'campuses', Icon: Building2, available: true },
  { key: 'books', Icon: BookOpen, available: false },
  { key: 'services', Icon: MapPinned, available: false },
  { key: 'jobs', Icon: BriefcaseBusiness, available: false },
] as const

export default function MapLayerSwitcher({
  active,
  counts,
  onChange,
}: {
  active: HubLayer
  counts: Partial<Record<HubLayer, number>>
  onChange: (layer: HubLayer) => void
}) {
  const t = useTranslations('MapHub')

  return (
    <div className="flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/15 p-1">
      {LAYERS.map(({ key, Icon, available }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-semibold transition ${
            active === key
              ? 'bg-white text-slate-950'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {t(key)}
          {available ? (
            <span className="rounded-full bg-slate-950/10 px-1.5 py-0.5 text-[9px]">
              {counts[key] ?? 0}
            </span>
          ) : (
            <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[8px] uppercase">
              {t('soon')}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
