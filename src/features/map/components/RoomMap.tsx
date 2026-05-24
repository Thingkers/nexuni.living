'use client'

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

import '@/lib/leaflet/leaflet-icons'

type RoomMapProps = {
  latitude: number
  longitude: number
  title?: string
  locationName?: string | null
}

export default function RoomMap({
  latitude,
  longitude,
  title = 'Room Location',
  locationName,
}: RoomMapProps) {
  return (
    <div className="h-72 overflow-hidden rounded-2xl border border-gray-100">

      <MapContainer
      center={[latitude, longitude]}
      zoom={17}
      scrollWheelZoom={true}
      className="h-full w-full z-0"
    >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[latitude, longitude]}>
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