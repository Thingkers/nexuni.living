'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type Item = {
  location_name: string
  count: number
}

export default function PopularLocations() {
  const [locations, setLocations] = useState<Item[]>([])

  useEffect(() => {
    async function loadLocations() {
      const { data } = await supabase
        .from('rooms')
        .select('location_name')

      const grouped: Record<string, number> = {}

      ;(data ?? []).forEach((room) => {
        if (!room.location_name) return

        grouped[room.location_name] =
          (grouped[room.location_name] || 0) + 1
      })

      const sorted = Object.entries(grouped)
        .map(([location_name, count]) => ({
          location_name,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      setLocations(sorted)
    }

    loadLocations()
  }, [])

  if (locations.length === 0) {
    return null
  }

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Popular Areas
        </h2>

        <p className="text-sm text-gray-400">
          Most searched places
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {locations.map((item) => (
          <Link
            key={item.location_name}
            href={`/listings?q=${encodeURIComponent(
              item.location_name,
            )}`}
            className="group rounded-2xl border border-gray-100 bg-white px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
          >
            <p className="font-medium text-gray-900 group-hover:text-teal-600">
              {item.location_name}
            </p>

            <p className="mt-1 text-sm text-gray-400">
              {item.count} rooms
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}