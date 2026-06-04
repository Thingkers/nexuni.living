'use client'

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

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  open:    { label: 'Open',                className: 'bg-green-500 text-white' },
  partial: { label: 'Partially Available', className: 'bg-yellow-400 text-white' },
  booked:  { label: 'Booked',              className: 'bg-red-500 text-white' },
  closed:  { label: 'Closed',              className: 'bg-gray-400 text-white' },
}

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>()

  const [room, setRoom]               = useState<Room | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    async function loadRoomDetails() {
      const [{ data: roomData }, { data: userData }] = await Promise.all([
        supabase.from('rooms').select('*, profiles(full_name, phone, avatar_url, university)').eq('id', params.id).single(),
        supabase.auth.getUser(),
      ])

      if (!roomData) return
      setRoom(roomData as Room)

      await supabase.from('rooms').update({ views: (roomData.views ?? 0) + 1 }).eq('id', roomData.id)

      setCurrentUser(userData.user)

      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles').select('verification_status, role').eq('id', userData.user.id).single()
        setUserProfile(profile)
      }

      setLoading(false)
    }

    if (params.id) loadRoomDetails()
  }, [params.id])

  // Auto slideshow
  useEffect(() => {
    if (!room?.images || room.images.length <= 1) return
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % (room.images?.length ?? 1))
    }, 4000)
    return () => clearInterval(interval)
  }, [room?.images])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 animate-pulse">
        <div className="mb-6 h-80 rounded-2xl bg-gray-100" />
        <div className="mb-3 h-6 w-2/3 rounded bg-gray-100" />
        <div className="h-4 w-1/3 rounded bg-gray-100" />
      </div>
    )
  }

  if (!room) return <div className="py-20 text-center text-gray-400">Listing not found</div>

  const isOwner    = currentUser?.id === room.owner_id
  const isBooked   = room.status === 'booked' || room.status === 'closed'
  const status     = STATUS_LABEL[room.status] ?? STATUS_LABEL.open
  const isVerified = userProfile?.verification_status === 'approved'

  const availableSeats = room.available_seats ?? 0
  const totalSeats     = room.total_seats ?? 0

  const initials =
    room.profiles?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  const availableText = room.available_from
    ? new Date(room.available_from) <= new Date()
      ? 'Available now'
      : `Available from ${new Date(room.available_from).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : null

  return (
    <>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link href="/listings" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700">
          ← All Listings
        </Link>

        {/* IMAGES */}
        <div className="mb-6">
          <div className="relative h-80 overflow-hidden rounded-2xl bg-gray-900">
            {room.images && room.images.length > 0 ? (
              <>
                {room.images.map((src, index) => (
                  <div
                    key={src}
                    className={`absolute inset-0 transition-opacity duration-700 ${index === activeImage ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <Image src={src} alt={room.title} fill className="object-cover" />
                  </div>
                ))}
                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                {/* Nav arrows */}
                {room.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImage((prev) => (prev - 1 + room.images!.length) % room.images!.length)}
                      className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow hover:bg-white"
                    >‹</button>
                    <button
                      onClick={() => setActiveImage((prev) => (prev + 1) % room.images!.length)}
                      className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow hover:bg-white"
                    >›</button>

                    {/* Dots */}
                    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                      {room.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImage(i)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${i === activeImage ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Image counter */}
                <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                  {activeImage + 1} / {room.images.length}
                </span>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">🏠</div>
            )}
          </div>

          {/* Thumbnails */}
          {room.images && room.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {room.images.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setActiveImage(index)}
                  className={`relative h-20 overflow-hidden rounded-xl border-2 transition-all ${
                    activeImage === index ? 'border-blue-600 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={image} alt={`Image ${index + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* LEFT */}
          <div className="flex-1">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{room.title}</h1>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                {status.label}
              </span>
            </div>

            {/* Location + Type + Gender chips */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-gray-500">
                📍 {room.location_name || 'Location not added'}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {room.type === 'mess' ? '🍳 Mess' : room.type === 'bachelor' ? '🛋 Bachelor' : '🔑 Sublet'}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {room.gender_type === 'male' ? '👨 Male' : room.gender_type === 'female' ? '👩 Female' : '👥 Any'}
              </span>
            </div>

            {/* Seats */}
            <div className="mb-5 rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">
                {availableSeats === 0
                  ? '🔴 No seats available'
                  : availableSeats === totalSeats
                    ? '🟢 All seats available'
                    : `🟡 ${availableSeats} of ${totalSeats} seats available`}
              </p>
            </div>

            {/* Rent + Stats */}
            <div className="mb-5 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs text-gray-400">Monthly Rent</p>
                <p className="text-3xl font-bold text-blue-600">৳{room.rent.toLocaleString('en-US')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Seats</p>
                <p className="text-xl font-semibold text-gray-700">{room.total_seats}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Available Seats</p>
                <p className="text-xl font-semibold text-blue-600">{room.available_seats}</p>
              </div>
            </div>

            {/* Amenities */}
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-gray-700">Amenities</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'wifi', icon: '📶', label: 'WiFi' },
                  { key: 'gas', icon: '🔥', label: 'Gas' },
                  { key: 'electricity', icon: '💡', label: 'Electricity' },
                ].map((amenity) => {
                  const isAvailable = room[amenity.key as keyof Room]
                  return (
                    <div
                      key={amenity.key}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        isAvailable ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-300 line-through'
                      }`}
                    >
                      {amenity.icon} {amenity.label}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            {room.description && (
              <div className="mb-5 rounded-xl bg-gray-50 px-4 py-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Description</p>
                <p className="text-sm leading-relaxed text-gray-500">{room.description}</p>
              </div>
            )}

            {availableText && (
              <p className="text-sm text-gray-400">🗓 {availableText}</p>
            )}
          </div>

          {/* RIGHT — Owner card */}
          <div className="w-full shrink-0 md:w-72">
            <div className="sticky top-20 rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-blue-700">
                  {room.profiles?.avatar_url ? (
                    <img src={room.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{room.profiles?.full_name || 'Owner'}</p>
                  <p className="text-xs text-gray-400">{room.profiles?.university || 'AIUB'}</p>
                </div>
              </div>

              {room.profiles?.phone && isVerified && (
                <a
                  href={`tel:${room.profiles.phone}`}
                  className="mb-3 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  📞 {room.profiles.phone}
                </a>
              )}

              <div className="mb-3 flex flex-col gap-2">
                <ShareButton title={room.title} rent={room.rent} location={room.location_name} roomId={room.id} />
                <ReportListingButton roomId={room.id} />
              </div>

              {currentUser && !isVerified && !isOwner && (
                <div className="rounded-xl bg-yellow-50 px-4 py-3 text-center text-xs text-yellow-700">
                  ⏳ Account verify হলে booking ও contact করতে পারবেন
                </div>
              )}

              {!isOwner && currentUser && isVerified && (
                <div className="flex flex-col gap-2">
                  <button
                    disabled={isBooked}
                    onClick={() => setShowBooking(true)}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                  <p className="text-center text-xs text-gray-400">This is your listing</p>
                </div>
              )}

              {!currentUser && (
                <Link
                  href="/auth/login"
                  className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Login to Request Booking
                </Link>
              )}
            </div>
          </div>
        </div>

        <ReviewBox roomId={room.id} ownerId={room.owner_id} />
      </main>

      {showBooking && currentUser && isVerified && (
        <BookingModal room={room} userId={currentUser.id} onClose={() => setShowBooking(false)} />
      )}
    </>
  )
}