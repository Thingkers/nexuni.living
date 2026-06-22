'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ShareButton from '@/features/rooms/components/ShareButton'
import { supabase } from '@/lib/supabase'
import type { Room } from '@/features/rooms/types/room.types'
import { isSharedRoom, ROOM_TYPE_LABELS } from '@/features/rooms/types/room.types'
import BookingModal from '@/features/bookings/components/BookingModal'
import ReportListingButton from '@/features/rooms/components/ReportListingButton'
import ReviewBox from '@/features/reviews/components/ReviewBox'
import SimilarRooms from '@/features/rooms/components/SimilarRooms'

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
  const [descExpanded, setDescExpanded] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    async function loadRoomDetails() {
      const [{ data: roomData }, { data: userData }] = await Promise.all([
        supabase.from('rooms').select('*, profiles(full_name, phone, avatar_url, university)').eq('id', params.id).single(),
        supabase.auth.getUser(),
      ])

      if (!roomData) return
      setRoom(roomData as Room)

      const isOwner = userData.user?.id === roomData.owner_id
      if (!isOwner) {
        await supabase.from('rooms').update({ views: (roomData.views ?? 0) + 1 }).eq('id', roomData.id)
      }

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
        <div className="mb-6 h-80 rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="mb-3 h-6 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
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
                    className={`absolute inset-0 cursor-zoom-in transition-opacity duration-700 ${index === activeImage ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setLightbox(activeImage)}
                  >
                    <Image src={src} alt={room.title} fill className="object-cover" />
                  </div>
                ))}
                {/* Gradient */}
                <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{room.title}</h1>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                {status.label}
              </span>
            </div>

            {/* Location + Type + Gender chips */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                📍 {room.location_name || 'Location not added'}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {ROOM_TYPE_LABELS[room.type] ?? room.type}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {room.gender_type === 'male' ? '👨 Male' : room.gender_type === 'female' ? '👩 Female' : '👥 Any'}
              </span>
            </div>

            {/* Seats availability */}
            {isSharedRoom(room.type) && (
              <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {availableSeats === 0
                    ? '🔴 No seats available'
                    : availableSeats === totalSeats
                      ? `🟢 All ${totalSeats} seats available`
                      : `🟡 ${availableSeats} of ${totalSeats} seats available`}
                </p>
              </div>
            )}

            {/* Pricing breakdown */}
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="mb-3 text-xs font-semibold text-blue-700 dark:text-blue-400">💰 Pricing</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isSharedRoom(room.type) ? 'Rent per seat' : 'Monthly rent'}
                    </p>
                    <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                      ৳{room.rent.toLocaleString('en-US')}
                      <span className="ml-1 text-sm font-normal text-gray-400">/month</span>
                    </p>
                  </div>
                  {isSharedRoom(room.type) && room.total_seats > 1 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total seats</p>
                      <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{room.total_seats}</p>
                    </div>
                  )}
                </div>

                {/* Additional costs */}
                {((room.electricity_bill ?? 0) > 0 || (room.maid_bill ?? 0) > 0 || (room.other_bill ?? 0) > 0) && (
                  <div className="mt-1 border-t border-blue-200 pt-2 dark:border-blue-700">
                    <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Additional monthly costs:</p>
                    <div className="flex flex-col gap-1">
                      {(room.electricity_bill ?? 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">💡 Electricity bill</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">৳{(room.electricity_bill!).toLocaleString('en-US')}</span>
                        </div>
                      )}
                      {(room.maid_bill ?? 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">🧹 Maid bill</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">৳{(room.maid_bill!).toLocaleString('en-US')}</span>
                        </div>
                      )}
                      {(room.other_bill ?? 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">➕ {room.other_bill_label || 'Other'}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">৳{(room.other_bill!).toLocaleString('en-US')}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-blue-200 pt-1 text-xs dark:border-blue-700">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Total {isSharedRoom(room.type) ? 'per seat' : ''}/month
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          ৳{(room.rent + (room.electricity_bill ?? 0) + (room.maid_bill ?? 0) + (room.other_bill ?? 0)).toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Facilities */}
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Facilities</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'wifi',          icon: '📶', label: 'WiFi' },
                  { key: 'electricity',   icon: '💡', label: 'Electricity' },
                  { key: 'gas',           icon: '🔥', label: 'Gas' },
                  { key: 'ac',            icon: '❄️', label: 'AC' },
                  { key: 'attached_bath', icon: '🚿', label: 'Attached Bath' },
                  { key: 'study_table',   icon: '📚', label: 'Study Table' },
                  { key: 'parking',       icon: '🅿️', label: 'Parking' },
                  { key: 'laundry',       icon: '👕', label: 'Laundry' },
                  { key: 'cctv',          icon: '📷', label: 'CCTV' },
                ].filter((a) => room[a.key as keyof Room] !== undefined).map((amenity) => {
                  const available = room[amenity.key as keyof Room]
                  return (
                    <div
                      key={amenity.key}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        available
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-50 text-gray-300 line-through dark:bg-gray-800 dark:text-gray-600'
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
              <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">📝 Description</p>
                <p className={`text-sm leading-relaxed text-gray-600 dark:text-gray-400 ${!descExpanded && room.description.length > 200 ? 'line-clamp-4' : ''}`}>
                  {room.description}
                </p>
                {room.description.length > 200 && (
                  <button
                    onClick={() => setDescExpanded((p) => !p)}
                    className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {descExpanded ? '▲ Show less' : '▼ Read more'}
                  </button>
                )}
              </div>
            )}

            {availableText && (
              <p className="text-sm text-gray-400 dark:text-gray-500">🗓 {availableText}</p>
            )}
          </div>

          {/* RIGHT — Owner card */}
          <div className="w-full shrink-0 md:w-72">
            <div className="sticky top-20 rounded-2xl border border-gray-100 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-blue-700">
                  {room.profiles?.avatar_url ? (
                    <img src={room.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{room.profiles?.full_name || 'Owner'}</p>
                  {room.profiles?.university && <p className="text-xs text-gray-400 dark:text-gray-500">{room.profiles.university}</p>}
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
                {!isOwner && <ReportListingButton roomId={room.id} />}
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

        <SimilarRooms
          currentRoomId={room.id}
          type={room.type}
          locationName={room.location_name}
          genderType={room.gender_type}
        />
      </main>

      {showBooking && currentUser && isVerified && (
        <BookingModal room={room} userId={currentUser.id} onClose={() => setShowBooking(false)} />
      )}

      {/* Image Lightbox */}
      {lightbox !== null && room.images && room.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>

          {room.images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setLightbox((prev) => ((prev! - 1 + room.images!.length) % room.images!.length)) }}
              >‹</button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setLightbox((prev) => ((prev! + 1) % room.images!.length)) }}
              >›</button>
            </>
          )}

          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            style={{ aspectRatio: '16/9', width: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={room.images[lightbox]}
              alt={room.title}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>

          {room.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {room.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightbox(i) }}
                  className={`h-1.5 rounded-full transition-all ${i === lightbox ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}