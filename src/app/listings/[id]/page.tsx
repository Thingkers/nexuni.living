'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ShareButton from '@/features/rooms/components/ShareButton'
import { supabase } from '@/lib/supabase'
import type { Room } from '@/features/rooms/types/room.types'
import BookingModal from '@/features/bookings/components/BookingModal'
import ReportListingButton from '@/features/rooms/components/ReportListingButton'
import ReviewBox from '@/features/reviews/components/ReviewBox'
import RoomCard from '@/features/rooms/components/RoomCard'
import AvailabilityCalendar from '@/features/rooms/components/AvailabilityCalendar'
import { getAvailabilityStatus } from '@/lib/getAvailabilityStatus'
const RoomMap = dynamic(
  () => import('@/features/map/components/RoomMap'),
  { ssr: false },
)

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'bg-green-50 text-green-700',
  },
  partial: {
    label: 'Partially Available',
    className: 'bg-yellow-50 text-yellow-700',
  },
  booked: {
    label: 'Booked',
    className: 'bg-red-50 text-red-600',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600',
  },
}

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>()

  const [room, setRoom] = useState<Room | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [similarRooms, setSimilarRooms] = useState<Room[]>([])

  useEffect(() => {
  async function loadRoomDetails() {
    const [{ data: roomData }, { data: userData }] = await Promise.all([
      supabase
        .from('rooms')
        .select('*, profiles(full_name, phone, avatar_url, university)')
        .eq('id', params.id)
        .single(),

      supabase.auth.getUser(),
    ])

    if (!roomData) return

    setRoom(roomData as Room)
  

    await supabase
      .from('rooms')
      .update({
        views: (roomData.views ?? 0) + 1,
      })
      .eq('id', roomData.id)

    loadSimilarRooms(roomData)

    setCurrentUser(userData.user)
    setLoading(false)
  }

  async function loadSimilarRooms(room: any) {
    const minRent = room.rent - 2000
    const maxRent = room.rent + 2000

    const { data } = await supabase
      .from('rooms')
      .select(`
        *,
        profiles(full_name, avatar_url, is_verified)
      `)
      .neq('id', room.id)
      .eq('type', room.type)
      .eq('gender_type', room.gender_type)
      .gte('rent', minRent)
      .lte('rent', maxRent)
      .limit(6)

    setSimilarRooms((data ?? []) as Room[])
  }

  if (params.id) {
    loadRoomDetails()
  }
}, [params.id])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 animate-pulse">
        <div className="mb-6 h-72 rounded-2xl bg-gray-100" />
        <div className="mb-3 h-6 w-2/3 rounded bg-gray-100" />
        <div className="h-4 w-1/3 rounded bg-gray-100" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="py-20 text-center text-gray-400">
        Listing not found
      </div>
    )
  }

  const isOwner = currentUser?.id === room.owner_id
  const isBooked = room.status === 'booked' || room.status === 'closed'
  const status = STATUS_LABEL[room.status] ?? STATUS_LABEL.open

  const availability =
  getAvailabilityStatus({
    availableSeats: room.available_seats,
    totalSeats: room.total_seats,
  })

  const initials =
    room.profiles?.full_name
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U'

  const availableText = room.available_from
    ? new Date(room.available_from) <= new Date()
      ? 'Available now'
      : `Available from ${new Date(room.available_from).toLocaleDateString(
          'en-US',
          {
            month: 'long',
            year: 'numeric',
          },
        )}`
    : 'Availability not added'
    

  return (
    <>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link
          href="/listings"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700"
        >
          ← All Listings
        </Link>

        <div className="mb-6">
          <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-black">
            {room.images?.[activeImage] ? (
              <Image
                src={room.images[activeImage]}
                alt={room.title}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-6xl">🏠</span>
            )}
          </div>

          {room.images && room.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {room.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`relative h-20 overflow-hidden rounded-xl border ${
                    activeImage === index
                      ? 'border-blue-600'
                      : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Room image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1">
            <div className="mb-2 flex items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold text-gray-900">
                {room.title}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>

            <p className="mb-4 text-sm text-gray-400">
              📍 {room.location_name || 'Location not added'} ·{' '}
              {room.type === 'mess'
                ? 'Mess'
                : room.type === 'bachelor'
                  ? 'Bachelor'
                  : 'Sublet'}{' '}
              ·{' '}
              {room.gender_type === 'male'
                ? 'Male'
                : room.gender_type === 'female'
                  ? 'Female'
                  : 'Any'}
            </p>

            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${availability.color}`}
            >
              <span>{availability.emoji}</span>
              <span>{availability.label}</span>
            </div>

            <div className="mb-5 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs text-gray-400">Monthly Rent</p>
                <p className="text-3xl font-bold text-blue-600">
                  ৳{room.rent.toLocaleString('en-US')}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Total Seats</p>
                <p className="text-lg font-semibold text-gray-700">
                  {room.total_seats}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Available Seats</p>
                <p className="text-lg font-semibold text-blue-600">
                  {room.available_seats}
                </p>
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Amenities
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { key: 'wifi', icon: '📶', label: 'WiFi' },
                  { key: 'gas', icon: '🔥', label: 'Gas' },
                  { key: 'electricity', icon: '💡', label: 'Electricity' },
                ].map((amenity) => {
                  const isAvailable = room[amenity.key as keyof Room]

                  return (
                    <div
                      key={amenity.key}
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-sm ${
                        isAvailable
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-50 text-gray-300 line-through'
                      }`}
                    >
                      {amenity.icon} {amenity.label}
                    </div>
                  )
                })}
              </div>
            </div>

            {room.description && (
              <div className="mb-5">
                <p className="mb-1 text-sm font-medium text-gray-700">
                  Description
                </p>

                <p className="text-sm leading-relaxed text-gray-500">
                  {room.description}
                </p>
              </div>
            )}

            <p className="text-sm text-gray-400">🗓 {availableText}</p>
            <AvailabilityCalendar availableFrom={room.available_from} />

            {room.latitude && room.longitude && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Location Map
                </p>

                <RoomMap
                  latitude={room.latitude}
                  longitude={room.longitude}
                  title={room.title}
                  locationName={room.location_name}
                />
              </div>
            )}
          </div>

          <div className="w-full shrink-0 md:w-72">
            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-medium text-blue-700">
                  {initials}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {room.profiles?.full_name || 'Owner'}
                  </p>

                  <p className="text-xs text-gray-400">
                    {room.profiles?.university || 'University not added'}
                  </p>
                </div>
              </div>

              {room.profiles?.phone && (
                <a
                  href={`tel:${room.profiles.phone}`}
                  className="mb-3 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  📞 {room.profiles.phone}
                </a>
              )}

              <div className="mb-3">
                <ShareButton
                  title={room.title}
                  rent={room.rent}
                  location={room.location_name}
                  roomId={room.id}
                />
                <ReportListingButton roomId={room.id} />
              </div>

              {!isOwner && currentUser && (
                <div className="flex flex-col gap-2">
                  <button
                    disabled={isBooked}
                    onClick={() => setShowBooking(true)}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isBooked ? 'Booking Closed' : 'Request Booking'}
                  </button>

                  <Link
                    href={`/inbox/${room.owner_id}`}
                    className="w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Message Owner
                  </Link>
                </div>
              )}

              {isOwner && (
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/listings/${room.id}/edit`}
                    className="w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-medium hover:bg-gray-50"
                  >
                    Edit Listing
                  </Link>

                  <p className="text-center text-xs text-gray-400">
                    This is your listing
                  </p>
                </div>
              )}

              {!currentUser && (
                <Link
                  href="/auth/login"
                  className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-medium text-white hover:bg-blue-700"
                >
                  Login to Request Booking
                </Link>
              )}
            </div>
          </div>
        </div>

        <ReviewBox
          roomId={room.id}
          ownerId={room.owner_id}
        />

        {similarRooms.length > 0 && (
          <section className="mt-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Similar Rooms
              </h2>

              <p className="text-sm text-gray-400">
                You may also like
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {similarRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {showBooking && currentUser && (
        <BookingModal
          room={room}
          userId={currentUser.id}
          onClose={() => setShowBooking(false)}
        />
      )}
    </>
  )
}