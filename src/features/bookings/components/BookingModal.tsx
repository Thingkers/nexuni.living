'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Room } from '@/features/rooms/types/room.types'
import { isSharedRoom } from '@/features/rooms/types/room.types'

type Props = {
  room: Room
  userId: string
  onClose: () => void
  onSuccess?: () => void
}

// Minimal shape we need from room.profiles (the room owner) here — narrows
// the dynamic join result instead of reaching for `any`.
type RoomOwner = {
  email?: string | null
  full_name?: string | null
}

export default function BookingModal({ room, userId, onClose, onSuccess }: Props) {
  const [moveInDate, setMoveInDate] = useState('')
  const [message, setMessage] = useState('')
  const [seats, setSeats] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const shared = isSharedRoom(room.type)
  const maxSeats = room.available_seats ?? 1

  const rentPerSeat = room.rent
  const electricity = room.electricity_bill ?? 0
  const maid = room.maid_bill ?? 0
  const other = room.other_bill ?? 0
  const totalAdditional = electricity + maid + other
  const totalRent = (shared ? rentPerSeat * seats : rentPerSeat) + totalAdditional

  async function handleSubmit() {
    setError('')

    if (!moveInDate) {
      setError('Please select your move-in date')
      return
    }

    setLoading(true)

    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingBooking) {
      setError('You already have a pending booking request for this room')
      setLoading(false)
      return
    }

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        room_id: room.id,
        user_id: userId,
        move_in_date: moveInDate,
        message,
        status: 'pending',
        seats: shared ? seats : 1,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    setLoading(false)

    if (bookingError) {
      // 23505 = unique violation from bookings_one_pending_per_user_room —
      // the DB-level backstop for two quick clicks / two tabs racing past
      // the pre-check above.
      toast.error(
        bookingError.code === '23505'
          ? 'You already have a pending booking request for this room'
          : bookingError.message,
      )
      return
    }

    onSuccess?.()
    onClose()

    // Notify owner via email — server resolves the owner's address and
    // renders the template itself from the booking record; the client only
    // supplies the booking id.
    const owner = room.profiles as RoomOwner | null | undefined
    if (owner?.email && newBooking?.id) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ type: 'new-booking-request', bookingId: newBooking.id }),
        }).catch(() => {}) // best-effort notification — the booking itself already succeeded
      }
    }

    toast.success('Booking request sent!')
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 dark:border dark:border-gray-700">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Request Booking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{room.title}</p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {/* Seat selector — only for shared rooms */}
          {shared && maxSeats > 1 && (
            <div>
              <label className="mb-2 block text-xs text-gray-500 dark:text-gray-400">
                How many seats? (max {maxSeats} available)
              </label>
              <div className="flex gap-2">
                {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeats(n)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors ${
                      seats === n
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-teal-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price breakdown */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">💰 Price Breakdown</p>
            <div className="flex flex-col gap-1 text-sm">
              {shared ? (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Rent ({seats} seat{seats > 1 ? 's' : ''} × ৳{rentPerSeat.toLocaleString('en-US')})</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">৳{(rentPerSeat * seats).toLocaleString('en-US')}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Rent</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">৳{rentPerSeat.toLocaleString('en-US')}</span>
                </div>
              )}

              {electricity > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">💡 Electricity bill</span>
                  <span className="text-gray-500 dark:text-gray-400">৳{electricity.toLocaleString('en-US')}</span>
                </div>
              )}
              {maid > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">🧹 Maid bill</span>
                  <span className="text-gray-500 dark:text-gray-400">৳{maid.toLocaleString('en-US')}</span>
                </div>
              )}
              {other > 0 && room.other_bill_label && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">➕ {room.other_bill_label}</span>
                  <span className="text-gray-500 dark:text-gray-400">৳{other.toLocaleString('en-US')}</span>
                </div>
              )}

              {totalAdditional > 0 && (
                <div className="my-1 border-t border-gray-200 dark:border-gray-600" />
              )}
              <div className="flex justify-between">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Total / month</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">৳{totalRent.toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Move-in Date *</label>
            <input
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Message (optional)</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a short message to the owner..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}