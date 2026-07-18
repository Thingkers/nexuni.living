import type { MapEntity } from '@/features/map/types'

type GeographyRecord = {
  id: string
  name: string
  slug: string
  lat: number | null
  lng: number | null
}

export function campusToMapEntity(campus: GeographyRecord): MapEntity | null {
  if (campus.lat == null || campus.lng == null) return null
  return {
    id: campus.id,
    kind: 'campus',
    title: campus.name,
    latitude: campus.lat,
    longitude: campus.lng,
    href: `/universities/${campus.slug}`,
    statusLabel: 'University campus',
  }
}

export function areaToMapEntity(area: GeographyRecord): MapEntity | null {
  if (area.lat == null || area.lng == null) return null
  return {
    id: area.id,
    kind: 'area',
    title: area.name,
    latitude: area.lat,
    longitude: area.lng,
    href: `/areas/${area.slug}`,
    statusLabel: 'Student area',
  }
}
