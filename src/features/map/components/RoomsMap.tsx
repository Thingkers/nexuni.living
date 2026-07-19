'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useTranslations } from 'next-intl'
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'

import '@/lib/leaflet/leaflet-icons'
import type { MapEntityKind } from '@/features/map/types'

export type MapMarkerRecord = {
  id: string
  title: string
  rent: number
  latitude: number | null
  longitude: number | null
  location_name: string | null
  is_approximate?: boolean
  href?: string
  kind?: MapEntityKind
  price_label?: string
  status_label?: string
}

type Props = {
  rooms: MapMarkerRecord[]
  className?: string
  frameClassName?: string
  focusQuery?: string
  nearbyControl?: boolean
}

type UserLocation = [number, number]
type LocationStatus = 'locating' | 'ready' | 'denied' | 'unsupported'

const DEFAULT_RADIUS_KM = 5

function distanceKm(from: UserLocation, to: UserLocation) {
  const earthRadiusKm = 6371
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(to[0] - from[0])
  const longitudeDelta = toRadians(to[1] - from[1])
  const startLatitude = toRadians(from[0])
  const endLatitude = toRadians(to[0])
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function normalize(value: string | null | undefined) {
  return (value ?? '').normalize('NFC').toLowerCase()
}

function roomMarkerIcon(room: MapMarkerRecord) {
  const fallbackLabel = room.kind === 'campus'
    ? 'Campus'
    : room.kind === 'area'
      ? 'Area'
      : room.kind === 'roommate'
        ? 'Match'
        : room.rent >= 1000
          ? `৳${Number((room.rent / 1000).toFixed(1))}k`
          : `৳${room.rent}`
  const label = room.price_label ?? fallbackLabel

  return L.divIcon({
    className: `room-price-marker map-kind-${room.kind ?? 'housing'}`,
    html: `<span>${label}</span>`,
    iconSize: [58, 34],
    iconAnchor: [29, 34],
    popupAnchor: [0, -34],
  })
}

function roomClusterIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount()
  return L.divIcon({
    className: 'room-cluster-marker',
    html: `<span>${count}<small>places</small></span>`,
    iconSize: [54, 54],
  })
}

function NearbyMapController({
  userLocation,
  radiusKm,
}: {
  userLocation: UserLocation | null
  radiusKm: number
}) {
  const map = useMap()

  useEffect(() => {
    if (!userLocation) return
    const bounds = L.latLng(userLocation).toBounds(radiusKm * 2000)
    map.fitBounds(bounds, {
      animate: true,
      duration: 0.8,
      padding: [48, 48],
      maxZoom: 15,
    })
  }, [map, radiusKm, userLocation])

  return null
}

function MapFlyController({
  rooms,
  focusQuery,
  markerRefs,
}: {
  rooms: MapMarkerRecord[]
  focusQuery?: string
  markerRefs: React.RefObject<Map<string, L.Marker>>
}) {
  const map = useMap()

  useEffect(() => {
    let fallbackTimer: number | undefined
    let activePopup: (() => void) | undefined

    function flyToQuery(rawQuery: string) {
      const query = normalize(rawQuery)
      if (!query) return

      const target = rooms.find((room) => {
        const location = normalize(room.location_name)
        return (
          normalize(room.title).includes(query) ||
          location.includes(query) ||
          Boolean(location && query.includes(location))
        )
      })
      if (!target?.latitude || !target.longitude) return

      if (activePopup) map.off('moveend', activePopup)
      if (fallbackTimer) window.clearTimeout(fallbackTimer)

      activePopup = () => markerRefs.current?.get(target.id)?.openPopup()
      map.once('moveend', activePopup)
      map.flyTo([target.latitude, target.longitude], 16, {
        animate: true,
        duration: 1.6,
      })
      fallbackTimer = window.setTimeout(activePopup, 1900)
    }

    function handleMapFocus(event: Event) {
      const query = (event as CustomEvent<{ query?: string }>).detail?.query
      if (query) flyToQuery(query)
    }

    window.addEventListener('nexuni:map-focus', handleMapFocus)
    if (focusQuery) flyToQuery(focusQuery)

    return () => {
      window.removeEventListener('nexuni:map-focus', handleMapFocus)
      if (fallbackTimer) window.clearTimeout(fallbackTimer)
      if (activePopup) map.off('moveend', activePopup)
    }
  }, [focusQuery, map, markerRefs, rooms])

  return null
}

export default function RoomsMap({
  rooms,
  className = 'h-[500px]',
  frameClassName = 'rounded-[22px]',
  focusQuery,
  nearbyControl = false,
}: Props) {
  const t = useTranslations('MapCommon')
  const markerRefs = useRef<Map<string, L.Marker>>(new Map())
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('locating')

  const validRooms = useMemo(
    () => rooms.filter((room) => room.latitude && room.longitude),
    [rooms],
  )

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported')
      return
    }

    setLocationStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude])
        setLocationStatus('ready')
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }, [])

  useEffect(() => {
    if (!nearbyControl) return
    if (!navigator.geolocation) {
      queueMicrotask(() => setLocationStatus('unsupported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude])
        setLocationStatus('ready')
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }, [nearbyControl])

  const displayedRooms = useMemo(() => {
    if (!nearbyControl || !userLocation) return validRooms
    return validRooms.filter((room) =>
      distanceKm(userLocation, [room.latitude!, room.longitude!]) <= radiusKm,
    )
  }, [nearbyControl, radiusKm, userLocation, validRooms])

  const center: [number, number] =
    validRooms.length > 0
      ? [
          validRooms[0].latitude!,
          validRooms[0].longitude!,
        ]
      : [23.8103, 90.4125]

  return (
    <div className={`${className} ${frameClassName} overflow-hidden bg-slate-100 dark:bg-slate-800`}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFlyController
          rooms={validRooms}
          focusQuery={focusQuery}
          markerRefs={markerRefs}
        />
        <NearbyMapController userLocation={userLocation} radiusKm={radiusKm} />

        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#0f766e',
                fillColor: '#2dd4bf',
                fillOpacity: 0.08,
                weight: 2,
              }}
            />
            <CircleMarker
              center={userLocation}
              radius={7}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#0f766e',
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>{t('currentLocation')}</Popup>
            </CircleMarker>
          </>
        )}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={54}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          iconCreateFunction={roomClusterIcon}
        >
          {displayedRooms.map((room) => (
            <Marker
              key={room.id}
              icon={roomMarkerIcon(room)}
              ref={(marker) => {
                if (marker) markerRefs.current.set(room.id, marker)
                else markerRefs.current.delete(room.id)
              }}
              position={[
                room.latitude!,
                room.longitude!,
              ]}
            >
              <Popup>
                <div className="min-w-[190px] p-1">
                  <p className="font-semibold leading-snug text-slate-950">
                    {room.title}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {room.location_name || t('locationMissing')}
                  </p>
                  {room.is_approximate && (
                    <p className="mt-1 text-[10px] font-medium text-amber-700">
                      {t('approximateLocation')}
                    </p>
                  )}

                  {(room.price_label || room.rent > 0) && (
                    <p className="mt-2 text-sm font-bold text-teal-700">
                      {room.price_label ?? `৳${room.rent.toLocaleString()}`}
                    </p>
                  )}
                  {room.status_label && (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {room.status_label}
                    </p>
                  )}

                  <Link
                    href={room.href ?? `/listings/${room.id}`}
                    className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    {t('viewDetails')} →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {nearbyControl && (
        <div className="absolute bottom-[76px] right-3 z-[500] w-[min(360px,calc(100%-1.5rem))] rounded-2xl border border-slate-200/80 bg-white/92 p-3 text-slate-800 shadow-2xl backdrop-blur-2xl sm:right-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold">
                {locationStatus === 'locating' && t('findingLocation')}
                {locationStatus === 'ready' && t('withinRadius', { count: displayedRooms.length, radius: radiusKm })}
                {locationStatus === 'denied' && t('permissionRequired')}
                {locationStatus === 'unsupported' && t('locationUnavailable')}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {locationStatus === 'ready'
                  ? t('radiusHelp')
                  : t('allPlacesHelp')}
              </p>
            </div>
            {locationStatus !== 'ready' && locationStatus !== 'locating' && (
              <button
                type="button"
                onClick={requestLocation}
                className="rounded-full bg-teal-700 px-3 py-1.5 text-[10px] font-bold text-white"
              >
                {t('enable')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-500">1 km</span>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={radiusKm}
              disabled={locationStatus !== 'ready'}
              onChange={(event) => setRadiusKm(Number(event.target.value))}
              aria-label={t('radiusLabel', { radius: radiusKm })}
              className="nearby-radius-slider min-w-0 flex-1"
            />
            <span className="min-w-12 rounded-full bg-teal-50 px-2 py-1 text-center text-[10px] font-bold text-teal-800">
              {radiusKm} km
            </span>
          </div>
        </div>
      )}
    </div>
  )
}