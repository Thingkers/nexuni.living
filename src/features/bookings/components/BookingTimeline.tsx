'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

type BookingEvent = {
  id: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected'
  message: string | null
  created_at: string
}

type Props = {
  bookingId: string
}

const STATUS_LABEL: Record<BookingEvent['status'], string> = {
  pending: 'Requested',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

export default function BookingTimeline({ bookingId }: Props) {
  const [events, setEvents] = useState<BookingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase
        .from('booking_events')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      setEvents((data ?? []) as BookingEvent[])
      setLoading(false)
    }

    loadEvents()
  }, [bookingId])

  if (loading) {
    return <p className="mt-3 text-xs text-gray-400">Loading timeline...</p>
  }

  if (events.length === 0) {
    return null
  }

  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-3">
      <p className="mb-3 text-xs font-medium text-gray-500">
        Booking Timeline
      </p>

      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              {index !== events.length - 1 && (
                <span className="mt-1 h-full min-h-6 w-px bg-gray-200" />
              )}
            </div>

            <div className="-mt-1">
              <p className="text-xs font-semibold text-gray-800">
                {STATUS_LABEL[event.status]}
              </p>

              {event.message && (
                <p className="text-xs text-gray-500">{event.message}</p>
              )}

              <p className="mt-0.5 text-[11px] text-gray-400">
                {new Date(event.created_at).toLocaleString('en-US')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}