'use client'

import Link from 'next/link'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { MapEntity } from '@/features/map/types'

export default function MapResultsSheet({
  entities,
  previewLabel,
  onFocus,
}: {
  entities: MapEntity[]
  previewLabel?: string
  onFocus: (entity: MapEntity) => void
}) {
  const t = useTranslations('MapHub')

  if (previewLabel) {
    return (
      <aside className="absolute right-3 top-32 z-[480] w-[min(360px,calc(100%-1.5rem))] rounded-2xl border border-white/20 bg-[#091b19]/92 p-4 text-white shadow-2xl backdrop-blur-2xl md:right-5 md:top-24">
        <p className="text-xs font-bold">{previewLabel}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-300">
          {t('previewNotice')}
        </p>
      </aside>
    )
  }

  return (
    <aside className="absolute right-5 top-24 z-[480] hidden max-h-[46vh] w-80 overflow-y-auto rounded-2xl border border-white/20 bg-[#091b19]/92 p-2 text-white shadow-2xl backdrop-blur-2xl lg:block">
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
          {t('results')}
        </p>
        <span className="text-[10px] text-teal-300">{t('visible', { count: entities.length })}</span>
      </div>
      <div className="space-y-1">
        {entities.length === 0 && (
          <p className="rounded-xl bg-white/5 px-3 py-4 text-[10px] leading-4 text-slate-400">
            {t('empty')}
          </p>
        )}
        {entities.slice(0, 12).map((entity) => (
          <div
            key={`${entity.kind}-${entity.id}`}
            className="group flex w-full items-start gap-2 rounded-xl p-1 text-left transition hover:bg-white/10"
          >
            <button
              type="button"
              onClick={() => onFocus(entity)}
              className="flex min-w-0 flex-1 items-start gap-2 p-1.5 text-left"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{entity.title}</span>
                <span className="mt-0.5 block truncate text-[9px] text-slate-400">
                  {entity.locationLabel || entity.statusLabel}
                </span>
              </span>
            </button>
            <Link
              href={entity.href}
              aria-label={`Open ${entity.title}`}
              className="mt-1 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </aside>
  )
}
