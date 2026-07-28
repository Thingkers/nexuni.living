'use client'

import dynamic from 'next/dynamic'
import type { MapEntity } from '@/features/map/types'
import BrandedPreloader from '@/components/ui/BrandedPreloader'

const EntityMap = dynamic(() => import('@/features/map/components/EntityMap'), {
  ssr: false,
  loading: () => <BrandedPreloader fullScreen={false} label="Preparing the map…" />,
})

export default function EntityDetailMap({ entity }: { entity: MapEntity }) {
  return <EntityMap entities={[entity]} nearbyControl={false} />
}
