'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin, Wifi, Flame, Zap, Calendar, Bookmark, Share2,
  UtensilsCrossed, BedDouble, Key, Bed, Home as HomeIcon,
  type LucideIcon,
} from 'lucide-react'
import type { Room } from '@/features/rooms/types/room.types'
import { isSharedRoom, ROOM_TYPE_LABELS } from '@/features/rooms/types/room.types'
import { getAvailabilityStatus } from '@/lib/getAvailabilityStatus'
import { useSavedRooms } from '@/features/rooms/components/SavedRoomsProvider'

const STATUS_CONFIG = {
  open:    { label: 'Open',                bg: 'bg-green-500',  text: 'text-white' },
  partial: { label: 'Partially Available', bg: 'bg-yellow-400', text: 'text-white' },
  booked:  { label: 'Booked',              bg: 'bg-red-500',    text: 'text-white' },
  closed:  { label: 'Closed',              bg: 'bg-gray-400',   text: 'text-white' },
} as const

const AMENITIES = [
  { key: 'wifi',        Icon: Wifi,  label: 'WiFi' },
  { key: 'gas',         Icon: Flame, label: 'Gas' },
  { key: 'electricity', Icon: Zap,   label: 'Electricity' },
] as const

const TYPE_ICON: Record<string, LucideIcon> = {
  mess:           UtensilsCrossed,
  bachelor:       BedDouble,
  sublet:         Key,
  single:         Bed,
  master_bedroom: HomeIcon,
}


export default function RoomCard({ room }: { room: Room }) {
  const isBooked = room.status === 'booked' || room.status === 'closed'
  const [activeImage, setActiveImage] = useState(0)
  const [isHovered, setIsHovered]     = useState(false)
  const images = room.images ?? []
  const hasImages = images.length > 0

  // Saved state is shared via context — one query for the whole page instead
  // of one auth + one saved_rooms request per card.
  const { userId, isSaved, toggleSaved } = useSavedRooms()
  const saved = isSaved(room.id)

  // Which carousel slides have been shown so far. Only these (plus the
  // upcoming slide) get an <Image> mounted, so a card with 6 photos doesn't
  // download all 6 upfront — only the visible one and the next.
  const [shownImages, setShownImages] = useState<Set<number>>(() => new Set([0]))

  useEffect(() => {
    // Bookkeeping derived from activeImage, not a data fetch — recording that
    // this slide has been displayed so its <Image> stays mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShownImages((prev) => {
      if (prev.has(activeImage)) return prev
      const next = new Set(prev)
      next.add(activeImage)
      return next
    })
  }, [activeImage])

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

  const effectiveStatus =
    isSharedRoom(room.type) && (room.available_seats ?? 0) === 0 ? 'booked' : room.status
  const statusConfig = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.open

  const availableDate = room.available_from
    ? new Date(room.available_from).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null
  const isAvailableNow = room.available_from ? new Date(room.available_from) <= new Date() : false

  const initials =
    room.profiles?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  const shortDesc = room.description
    ? room.description.length > 80
      ? room.description.slice(0, 80) + '...'
      : room.description
    : null

  function nextImage(e: React.MouseEvent) { e.preventDefault(); e.stopPropagation(); setActiveImage((p) => (p + 1) % images.length) }
  function prevImage(e: React.MouseEvent) { e.preventDefault(); e.stopPropagation(); setActiveImage((p) => (p - 1 + images.length) % images.length) }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault()
    const url = `${window.location.origin}/listings/${room.id}`
    if (navigator.share) {
      navigator.share({ title: room.title, url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  const TypeIcon = TYPE_ICON[room.type]

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-teal-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-teal-700 ${isBooked ? 'opacity-70' : ''}`}
    >
      {/* ── Image ── */}
      <div className="relative h-52 overflow-hidden bg-gray-100 dark:bg-gray-700">
        {hasImages ? (
          images.map((src, index) => {
            const upcoming = (activeImage + 1) % images.length
            const shouldLoad = index === activeImage || index === upcoming || shownImages.has(index)
            return (
              <div key={src} className={`absolute inset-0 transition-opacity duration-700 ${index === activeImage ? 'opacity-100' : 'opacity-0'}`}>
                {shouldLoad && (
                  <Image
                    src={src}
                    alt={room.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
            )
          })
        ) : (
          <div className="flex h-full items-center justify-center">
            <HomeIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />

        {images.length > 1 && (
          <>
            <button type="button" onClick={prevImage}
              className={`absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>‹</button>
            <button type="button" onClick={nextImage}
              className={`absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>›</button>
            <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1">
              {images.map((_, i) => (
                <button key={i} type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveImage(i) }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === activeImage ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Content ── */}
      <div className="p-4">

        {/* Save + Share — float top-right so heading/body reclaim full width below */}
        <div className="float-right ml-3 flex gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              if (!userId) return
              toggleSaved(room.id)
            }}
            title={saved ? 'Saved' : 'Save'}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
              saved
                ? 'border-teal-400 bg-teal-50 text-teal-600 dark:bg-teal-900/30'
                : 'border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-500 dark:border-gray-700 dark:text-gray-500'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-teal-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleShare}
            title="Share"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-teal-300 hover:text-teal-500 dark:border-gray-700 dark:text-gray-500"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <Link href={`/listings/${room.id}`}>
          <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 transition-colors hover:text-teal-600 dark:text-white dark:hover:text-teal-400">
            {room.title}
          </h3>
        </Link>

        <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{room.location_name || 'Location not added'}</span>
        </div>

        {/* Room type (left) + gender (right), side by side */}
        <div className="mb-3 clear-right flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {TypeIcon && <TypeIcon className="h-3 w-3 shrink-0" />}
            {ROOM_TYPE_LABELS[room.type] ?? room.type}
          </span>
          {room.gender_type === 'male' && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              Male only
            </span>
          )}
          {room.gender_type === 'female' && (
            <span className="inline-flex items-center rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-600 dark:bg-pink-900/20 dark:text-pink-400">
              Female only
            </span>
          )}
          {room.gender_type === 'any' && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              Any gender
            </span>
          )}
        </div>

        <p className="mb-2 text-xl font-bold text-teal-600 dark:text-teal-400">
          ৳{room.rent.toLocaleString('en-US')}
          <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
            {isSharedRoom(room.type) ? ' /seat/month' : ' /month'}
          </span>
        </p>

        {isSharedRoom(room.type) ? (
          <div className="mb-3 flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{room.available_seats} of {room.total_seats} seats</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${availability.color}`}>
              {availability.emoji} {availability.label}
            </span>
          </div>
        ) : (
          <div className="mb-3">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-1.5">
          {AMENITIES.filter((a) => room[a.key]).map(({ key, Icon, label }) => (
            <span key={key} className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
              <Icon className="h-3 w-3 shrink-0" /> {label}
            </span>
          ))}
        </div>

        {shortDesc && (
          <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
            {shortDesc}
          </p>
        )}

        {/* Available date + Details button — same row */}
        <div className="mt-1 flex items-center justify-between gap-2">
          {availableDate ? (
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isAvailableNow
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400'
            }`}>
              <Calendar className="h-3 w-3 shrink-0" />
              {isAvailableNow ? 'Available now' : `From ${availableDate}`}
            </div>
          ) : <span />}
          <Link
            href={`/listings/${room.id}`}
            className="rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Details →
          </Link>
        </div>
      </div>

      {/* ── Owner strip ── */}
      <div className="flex items-center gap-2 border-t border-gray-50 px-4 py-3 dark:border-gray-700">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
          {room.profiles?.avatar_url
            ? <img src={room.profiles.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            : initials}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">{room.profiles?.full_name}</span>
          {room.profiles?.is_verified && (
            <span title="Verified" className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white">✓</span>
          )}
        </div>
      </div>
    </div>
  )
}
