'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import BookingTimeline from '@/features/bookings/components/BookingTimeline'
import BookingCountdown from '@/features/bookings/components/BookingCountdown'

type BookingOwner = {
  full_name: string | null
  phone: string | null
  bkash_number: string | null
  nagad_number: string | null
}

type BookingRoom = {
  id: string
  title: string
  rent: number
  location_name: string | null
  images: string[] | null
  type: string
  profiles: (BookingOwner & { id?: string }) | null
}

type Booking = {
  id: string
  status: string
  move_in_date: string | null
  message: string | null
  created_at: string
  expires_at: string | null
  rooms: BookingRoom | null
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',        cls: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
  confirmed: { label: 'On Hold (24h)',  cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  active:    { label: '✅ Active',       cls: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  cancelled: { label: 'Cancelled',      cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
  rejected:  { label: 'Rejected',       cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
  expired:   { label: '⏰ Expired',      cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  completed: { label: '🏁 Completed',   cls: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'active']
const HISTORY_STATUSES = ['completed', 'cancelled', 'rejected', 'expired']

type ActiveFilter = 'all' | 'pending' | 'confirmed' | 'active'

export default function MyBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ActiveFilter>('all')
  const [showHistory, setShowHistory] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          rooms(
            id, title, rent, location_name, images, type,
            profiles(full_name, phone, bkash_number, nagad_number)
          )
        `)
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })

      setBookings((data as unknown as Booking[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  async function cancelBooking(bookingId: string) {
    setCancelling(bookingId)
    // RPC so cancelling a *confirmed* booking also returns the held seats to
    // the room in the same transaction (a plain status update left the seats
    // locked forever). The DB trigger still restricts tenants to cancelling
    // their own pending/confirmed bookings.
    const { error } = await supabase.rpc('set_booking_status', {
      p_booking_id: bookingId,
      p_status: 'cancelled',
    })

    if (error) {
      toast.error(error.message)
    } else {
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      toast.success('Booking cancelled')
    }
    setCancelling(null)
    setConfirmCancel(null)
  }

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied!`)
  }

  const activeBookings = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status))
  const historyBookings = bookings.filter((b) => HISTORY_STATUSES.includes(b.status))

  const displayedActive =
    filter === 'all' ? activeBookings : activeBookings.filter((b) => b.status === filter)

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Bookings</h1>
        <p className="mt-1 text-sm text-gray-400">{activeBookings.length} active</p>
      </div>

      {/* Active status filter tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all',       label: 'All' },
          { key: 'pending',   label: '⏳ Pending' },
          { key: 'confirmed', label: '🔵 On Hold' },
          { key: 'active',    label: '✅ Active' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as ActiveFilter)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              filter === tab.key
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active bookings */}
      {displayedActive.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <p className="mb-2 text-4xl">📋</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No active bookings</p>
          <Link href="/listings" className="mt-3 text-sm text-teal-600 hover:underline">Browse rooms →</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {displayedActive.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              confirmCancel={confirmCancel}
              cancelling={cancelling}
              setConfirmCancel={setConfirmCancel}
              cancelBooking={cancelBooking}
              copyToClipboard={copyToClipboard}
            />
          ))}
        </div>
      )}

      {/* Past bookings collapsible */}
      {historyBookings.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <span>📜 Past Bookings ({historyBookings.length})</span>
            <span className="text-lg">{showHistory ? '▲' : '▼'}</span>
          </button>

          {showHistory && (
            <div className="mt-3 flex flex-col gap-4">
              {historyBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  confirmCancel={confirmCancel}
                  cancelling={cancelling}
                  setConfirmCancel={setConfirmCancel}
                  cancelBooking={cancelBooking}
                  copyToClipboard={copyToClipboard}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

function BookingCard({
  booking,
  confirmCancel,
  cancelling,
  setConfirmCancel,
  cancelBooking,
  copyToClipboard,
}: {
  booking: Booking
  confirmCancel: string | null
  cancelling: string | null
  setConfirmCancel: (id: string | null) => void
  cancelBooking: (id: string) => void
  copyToClipboard: (text: string, label: string) => void
}) {
  const status = STATUS_STYLE[booking.status] ?? STATUS_STYLE.pending
  const owner = booking.rooms?.profiles
  const hasBkash = owner?.bkash_number
  const hasNagad = owner?.nagad_number
  const roomImage = booking.rooms?.images?.[0]

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="flex items-start gap-3">
        {roomImage ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            <img src={roomImage} alt="Room" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl dark:bg-gray-700">
            🏠
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/listings/${booking.rooms?.id}`}
                className="block truncate text-sm font-semibold text-gray-900 hover:text-teal-600 dark:text-white dark:hover:text-teal-400"
              >
                {booking.rooms?.title ?? 'Room'}
              </Link>
              <p className="mt-0.5 text-xs text-gray-400">
                ৳{booking.rooms?.rent}/month · {booking.rooms?.location_name}
              </p>
              {booking.move_in_date && (
                <p className="mt-0.5 text-xs text-gray-400">
                  🗓 Move-in: {new Date(booking.move_in_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {booking.message && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          &quot;{booking.message}&quot;
        </p>
      )}

      {booking.status === 'active' && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-xs font-semibold text-green-800 dark:text-green-400">🎉 Booking Active — Advance Received!</p>
          <p className="mt-0.5 text-xs text-green-700 dark:text-green-500">Your booking is confirmed and locked. You may now move in.</p>
        </div>
      )}

      {booking.status === 'completed' && (
        <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2.5 dark:border-purple-800 dark:bg-purple-900/20">
          <p className="text-xs font-semibold text-purple-800 dark:text-purple-400">🏁 Tenancy Completed</p>
          <p className="mt-0.5 text-xs text-purple-700 dark:text-purple-500">Your stay has ended. Thank you for using Student Hostel!</p>
          <Link href="/listings" className="mt-1 inline-block text-xs text-teal-600 hover:underline dark:text-teal-400">Find a new room →</Link>
        </div>
      )}

      {booking.status === 'expired' && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-700">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">⏰ Booking Expired</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">The 24h hold passed without advance payment.</p>
          <Link href={`/listings/${booking.rooms?.id}`} className="mt-1 inline-block text-xs text-teal-600 hover:underline dark:text-teal-400">Book again →</Link>
        </div>
      )}

      {booking.status === 'confirmed' && (hasBkash || hasNagad) && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="mb-2 text-xs font-semibold text-green-800 dark:text-green-400">💸 Send payment to owner</p>
          <div className="flex flex-col gap-1.5">
            {hasBkash && (
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                <span className="text-xs font-medium text-pink-600">📱 bKash</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{owner?.bkash_number}</span>
                  <button onClick={() => owner?.bkash_number && copyToClipboard(owner.bkash_number, 'bKash number')} className="text-xs text-gray-400 hover:text-pink-600">Copy</button>
                </div>
              </div>
            )}
            {hasNagad && (
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                <span className="text-xs font-medium text-orange-600">📱 Nagad</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{owner?.nagad_number}</span>
                  <button onClick={() => owner?.nagad_number && copyToClipboard(owner.nagad_number, 'Nagad number')} className="text-xs text-gray-400 hover:text-orange-600">Copy</button>
                </div>
              </div>
            )}
            {owner?.phone && (
              <p className="mt-1 text-[11px] text-gray-400">
                Owner: <a href={`tel:${owner.phone}`} className="text-teal-600 hover:underline">{owner.phone}</a>
              </p>
            )}
          </div>
        </div>
      )}

      {booking.status === 'confirmed' && !hasBkash && !hasNagad && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          🔵 Room held for 24h — contact the owner to pay advance and confirm.
          {owner?.phone && (
            <a href={`tel:${owner.phone}`} className="ml-1 font-medium underline">{owner.phone}</a>
          )}
        </div>
      )}

      <BookingTimeline bookingId={booking.id} />

      {booking.status === 'confirmed' && booking.expires_at && (
        <div className="mt-2">
          <BookingCountdown expiresAt={booking.expires_at} />
          <Link
            href={`/inbox/${booking.rooms?.profiles?.id ?? ''}`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-teal-600 hover:underline dark:text-teal-400"
          >
            💬 Message Owner
          </Link>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
        <p className="text-xs text-gray-400">
          Submitted {new Date(booking.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
        </p>
        <div className="flex items-center gap-3">
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            confirmCancel === booking.id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Cancel?</span>
                <button
                  onClick={() => cancelBooking(booking.id)}
                  disabled={cancelling === booking.id}
                  className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {cancelling === booking.id ? '...' : 'Yes'}
                </button>
                <button onClick={() => setConfirmCancel(null)} className="text-xs text-gray-400 hover:text-gray-600">No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmCancel(booking.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Cancel
              </button>
            )
          )}
          {booking.status === 'active' && (
            <span className="text-xs text-gray-400">Contact owner to cancel</span>
          )}
          <Link
            href={`/listings/${booking.rooms?.id}`}
            className="text-xs text-teal-600 hover:underline dark:text-teal-400"
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  )
}