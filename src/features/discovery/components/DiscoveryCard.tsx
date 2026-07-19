'use client'

import Link from 'next/link'
import { ArrowUpRight, BookOpen, BriefcaseBusiness, MapPin, Store } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { LocalizedDiscoveryItem } from '@/features/discovery/types'

const ICONS = {
  book: BookOpen,
  service: Store,
  job: BriefcaseBusiness,
}

export default function DiscoveryCard({ item }: { item: LocalizedDiscoveryItem }) {
  const t = useTranslations('Discovery')
  const Icon = ICONS[item.kind]
  return (
    <Link
      href={`/${item.kind === 'book' ? 'books' : item.kind === 'service' ? 'services' : 'jobs'}/${item.slug}`}
      className="group flex min-h-72 flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071c19] text-teal-300">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {item.featured && (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[9px] font-bold uppercase text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              {t('featured')}
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {t('sample')}
          </span>
        </div>
      </div>

      <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
        {item.categoryLabel}
      </p>
      <h2 className="mt-2 text-xl font-semibold leading-7 tracking-[-0.035em] text-slate-950 group-hover:text-teal-800 dark:text-white dark:group-hover:text-teal-300">
        {item.title}
      </h2>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {item.summary}
      </p>

      <div className="mt-auto pt-6">
        {item.priceLabel && <p className="mb-3 text-sm font-bold text-teal-700 dark:text-teal-300">{item.priceLabel}</p>}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-600" />
          <span className="min-w-0 flex-1 truncate">{item.area} · {item.campus}</span>
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  )
}
