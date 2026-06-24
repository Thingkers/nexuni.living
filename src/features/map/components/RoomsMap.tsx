'use client'

import Link from 'next/link'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from 'react-leaflet'

import '@/lib/leaflet/leaflet-icons'

type Room = {
  id: string
  title: string
  rent: number
  latitude: number | null
  longitude: number | null
  location_name: string | null
}

type Props = {
  rooms: Room[]
}

export default function RoomsMap({ rooms }: Props) {
  const validRooms = rooms.filter(
    (room) =>
      room.latitude &&
      room.longitude,
  )

  const center: [number, number] =
    validRooms.length > 0
      ? [
          validRooms[0].latitude!,
          validRooms[0].longitude!,
        ]
      : [23.8103, 90.4125]

  return (
    <div className="h-[500px] overflow-hidden rounded-2xl border border-gray-100">
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

        {validRooms.map((room) => (
          <Marker
            key={room.id}
            position={[
              room.latitude!,
              room.longitude!,
            ]}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold text-gray-900">
                  {room.title}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  📍 {room.location_name}
                </p>

                <p className="mt-1 text-sm font-medium text-green-600">
                  ৳{room.rent.toLocaleString()}
                </p>

                <Link
                  href={`/listings/${room.id}`}
                  className="mt-3 inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  View Details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}