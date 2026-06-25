'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { bookingConfirmedTemplate, bookingRejectedTemplate } from '@/lib/email/templates'
import { isSharedRoom } from '@/features/rooms/types/room.types'
import type { RoomType } from '@/features/rooms/types/room.types'

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'active' | 'cancelled' | 'rejected' | 'expired'

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',         className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Hold (24h)',      className: 'bg-blue-50 text-blue-700 border-blue-200' },
  active:    { label: '✅ Active',        className: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled',       className: 'bg-red-50 text-red-600 border-red-200' },
  rejected:  { label: 'Rejected',        className: 'bg-red-50 text-red-600 border-red-200' },
  expired:   { label: '⏰ Expired',       className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export default function BookingRequestsPage() {
  const router = useRouter()

  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [acting, setActing] = useState<string | null>(null)
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    async function loadBookings() {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          rooms!inner(id, title, rent, location_name, owner_id, type, available_seats),
          profiles(id, full_name, email, phone, university, gender)
        `)
        .eq('rooms.owner_id', authData.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        setPageError(error.message)
      } else {
        setBookings(data ?? [])
      }

      setLoading(false)
    }

    loadBookings()
  }, [router])

  async function handleAction(
    bookingId: string,
    action: 'confirmed' | 'cancelled' | 'rejected' | 'active',
  ) {
    setActing(bookingId)

    const booking = bookings.find((b) => b.id === bookingId)

    const { error } = await supabase
      .from('bookings')
      .update({ status: action })
      .eq('id', bookingId)

    if (error) {
      toast.error(error.message)
      setActing(null)
      return
    }

    // Update room seats/status when booking is confirmed
    if (booking?.rooms?.id && action === 'confirmed') {
      const roomType = booking.rooms.type as RoomType
      const roomId   = booking.rooms.id

      if (isSharedRoom(roomType)) {
        const seatsBooked = booking.seats ?? 1
        const newSeats    = Math.max(0, (booking.rooms.available_seats ?? 0) - seatsBooked)
        await supabase
          .from('rooms')
          .update({ available_seats: newSeats, status: newSeats === 0 ? 'booked' : 'partial' })
          .eq('id', roomId)
      } else {
        // Single / master_bedroom — one booking fills the room
        await supabase
          .from('rooms')
          .update({ status: 'booked' })
          .eq('id', roomId)
      }
    }

    setBookings((previous) =>
      previous.map((b) => b.id === bookingId ? { ...b, status: action } : b),
    )

    toast.success(
      action === 'confirmed' ? 'Booking confirmed! 24h hold started.' :
      action === 'active'    ? '✅ Advance marked received! Booking is now active.' :
      action === 'rejected'  ? 'Booking rejected.' :
      'Booking cancelled.',
    )

    // Notify tenant via email
    const tenantEmail = booking?.profiles?.email
    const tenantName  = booking?.profiles?.full_name
    if (tenantEmail && (action === 'confirmed' || action === 'rejected')) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            to: tenantEmail,
            subject: action === 'confirmed'
              ? 'Your booking has been confirmed 🎉'
              : 'Update on your booking request',
            html: action === 'confirmed'
              ? bookingConfirmedTemplate({ userName: tenantName, roomTitle: booking.rooms.title, roomLocation: booking.rooms.location_name })
              : bookingRejectedTemplate({ userName: tenantName, roomTitle: booking.rooms.title, roomLocation: booking.rooms.location_name }),
          }),
        })
      }
    }

    setActing(null)
  }

  async function reactivateRoom(bookingId: string, roomId: string) {
    setActing(bookingId)

    const [{ error: bookingError }, { error: roomError }] = await Promise.all([
      supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId),
      supabase.from('rooms').update({ status: 'open' }).eq('id', roomId),
    ])

    if (bookingError || roomError) {
      toast.error(bookingError?.message ?? roomError?.message ?? 'Failed to reactivate')
    } else {
      setBookings((previous) =>
        previous.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' } : b),
      )
      toast.success('Listing reactivated!')
    }

    setActing(null)
  }

  const filteredBookings =
    filter === 'all'
      ? bookings
      : bookings.filter((booking) => booking.status === filter)

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    active:    bookings.filter((b) => b.status === 'active').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    rejected:  bookings.filter((b) => b.status === 'rejected').length,
    expired:   bookings.filter((b) => b.status === 'expired').length,
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 animate-pulse">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="mb-3 h-32 rounded-2xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (pageError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {pageError}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Booking Requests
        </h1>

        {counts.pending > 0 && (
          <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-medium text-white">
            {counts.pending} new
          </span>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: 'all',       label: 'All' },
          { key: 'pending',   label: 'Pending' },
          { key: 'confirmed', label: 'On Hold' },
          { key: 'active',    label: '✅ Active' },
          { key: 'expired',   label: '⏰ Expired' },
          { key: 'cancelled', label: 'Cancelled' },
          { key: 'rejected',  label: 'Rejected' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as FilterStatus)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              filter === item.key
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            {item.label}
            <span className="ml-1.5 text-xs opacity-70">
              {counts[item.key as FilterStatus]}
            </span>
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="mb-3 text-4xl">📋</p>
          <p className="text-sm">No booking requests found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBookings.map((booking: any) => {
            const status =
              STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending

            const isPending = booking.status === 'pending'
            const isActing = acting === booking.id

            return (
              <div
                key={booking.id}
                className="rounded-2xl border border-gray-100 p-5 transition-colors hover:border-gray-200"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <Link
                      href={`/listings/${booking.rooms?.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-teal-600"
                    >
                      🏠 {booking.rooms?.title}
                    </Link>

                    <p className="mt-0.5 text-xs text-gray-400">
                      ৳{booking.rooms?.rent}/month ·{' '}
                      {booking.rooms?.location_name}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mb-3 rounded-xl bg-gray-50 p-3">

                  <div className="flex items-center gap-3">

                    <Link href={`/users/${booking.profiles?.id}`}>
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-medium text-teal-700 cursor-pointer hover:ring-2 hover:ring-teal-300">
                        {booking.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </Link>



                    <div className="min-w-0 flex-1">

                      <Link href={`/users/${booking.profiles?.id}`}>
                        <p className="text-sm font-medium text-gray-900 hover:text-teal-600 cursor-pointer">
                          {booking.profiles?.full_name || 'User'}
                        </p>
                      </Link>




                      <p className="text-xs text-gray-400">
                        {booking.profiles?.university || 'University not added'} ·{' '}
                        {booking.profiles?.gender === 'male' ? 'Male' : 'Female'}
                      </p>

                    </div>

                    {booking.profiles?.phone && (
                      <a
                        href={`tel:${booking.profiles.phone}`}
                        className="flex-shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-white"
                      >
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
                  {booking.move_in_date && (
                    <span>
                      🗓 Move-in:{' '}
                      {new Date(booking.move_in_date).toLocaleDateString(
                        'en-US',
                        {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        },
                      )}
                    </span>
                  )}

                  <span>
                    ⏰ Requested:{' '}
                    {new Date(booking.created_at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>

                {booking.message && (
                  <p className="mb-4 rounded-xl bg-teal-50 px-3 py-2 text-xs italic text-gray-500">
                    💬 “{booking.message}”
                  </p>
                )}

                {/* PENDING: Confirm or Reject */}
                {isPending && (
                  <div className="flex gap-2">
                    <button
                      disabled={!!isActing}
                      onClick={() => handleAction(booking.id, 'confirmed')}
                      className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {isActing ? 'Processing...' : '✓ Confirm & Hold 24h'}
                    </button>
                    <button
                      disabled={!!isActing}
                      onClick={() => handleAction(booking.id, 'rejected')}
                      className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      {isActing ? 'Processing...' : '✕ Reject'}
                    </button>
                  </div>
                )}

                {/* CONFIRMED (on hold, not expired): Mark Advance Received */}
                {booking.status === 'confirmed' && !isExpired(booking.expires_at) && (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      ⏳ Waiting for tenant to arrange advance payment. Once received, mark below.
                    </div>
                    <button
                      disabled={!!isActing}
                      onClick={() => handleAction(booking.id, 'active')}
                      className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {isActing ? 'Processing...' : '✅ Mark Advance Received — Confirm Booking'}
                    </button>
                  </div>
                )}

                {/* CONFIRMED but expired (tenant didn't respond in 24h) */}
                {booking.status === 'confirmed' && isExpired(booking.expires_at) && (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700">
                      ⏰ 24h hold expired — tenant did not arrange payment in time.
                    </div>
                    <button
                      disabled={!!isActing}
                      onClick={() => reactivateRoom(booking.id, booking.rooms?.id)}
                      className="w-full rounded-xl bg-gray-600 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isActing ? 'Processing...' : '🔄 Re-open Listing'}
                    </button>
                  </div>
                )}

                {/* ACTIVE: fully booked, advance received */}
                {booking.status === 'active' && (
                  <div className="rounded-xl bg-green-50 px-3 py-2.5 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    🎉 Booking active — advance received. Room is occupied by this tenant.
                  </div>
                )}

                {/* EXPIRED (auto-cancelled by cron) */}
                {booking.status === 'expired' && (
                  <div className="rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-700">
                    ⏰ Automatically expired after 24h. Room has been re-opened.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}