'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'

import MapLayerSwitcher, { type HubLayer } from '@/features/map/components/MapLayerSwitcher'
import MapResultsSheet from '@/features/map/components/MapResultsSheet'
import type { MapEntity } from '@/features/map/types'
import { roommateToMapEntity } from '@/features/map/adapters/roommates'
import { supabase } from '@/lib/supabase'
import BrandedPreloader from '@/components/ui/BrandedPreloader'

const EntityMap = dynamic(() => import('@/features/map/components/EntityMap'), {
  ssr: false,
  loading: () => <BrandedPreloader fullScreen={false} label="Preparing the map…" />,
})

export default function MapHubShell({ entities }: { entities: MapEntity[] }) {
  const t = useTranslations('MapHub')
  const [allEntities, setAllEntities] = useState(entities)
  const [activeLayer, setActiveLayer] = useState<HubLayer>('housing')
  const [focusQuery, setFocusQuery] = useState('')

  useEffect(() => {
    let active = true

    async function loadRoommates() {
      const { data } = await supabase
        .from('roommate_profiles')
        .select('id, budget_min, budget_max, profiles(full_name), localities(name, lat, lng)')
        .eq('status', 'active')
        .limit(60)

      if (!active || !data) return
      const roommateEntities = data.flatMap((row) => {
        const profile = row.profiles as unknown as { full_name: string | null } | null
        const locality = row.localities as unknown as {
          name: string
          lat: number | null
          lng: number | null
        } | null
        const entity = roommateToMapEntity({
          id: row.id,
          display_name: profile?.full_name ?? null,
          budget_min: row.budget_min,
          budget_max: row.budget_max,
          locality_name: locality?.name ?? null,
          locality_lat: locality?.lat ?? null,
          locality_lng: locality?.lng ?? null,
        })
        return entity ? [entity] : []
      })
      setAllEntities([...entities, ...roommateEntities])
    }

    void loadRoommates()
    return () => {
      active = false
    }
  }, [entities])

  useEffect(() => {
    function handleMapFocus(event: Event) {
      const query = (event as CustomEvent<{ query?: string }>).detail?.query?.trim()
      if (query) setFocusQuery(query)
    }
    window.addEventListener('nexuni:map-focus', handleMapFocus)
    return () => window.removeEventListener('nexuni:map-focus', handleMapFocus)
  }, [])

  const layerEntities = useMemo(() => {
    if (activeLayer === 'housing') return allEntities.filter((entity) => entity.kind === 'housing')
    if (activeLayer === 'roommates') return allEntities.filter((entity) => entity.kind === 'roommate')
    if (activeLayer === 'campuses') {
      return allEntities.filter((entity) => entity.kind === 'campus' || entity.kind === 'area')
    }
    if (activeLayer === 'books') return allEntities.filter((entity) => entity.kind === 'book')
    if (activeLayer === 'services') return allEntities.filter((entity) => entity.kind === 'service')
    if (activeLayer === 'jobs') return allEntities.filter((entity) => entity.kind === 'job')
    return []
  }, [activeLayer, allEntities])

  const counts = useMemo(() => ({
    housing: allEntities.filter((entity) => entity.kind === 'housing').length,
    roommates: allEntities.filter((entity) => entity.kind === 'roommate').length,
    campuses: allEntities.filter((entity) => entity.kind === 'campus' || entity.kind === 'area').length,
    books: allEntities.filter((entity) => entity.kind === 'book').length,
    services: allEntities.filter((entity) => entity.kind === 'service').length,
    jobs: allEntities.filter((entity) => entity.kind === 'job').length,
  }), [allEntities])

  function focusEntity(entity: MapEntity) {
    setFocusQuery(entity.title)
    window.dispatchEvent(new CustomEvent('nexuni:map-focus', {
      detail: { query: entity.title },
    }))
  }

  return (
    <>
      <EntityMap
        entities={layerEntities}
        focusQuery={focusQuery}
        nearbyControl={activeLayer === 'housing'}
      />

      <div className="absolute left-1/2 top-[15px] z-[520] hidden -translate-x-1/2 md:block">
        <MapLayerSwitcher active={activeLayer} counts={counts} onChange={setActiveLayer} />
      </div>
      <div className="absolute inset-x-3 top-[78px] z-[520] md:hidden">
        <MapLayerSwitcher active={activeLayer} counts={counts} onChange={setActiveLayer} />
      </div>

      <MapResultsSheet
        entities={layerEntities}
        previewLabel={
          activeLayer === 'books' || activeLayer === 'services' || activeLayer === 'jobs'
            ? t(`${activeLayer}Preview`)
            : undefined
        }
        onFocus={focusEntity}
      />
    </>
  )
}
