'use client'

import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import '@/lib/leaflet/leaflet-icons'

type LocationPickerProps = {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
}

// ✅ Re-center map when latitude/longitude changes (e.g. after "Find on Map")
function SetCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
      map.setView([lat, lng], 16)
    }, 100)
  }, [map, lat, lng])
  return null
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const defaultPosition: [number, number] = [23.8103, 90.4125]
  const position: [number, number] =
    latitude && longitude ? [latitude, longitude] : defaultPosition

  return (
    <div>
      <div className="h-72 overflow-hidden rounded-2xl border border-gray-100">
        <MapContainer
          center={position}
          zoom={13}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler onChange={onChange} />

          {/* ✅ Re-center when Find on Map sets new coordinates */}
          {latitude && longitude && (
            <SetCenter lat={latitude} lng={longitude} />
          )}

          {latitude && longitude && (
            <Marker position={[latitude, longitude]} />
          )}
        </MapContainer>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Click on the map to select the room location.
      </p>
    </div>
  )
}
