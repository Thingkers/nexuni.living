'use client'

import RoomsMap from '@/features/map/components/RoomsMap'
import type { MapEntity } from '@/features/map/types'

type EntityMapProps = {
  entities: MapEntity[]
  focusQuery?: string
  nearbyControl?: boolean
  className?: string
}

export default function EntityMap({
  entities,
  focusQuery,
  nearbyControl = true,
  className = 'h-full',
}: EntityMapProps) {
  return (
    <RoomsMap
      rooms={entities.map((entity) => ({
        id: entity.id,
        title: entity.title,
        rent: 0,
        latitude: entity.latitude,
        longitude: entity.longitude,
        location_name: entity.locationLabel ?? null,
        is_approximate: entity.isApproximate,
        href: entity.href,
        kind: entity.kind,
        price_label: entity.priceLabel,
        status_label: entity.statusLabel,
      }))}
      className={className}
      frameClassName="rounded-none"
      focusQuery={focusQuery}
      nearbyControl={nearbyControl}
    />
  )
}
