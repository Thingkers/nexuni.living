import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSaved } from '@/hooks/useSaved'
import type { Room } from '@/features/rooms/types/room.types'
import { isSharedRoom, ROOM_TYPE_LABELS } from '@/features/rooms/types/room.types'
import { getAvailabilityStatus } from '@/lib/getAvailabilityStatus'

const STATUS_CONFIG = {
  open:    { label: 'Open',                bg: 'bg-green-500',  text: 'text-white' },
  partial: { label: 'Partially Available', bg: 'bg-yellow-400', text: 'text-white' },
  booked:  { label: 'Booked',              bg: 'bg-red-500',    text: 'text-white' },
  closed:  { label: 'Closed',              bg: 'bg-gray-400',   text: 'text-white' },
} as const

const AMENITIES = [
  { key: 'wifi',        icon: '📶', label: 'WiFi' },
  { key: 'gas',         icon: '🔥', label: 'Gas' },
  { key: 'electricity', icon: '💡', label: 'Electricity' },
] as const

export default function RoomCard({ room }: { room: Room }) {
  const isBooked = room.status === 'booked' || room.status === 'closed'
  const { isSaved, toggleSaved } = useSaved(room.id)

  const [activeImage, setActiveImage] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const images = room.images ?? []
  const hasImages = images.length > 0

  useEffect(() => {
    if (images.length <= 1) return
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % images.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [images.length])

  const availability = getAvailabilityStatus({
    availableSeats: room.available_seats,
    totalSeats: room.total_seats,
  })

  // If a shared room has 0 seats left, treat it as booked regardless of DB status
  const effectiveStatus =
    isSharedRoom(room.type) && (room.available_seats ?? 0) === 0 ? 'booked' : room.status
  const statusConfig = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.open

  const availableDate = room.available_from
    ? new Date(room.available_from).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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

  const shortDesc = room.description
    ? room.description.length > 80
      ? room.description.slice(0, 80) + '...'
      : room.description
    : null

  function nextImage(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setActiveImage((prev) => (prev + 1) % images.length)
  }

  function prevImage(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setActiveImage((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-teal-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-teal-700 ${isBooked ? 'opacity-70' : ''}`}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100 dark:bg-gray-700">
        {hasImages ? (
          <>
            {images.map((src, index) => (
              <div
                key={src}
                className={`absolute inset-0 transition-opacity duration-700 ${index === activeImage ? 'opacity-100' : 'opacity-0'}`}
              >
                <Image src={src} alt={room.title} fill className="object-cover" />
              </div>
            ))}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🏠</div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSaved() }}
          className="absolute bottom-2.5 left-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base shadow-sm transition-transform hover:scale-110 hover:bg-white"
        >
          {isSaved ? '❤️' : '🤍'}
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className={`absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >‹</button>
            <button
              type="button"
              onClick={nextImage}
              className={`absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >›</button>

            <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveImage(index) }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeImage === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <Link href={`/listings/${room.id}`}>
            <h3 className="line-clamp-1 font-semibold text-gray-900 transition-colors hover:text-teal-600 dark:text-white dark:hover:text-teal-400">
              {room.title}
            </h3>
          </Link>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            📍 {room.location_name || 'Location not added'}
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {ROOM_TYPE_LABELS[room.type] ?? room.type}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {room.gender_type === 'male' ? '👨 Male' : room.gender_type === 'female' ? '👩 Female' : '👥 Any'}
          </span>
        </div>

        {shortDesc && (
          <p className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
            {shortDesc}
          </p>
        )}

        <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
          ৳{room.rent.toLocaleString('en-US')}
          <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
            {isSharedRoom(room.type) ? ' /seat/month' : ' /month'}
          </span>
        </p>

        {isSharedRoom(room.type) ? (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {room.available_seats} of {room.total_seats} seats
            </p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${availability.color}`}>
              {availability.emoji} {availability.label}
            </span>
          </div>
        ) : (
          <div className="mt-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {AMENITIES.filter((a) => room[a.key]).map((a) => (
            <span key={a.key} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
              {a.icon} {a.label}
            </span>
          ))}
        </div>

        {availableDate && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            🗓 {isAvailableNow ? 'Available now' : `From ${availableDate}`}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-50 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
            {room.profiles?.avatar_url ? (
              <img src={room.profiles.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">{room.profiles?.full_name}</span>
            {room.profiles?.is_verified && (
              <span title="Verified" className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white">✓</span>
            )}
          </div>
        </div>

        <Link
          href={`/listings/${room.id}`}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-700"
        >
          Details →
        </Link>
      </div>
    </div>
  )
}
