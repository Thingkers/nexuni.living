'use client'
import { toast } from 'sonner'
import { useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { Room } from '@/features/rooms/types/room.types'

type Props = {
  room: Room
  userId: string
  onClose: () => void
  onSuccess?: () => void
}

export default function BookingModal({ room, userId, onClose, onSuccess }: Props) {
  const [moveInDate, setMoveInDate] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    const { error } = await supabase.from('bookings').insert({
      room_id: room.id,
      user_id: userId,
      move_in_date: moveInDate,
      message,
      status: 'pending',
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    onSuccess?.()
    onClose()
    toast.success('Booking request sent successfully')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">
          Request Booking
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {room.title}
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Move-in Date *
            </label>

            <input
              type="date"
              value={moveInDate}
              onChange={(event) => setMoveInDate(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Message
            </label>

            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write a short message to the owner..."
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}