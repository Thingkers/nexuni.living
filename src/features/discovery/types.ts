export type DiscoveryKind = 'book' | 'service' | 'job'
export type LocalizedText = { en: string; bn: string }

export type DiscoveryLocation = {
  areaSlug: string
  area: LocalizedText
  campus: LocalizedText
  latitude: number
  longitude: number
  approximate?: boolean
}

export type DiscoveryItem = {
  id: string
  slug: string
  kind: DiscoveryKind
  title: LocalizedText
  summary: LocalizedText
  description: LocalizedText
  location: DiscoveryLocation
  tags: LocalizedText[]
  category: string
  categoryLabel: LocalizedText
  featured?: boolean
  priceBdt?: number
  priceLabel?: LocalizedText
  attributes: Array<{ label: LocalizedText; value: LocalizedText }>
}

export type LocalizedDiscoveryItem = Omit<
  DiscoveryItem,
  'title' | 'summary' | 'description' | 'tags' | 'categoryLabel' | 'priceLabel' | 'attributes'
> & {
  title: string
  summary: string
  description: string
  tags: string[]
  categoryLabel: string
  priceLabel?: string
  attributes: Array<{ label: string; value: string }>
  area: string
  campus: string
  searchText: string
}
