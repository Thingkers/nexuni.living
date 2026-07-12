'use client'

import { useTranslations } from 'next-intl'
import { GraduationCap } from 'lucide-react'
import { useUniversities } from '@/features/universities/hooks/useUniversities'
import { getDistanceKm } from '@/features/map/lib/haversine'

type NearestUniversityBadgeProps = {
  latitude: number | null
  longitude: number | null
  nearestUniversityIds?: string[]
  className?: string
}

// Distance is intentionally computed live here, not read from a stored
// column — both rooms and universities carry lat/lng, so it's always
// recomputed from current coordinates rather than risking a persisted value
// going stale.
export function NearestUniversityBadge({
  latitude,
  longitude,
  nearestUniversityIds,
  className,
}: NearestUniversityBadgeProps) {
  const t = useTranslations('NearestUniversityBadge')
  const { universities } = useUniversities()

  if (latitude == null || longitude == null || !nearestUniversityIds?.length) return null

  // nearest_university_ids is already nearest-first, but fall through to the
  // next id if the closest one has since been deactivated (and so isn't in
  // the fetched active-only list) or is missing lat/lng.
  const nearest = nearestUniversityIds
    .map((id) => universities.find((u) => u.id === id))
    .find((u) => u?.lat != null && u?.lng != null)

  if (!nearest || nearest.lat == null || nearest.lng == null) return null

  const distanceKm = getDistanceKm(latitude, longitude, nearest.lat, nearest.lng)

  return (
    <span
      className={
        className ??
        'flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
      }
    >
      <GraduationCap className="h-3 w-3 shrink-0" />
      {t('kmFrom', { distance: distanceKm.toFixed(1), name: nearest.name })}
    </span>
  )
}
