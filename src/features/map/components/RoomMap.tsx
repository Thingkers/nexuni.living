'use client'

import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect, useState } from 'react'

import '@/lib/leaflet/leaflet-icons'

type RoomMapProps = {
  latitude: number
  longitude: number
  title?: string
  locationName?: string | null
}

// ── Force map to re-center on room location ──────────────────────────────────
function SetCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
      map.setView([lat, lng], 16)
    }, 300)
  }, [map, lat, lng])
  return null
}

// ── Haversine distance ────────────────────────────────────────────────────────
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Click handler ─────────────────────────────────────────────────────────────
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

// ── Distance Panel ────────────────────────────────────────────────────────────
function DistancePanel({ roomLat, roomLng }: { roomLat: number; roomLng: number }) {
  const [locationInput, setLocationInput] = useState('')
  const [searching, setSearching]         = useState(false)
  const [searchError, setSearchError]     = useState<string | null>(null)
  const [userLat, setUserLat]             = useState<number | null>(null)
  const [userLng, setUserLng]             = useState<number | null>(null)
  const [userLabel, setUserLabel]         = useState<string | null>(null)
  const [showPickMap, setShowPickMap]     = useState(false)
  const [done, setDone]                   = useState(false)

  // Geocode location name using Nominatim
  async function searchLocation() {
    const q = locationInput.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Dhaka, Bangladesh')}&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = await res.json()

      if (!data.length) {
        setSearchError('এই জায়গা খুঁজে পাওয়া যায়নি। আরও নির্দিষ্ট করে লিখুন।')
        setSearching(false)
        return
      }

      setUserLat(Number(data[0].lat))
      setUserLng(Number(data[0].lon))
      setUserLabel(data[0].display_name.split(',').slice(0, 2).join(', '))
      setDone(true)
    } catch {
      setSearchError('Search failed. Internet connection চেক করুন।')
    } finally {
      setSearching(false)
    }
  }

  function useGPS() {
    if (!navigator.geolocation) {
      setSearchError('Browser location support করে না।')
      return
    }
    setSearching(true)
    setSearchError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setUserLabel('আপনার বর্তমান অবস্থান')
        setDone(true)
        setSearching(false)
      },
      () => {
        setSearchError('GPS permission দিন।')
        setSearching(false)
      },
    )
  }

  function reset() {
    setDone(false)
    setUserLat(null)
    setUserLng(null)
    setUserLabel(null)
    setLocationInput('')
    setSearchError(null)
    setShowPickMap(false)
  }

  const distance =
    userLat !== null && userLng !== null
      ? getDistanceKm(userLat, userLng, roomLat, roomLng)
      : null

  const walkMin     = distance !== null ? Math.round((distance / 5) * 60)  : null
  const rickshawMin = distance !== null ? Math.round((distance / 15) * 60) : null

  return (
    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-gray-700">📏 দূরত্ব হিসাব করুন</p>

      {!done ? (
        <>
          {/* Text search */}
          <div className="mb-3 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
              placeholder="যেমন: AIUB, Uttara Sector 7, Dhanmondi…"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
            />
            <button
              onClick={searchLocation}
              disabled={searching || !locationInput.trim()}
              className="rounded-xl bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {searching ? '…' : 'খুঁজুন'}
            </button>
          </div>

          {/* GPS + Map pick */}
          <div className="flex gap-2">
            <button
              onClick={useGPS}
              disabled={searching}
              className="flex-1 rounded-xl bg-gray-50 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              📍 GPS ব্যবহার করুন
            </button>
            <button
              onClick={() => setShowPickMap((p) => !p)}
              className="flex-1 rounded-xl bg-gray-50 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              🗺️ Map এ click করুন
            </button>
          </div>

          {/* Inline pick map */}
          {showPickMap && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-yellow-600 bg-yellow-50 rounded-lg px-3 py-2">
                👆 Map এ আপনার অবস্থানে click করুন
              </p>
              <div className="h-48 overflow-hidden rounded-xl border border-gray-200">

                <MapContainer
                  key={`pick-${roomLat}-${roomLng}`}
                  center={[roomLat, roomLng]}
                  zoom={16}
                  scrollWheelZoom={false}
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler
                    onPick={(lat, lng) => {
                      setUserLat(lat)
                      setUserLng(lng)
                      setUserLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
                      setDone(true)
                      setShowPickMap(false)
                    }}
                  />
                </MapContainer>
              </div>
            </div>
          )}

          {searchError && (
            <p className="mt-2 text-xs text-red-500">{searchError}</p>
          )}
        </>
      ) : (
        <>
          {userLabel && (
            <p className="mb-3 text-xs text-gray-500">
              📍 <span className="font-medium">{userLabel}</span> থেকে হিসাব
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-lg font-bold text-gray-900">
                {distance! < 1
                  ? `${Math.round(distance! * 1000)} m`
                  : `${distance!.toFixed(1)} km`}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">দূরত্ব</p>
            </div>
            <div className="rounded-xl bg-teal-50 p-3">
              <p className="text-lg font-bold text-teal-700">
                {walkMin === 0 ? '<1' : walkMin} মিনিট
              </p>
              <p className="mt-0.5 text-xs text-teal-400">🚶 হেঁটে</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-lg font-bold text-green-700">
                {rickshawMin === 0 ? '<1' : rickshawMin} মিনিট
              </p>
              <p className="mt-0.5 text-xs text-green-400">🛺 রিকশায়</p>
            </div>
          </div>

          <button onClick={reset} className="mt-3 text-xs text-gray-400 hover:text-gray-600">
            আবার হিসাব করুন
          </button>
        </>
      )}
    </div>
  )
}

// ── Main RoomMap ────────────────────────────────────────────────────────────
export default function RoomMap({
  latitude,
  longitude,
  title = 'Room Location',
  locationName,
}: RoomMapProps) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  const position: [number, number] = [lat, lng]

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-gray-100">
        <p className="block sm:hidden text-xs text-center text-gray-400 py-1 bg-gray-50">
          দুই আঙুল দিয়ে map scroll করুন
        </p>

        <div className="h-64 sm:h-72">
          <MapContainer
            center={position}
            zoom={16}
            scrollWheelZoom={false}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            className="h-full w-full z-0"
          >
            {/* ✅ Force center to exact room coordinates */}
            <SetCenter lat={lat} lng={lng} />

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
      </div>

      {/* Distance Panel */}
      <DistancePanel roomLat={lat} roomLng={lng} />
    </div>
  )
}
