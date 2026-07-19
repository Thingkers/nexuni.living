import { Suspense } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'

import DiscoveryHero from '@/features/discovery/components/DiscoveryHero'
import StaticDiscoveryBrowser from '@/features/discovery/components/StaticDiscoveryBrowser'
import { getDiscoveryItems } from '@/features/discovery/data'
import { localizeDiscoveryItem } from '@/features/discovery/lib/localize'
import type { DiscoveryKind } from '@/features/discovery/types'

const COPY_KEYS = {
  book: {
    eyebrow: 'booksEyebrow',
    title: 'booksTitle',
    description: 'booksDescription',
  },
  service: {
    eyebrow: 'servicesEyebrow',
    title: 'servicesTitle',
    description: 'servicesDescription',
  },
  job: {
    eyebrow: 'jobsEyebrow',
    title: 'jobsTitle',
    description: 'jobsDescription',
  },
} as const

export default async function DiscoveryCatalogPage({ kind }: { kind: DiscoveryKind }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('Discovery')])
  const copy = COPY_KEYS[kind]
  const items = getDiscoveryItems(kind).map((item) => localizeDiscoveryItem(item, locale))

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#eef3f1] text-slate-950 dark:bg-slate-950 dark:text-white">
      <DiscoveryHero
        kind={kind}
        eyebrow={t(copy.eyebrow)}
        title={t(copy.title)}
        description={t(copy.description)}
        sampleNotice={t('sampleNotice')}
      />
      <Suspense fallback={<div className="page-shell py-20"><div className="h-80 animate-pulse rounded-[28px] bg-slate-200 dark:bg-slate-800" /></div>}>
        <StaticDiscoveryBrowser items={items} />
      </Suspense>
    </main>
  )
}
