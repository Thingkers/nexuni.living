import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSaved } from '@/hooks/useSaved'
import type { Room } from '@/features/rooms/types/room.types'
import { getAvailabilityStatus } from '@/lib/getAvailabilityStatus'

const STATUS_CONFIG = {
  open: { label: 'Open', bg: 'bg-green-50', text: 'text-green-700' },
  partial: { label: 'Partially Available', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  booked: { label: 'Booked', bg: 'bg-red-50', text: 'text-red-700' },
  closed: { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-600' },
} as const

const AMENITIES = [
  { key: 'wifi', icon: '📶', label: 'WiFi' },
  { key: 'gas', icon: '🔥', label: 'Gas' },
  { key: 'electricity', icon: '💡', label: 'Electricity' },
] as const

export default function RoomCard({ room }: { room: Room }) {
  const status = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.open
  const isBooked = room.status === 'booked' || room.status === 'closed'
  const { isSaved, toggleSaved } = useSaved(room.id)

  const [activeImage, setActiveImage] = useState(0)
  const images = room.images ?? []
  const hasImages = images.length > 0

  const availability = getAvailabilityStatus({
    availableSeats: room.available_seats,
    totalSeats: room.total_seats,
  })

  function nextImage(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    setActiveImage((prev) => (prev + 1) % images.length)
  }

  function prevImage(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    setActiveImage((prev) => (prev - 1 + images.length) % images.length)
  }

  const availableDate = room.available_from
    ? new Date(room.available_from).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null

  const isAvailableNow = room.available_from
    ? new Date(room.available_from) <= new Date()
    : false

  const initials =
    room.profiles?.full_name
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U'

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:border-gray-300 hover:shadow-sm ${
        isBooked ? 'opacity-60' : ''
      }`}
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gray-50">
        {hasImages ? (
          <Image src={images[activeImage]} alt={room.title} fill className="object-cover" />
        ) : (
          <span className="text-4xl">🏠</span>
        )}

        {/* Status badge */}
        <span className={`absolute left-2 top-2 z-10 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>

        {/* Gender badge */}
        <span className="absolute right-2 top-2 z-10 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
          {room.gender_type === 'male' ? 'Male' : room.gender_type === 'female' ? 'Female' : 'Any'}
        </span>

        {/* Save button */}
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            toggleSaved()
          }}
          className="absolute bottom-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base shadow-sm hover:bg-white"
        >
          {isSaved ? '❤️' : '🤍'}
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow hover:bg-white"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow hover:bg-white"
            >
              ›
            </button>

            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setActiveImage(index)
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    activeImage === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4">
        <Link href={`/listings/${room.id}`}>
          <h3 className="mb-1 line-clamp-1 font-medium text-gray-900 hover:text-blue-600">
            {room.title}
          </h3>
        </Link>

        <p className="mb-3 text-xs text-gray-400">
          📍 {room.location_name || 'Location not added'} ·{' '}
          {room.type === 'mess' ? 'Mess' : room.type === 'bachelor' ? 'Bachelor' : 'Sublet'}
        </p>

        <p className="text-lg font-semibold text-blue-600">
          ৳{room.rent.toLocaleString('en-US')}
          <span className="text-xs font-normal text-gray-400"> /month</span>
        </p>

        <div className="mt-1 flex items-center gap-2">
          <p className="text-xs text-gray-500">
            {room.available_seats} of {room.total_seats} seats available
          </p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${availability.color}`}>
            {availability.emoji} {availability.label}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {AMENITIES.filter((amenity) => room[amenity.key]).map((amenity) => (
            <span key={amenity.key} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {amenity.icon} {amenity.label}
            </span>
          ))}
        </div>

        {availableDate && (
          <p className="mt-2 text-xs text-gray-400">
            🗓 {isAvailableNow ? 'Available now' : `Available from ${availableDate}`}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
            {initials}
          </div>
          <span className="text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span>{room.profiles?.full_name}</span>
              {room.profiles?.is_verified && (
                <span title="Verified Owner" className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                  ✓
                </span>
              )}
            </div>
          </span>
        </div>

        <Link
          href={`/listings/${room.id}`}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          Details →
        </Link>
      </div>
    </div>
  )
}