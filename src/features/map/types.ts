export type MapEntityKind =
  | 'housing'
  | 'roommate'
  | 'campus'
  | 'area'
  | 'book'
  | 'service'
  | 'job'
  | 'transport'

export type MapEntity = {
  id: string
  kind: MapEntityKind
  title: string
  latitude: number
  longitude: number
  href: string
  locationLabel?: string
  priceLabel?: string
  statusLabel?: string
  isApproximate?: boolean
}
