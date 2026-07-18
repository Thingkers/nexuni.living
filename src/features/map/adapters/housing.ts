import type { MapEntity } from '@/features/map/types'

export type HousingMapRecord = {
  id: string
  title: string
  rent: number
  latitude: number | null
  longitude: number | null
  location_name: string | null
  is_approximate?: boolean
}

export function housingToMapEntity(room: HousingMapRecord): MapEntity | null {
  if (room.latitude == null || room.longitude == null) return null
  return {
    id: room.id,
    kind: 'housing',
    title: room.title,
    latitude: room.latitude,
    longitude: room.longitude,
    href: `/listings/${room.id}`,
    locationLabel: room.location_name ?? undefined,
    priceLabel: `৳${room.rent.toLocaleString()}`,
    statusLabel: 'Available',
    isApproximate: room.is_approximate,
  }
}
