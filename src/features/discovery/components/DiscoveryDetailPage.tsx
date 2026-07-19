import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'

import DiscoveryDetail from '@/features/discovery/components/DiscoveryDetail'
import { getDiscoveryItem } from '@/features/discovery/data'
import { localizeDiscoveryItem } from '@/features/discovery/lib/localize'
import type { DiscoveryKind } from '@/features/discovery/types'

export default async function DiscoveryDetailPage({
  kind,
  slug,
}: {
  kind: DiscoveryKind
  slug: string
}) {
  const source = getDiscoveryItem(kind, slug)
  if (!source) notFound()

  const [locale, t] = await Promise.all([getLocale(), getTranslations('Discovery')])
  const item = localizeDiscoveryItem(source, locale)

  return (
    <DiscoveryDetail
      item={item}
      backLabel={t(kind === 'book' ? 'backBooks' : kind === 'service' ? 'backServices' : 'backJobs')}
      sampleNotice={t('sampleNotice')}
      detailsLabel={t('details')}
      samplePreviewLabel={t('samplePreview')}
    />
  )
}
