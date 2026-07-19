import Link from 'next/link'
import { ArrowLeft, CheckCircle2, MapPin } from 'lucide-react'

import DiscoveryDetailMap from '@/features/discovery/components/DiscoveryDetailMap'
import type { LocalizedDiscoveryItem } from '@/features/discovery/types'

export default function DiscoveryDetail({
  item,
  backLabel,
  sampleNotice,
  detailsLabel,
  samplePreviewLabel,
}: {
  item: LocalizedDiscoveryItem
  backLabel: string
  sampleNotice: string
  detailsLabel: string
  samplePreviewLabel: string
}) {
  const basePath = item.kind === 'book' ? 'books' : item.kind === 'service' ? 'services' : 'jobs'
  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#eef3f1] py-8 dark:bg-slate-950">
      <div className="page-shell">
        <Link href={`/${basePath}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-700 dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,.75fr)]">
          <article className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                {item.categoryLabel}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                {samplePreviewLabel}
              </span>
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-slate-950 dark:text-white md:text-6xl">
              {item.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-500 dark:text-slate-300">{item.summary}</p>
            {item.priceLabel && <p className="mt-7 text-2xl font-bold text-teal-700 dark:text-teal-300">{item.priceLabel}</p>}

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {item.attributes.map((attribute) => (
                <div key={attribute.label} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{attribute.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{attribute.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{detailsLabel}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <aside className="space-y-6">
            <div className="h-[420px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DiscoveryDetailMap entity={{
                id: item.id,
                kind: item.kind,
                title: item.title,
                latitude: item.location.latitude,
                longitude: item.location.longitude,
                href: `/${basePath}/${item.slug}`,
                locationLabel: `${item.area} · ${item.campus}`,
                priceLabel: item.priceLabel,
                statusLabel: item.categoryLabel,
                isApproximate: true,
              }} />
            </div>
            <div className="rounded-[28px] bg-[#071c19] p-6 text-white">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-300">
                <MapPin className="h-4 w-4" />
                {item.area}
              </p>
              <p className="mt-3 text-lg font-semibold">{item.campus}</p>
              <p className="mt-4 text-xs leading-5 text-slate-400">{sampleNotice}</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
