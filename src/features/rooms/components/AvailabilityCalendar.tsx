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
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">
        Availability Calendar
      </h3>

      <p className="mb-4 text-xs text-gray-400">
        Green dates are available for move-in.
      </p>

      {/* Legend */}
      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-green-400" />
          <span className="text-xs text-gray-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-gray-200" />
          <span className="text-xs text-gray-500">Not available</span>
        </div>
      </div>

      {/* Mobile: 7 cols with smaller text, Desktop: comfortable */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const isAvailable =
            isSameDay(day, availableDate) || !isBefore(day, availableDate)
          const isToday = isSameDay(day, today)

          return (
            <div
              key={day.toISOString()}
              className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center ${
                isAvailable
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-50 text-gray-300'
              } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
            >
              <p className="text-[10px] sm:text-xs font-medium">
                {format(day, 'EEE')}
              </p>
              <p className="text-[10px] sm:text-xs">
                {format(day, 'd')}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}