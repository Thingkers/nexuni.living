'use client'

import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useEffect } from 'react'

import '@/lib/leaflet/leaflet-icons'

type RoomMapProps = {
  latitude: number
  longitude: number
  title?: string
  locationName?: string | null
}

function ResizeMap() {
  const map = useMap()

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
    }, 200)
  }, [map])

  return null
}

export default function RoomMap({
  latitude,
  longitude,
  title = 'Room Location',
  locationName,
}: RoomMapProps) {
  const position: [number, number] = [latitude, longitude]

  return (
    <div className="h-72 overflow-hidden rounded-2xl border border-gray-100">
      <MapContainer
        key={`${latitude}-${longitude}`}
        center={position}
        zoom={16}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <ResizeMap />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position}>
          <Popup>
            <div>
              <p className="font-medium">{title}</p>
              {locationName && (
                <p className="text-sm text-gray-500">{locationName}</p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}