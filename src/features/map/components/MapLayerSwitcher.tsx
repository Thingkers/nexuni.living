'use client'

import { BookOpen, BriefcaseBusiness, Building2, Home, MapPinned, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

export type HubLayer = 'housing' | 'roommates' | 'campuses' | 'books' | 'services' | 'jobs'

const LAYERS = [
  { key: 'housing', Icon: Home, preview: false, counter: 'bg-teal-500 text-white' },
  { key: 'roommates', Icon: Users, preview: false, counter: 'bg-violet-500 text-white' },
  { key: 'campuses', Icon: Building2, preview: false, counter: 'bg-blue-500 text-white' },
  { key: 'books', Icon: BookOpen, preview: true, counter: 'bg-orange-500 text-white' },
  { key: 'services', Icon: MapPinned, preview: true, counter: 'bg-cyan-500 text-white' },
  { key: 'jobs', Icon: BriefcaseBusiness, preview: true, counter: 'bg-indigo-500 text-white' },
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
    <div className="flex max-w-[calc(100vw-2rem)] items-center gap-1.5 overflow-x-auto rounded-[18px] border border-white/15 bg-[#061512]/80 p-1.5 shadow-[inset_0_3px_8px_rgba(0,0,0,.45),0_12px_28px_rgba(0,0,0,.3)] backdrop-blur-xl">
      {LAYERS.map(({ key, Icon, preview, counter }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold transition-all active:translate-y-px ${
            active === key
              ? 'border-white/80 bg-linear-to-b from-white to-slate-200 text-slate-950 shadow-[0_5px_10px_rgba(0,0,0,.35),inset_0_1px_0_white]'
              : 'border-white/5 bg-white/[0.04] text-slate-300 shadow-[inset_0_-2px_3px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.08)] hover:-translate-y-0.5 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {t(key)}
          <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-black shadow-[0_2px_5px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.35)] ${counter}`}>
            {counts[key] ?? 0}
          </span>
          {preview && (
            <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[8px] uppercase">
              {t('preview')}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
