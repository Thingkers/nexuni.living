import type { DiscoveryItem, LocalizedDiscoveryItem } from '@/features/discovery/types'

export function localizeDiscoveryItem(
  item: DiscoveryItem,
  locale: string,
): LocalizedDiscoveryItem {
  const language = locale === 'bn' ? 'bn' : 'en'
  return {
    ...item,
    title: item.title[language],
    summary: item.summary[language],
    description: item.description[language],
    tags: item.tags.map((tag) => tag[language]),
    categoryLabel: item.categoryLabel[language],
    priceLabel: item.priceLabel?.[language],
    attributes: item.attributes.map((attribute) => ({
      label: attribute.label[language],
      value: attribute.value[language],
    })),
    area: item.location.area[language],
    campus: item.location.campus[language],
    searchText: [
      item.title.en,
      item.title.bn,
      item.summary.en,
      item.summary.bn,
      item.location.area.en,
      item.location.area.bn,
      item.location.campus.en,
      item.location.campus.bn,
      ...item.tags.flatMap((tag) => [tag.en, tag.bn]),
    ].join(' ').toLowerCase(),
  }
}
