'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { sanitizeFilterText } from '@/features/rooms/queries'

type Props = {
  query: string
  onSelect: (value: string) => void
}

export default function SearchSuggestions({ query, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    const timer = setTimeout(async () => {
      const safeQuery = sanitizeFilterText(query)
      if (safeQuery.length < 2) {
        setSuggestions([])
        return
      }

      const { data } = await supabase
        .from('rooms')
        .select('title, location_name')
        .or(`title.ilike.%${safeQuery}%,location_name.ilike.%${safeQuery}%`)
        .limit(8)

      const items = Array.from(
        new Set(
          (data ?? [])
            .flatMap((room) => [room.title, room.location_name])
            .filter(Boolean),
        ),
      ) as string[]

      setSuggestions(items)
    }, 300)  // ✅ debounce

    return () => clearTimeout(timer)
  }, [query])

  if (suggestions.length === 0) return null

  return (
    <div className="absolute left-0 right-16 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
      {suggestions.map((item) => (
        <button
          key={item}
          onClick={() => onSelect(item)}
          className="flex w-full items-center gap-2 border-b border-gray-50 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <span className="text-gray-300">🔍</span>
          {item}
        </button>
      ))}
    </div>
  )
}