'use client'

import { addDays, format, isBefore, isSameDay, startOfToday } from 'date-fns'

type Props = {
  availableFrom: string | null
}

export default function AvailabilityCalendar({ availableFrom }: Props) {
  const today = startOfToday()
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index))

  const availableDate = availableFrom ? new Date(availableFrom) : today

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">
        Availability Calendar
      </h3>

      <p className="mb-4 text-xs text-gray-400">
        Green dates are available for move-in.
      </p>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const isAvailable =
            isSameDay(day, availableDate) || !isBefore(day, availableDate)

          return (
            <div
              key={day.toISOString()}
              className={`rounded-xl p-2 text-center text-xs ${
                isAvailable
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-50 text-gray-300'
              }`}
            >
              <p className="font-medium">{format(day, 'EEE')}</p>
              <p>{format(day, 'd')}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}