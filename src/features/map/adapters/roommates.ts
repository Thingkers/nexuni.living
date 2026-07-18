import type { MapEntity } from '@/features/map/types'

export type RoommateMapRecord = {
  id: string
  display_name: string | null
  budget_min: number | null
  budget_max: number | null
  locality_name: string | null
  locality_lat: number | null
  locality_lng: number | null
}

export function roommateToMapEntity(profile: RoommateMapRecord): MapEntity | null {
  if (profile.locality_lat == null || profile.locality_lng == null) return null
  const budget = profile.budget_min != null && profile.budget_max != null
    ? `৳${profile.budget_min.toLocaleString()}–৳${profile.budget_max.toLocaleString()}`
    : undefined

  return {
    id: profile.id,
    kind: 'roommate',
    title: profile.display_name || 'Student seeking a roommate',
    latitude: profile.locality_lat,
    longitude: profile.locality_lng,
    href: `/roommates/${profile.id}`,
    locationLabel: profile.locality_name ?? undefined,
    priceLabel: budget,
    statusLabel: 'Looking for a roommate',
    isApproximate: true,
  }
}
