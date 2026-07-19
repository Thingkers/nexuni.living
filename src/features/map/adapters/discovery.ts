import type { DiscoveryItem } from '@/features/discovery/types'
import type { MapEntity } from '@/features/map/types'

export function discoveryToMapEntity(item: DiscoveryItem, locale: string): MapEntity {
  const language = locale === 'bn' ? 'bn' : 'en'
  const basePath = item.kind === 'book' ? 'books' : item.kind === 'service' ? 'services' : 'jobs'
  return {
    id: item.id,
    kind: item.kind,
    title: item.title[language],
    latitude: item.location.latitude,
    longitude: item.location.longitude,
    href: `/${basePath}/${item.slug}`,
    locationLabel: `${item.location.area[language]} · ${item.location.campus[language]}`,
    priceLabel: item.priceLabel?.[language],
    statusLabel: item.categoryLabel[language],
    isApproximate: item.location.approximate,
  }
}
