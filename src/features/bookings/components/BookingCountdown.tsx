'use client'

import { useEffect, useState } from 'react'

type Props = {
  expiresAt: string
}

export default function BookingCountdown({
  expiresAt,
}: Props) {
  const [timeLeft, setTimeLeft] =
    useState('')

  useEffect(() => {
    function updateTimer() {
      const diff =
        new Date(expiresAt).getTime() -
        Date.now()

      if (diff <= 0) {
        setTimeLeft('Expired')
        return
      }

      const hours = Math.floor(
        diff / (1000 * 60 * 60),
      )

      const minutes = Math.floor(
        (diff % (1000 * 60 * 60)) /
          (1000 * 60),
      )

      setTimeLeft(
        `${hours}h ${minutes}m`,
      )
    }

    updateTimer()

    const interval = setInterval(
      updateTimer,
      60000,
    )

    return () =>
      clearInterval(interval)
  }, [expiresAt])

  return (
    <div className="rounded-xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
      ⏳ Seat reserved for {timeLeft}
    </div>
  )
}