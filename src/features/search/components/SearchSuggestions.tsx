'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, MapPin, Search as SearchIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizeFilterText } from '@/features/rooms/queries'
import { useUniversities } from '@/features/universities/hooks/useUniversities'
import { useLocalities } from '@/features/localities/hooks/useLocalities'

export type SuggestionResult =
  | { kind: 'university'; id: string; slug: string; name: string }
  | { kind: 'locality'; id: string; slug: string; name: string }
  | { kind: 'room'; value: string }

type Props = {
  query: string
  onSelect: (result: SuggestionResult) => void
}

const UNIVERSITY_LIMIT = 4
const LOCALITY_LIMIT = 4
const ROOM_LIMIT = 6

// Same normalize-then-substring-match approach as UniversityCombobox —
// .normalize('NFC') guards against a real Bangla-input edge case where two
// visually-identical strings differ in Unicode normalization form depending
// on the input method.
function normalize(value: string) {
  return value.normalize('NFC').toLowerCase()
}

export default function SearchSuggestions({ query, onSelect }: Props) {
  const { universities } = useUniversities()
  const { localities } = useLocalities()
  const [roomSuggestions, setRoomSuggestions] = useState<string[]>([])

  // Room titles are a large, frequently-changing table — kept as a
  // debounced network query. Universities/localities are small, fetch-once
  // lists already in memory, so they're matched synchronously below with no
  // debounce needed.
  useEffect(() => {
    const timer = setTimeout(async () => {
      const safeQuery = sanitizeFilterText(query)
      if (safeQuery.length < 2) {
        setRoomSuggestions([])
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

      setRoomSuggestions(items.slice(0, ROOM_LIMIT))
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const needle = normalize(query.trim())

  const universityMatches = needle.length >= 2
    ? universities
        .filter((u) => {
          if (normalize(u.name).includes(needle)) return true
          if (u.name_bn && normalize(u.name_bn).includes(needle)) return true
          return u.aliases.some((alias) => normalize(alias).includes(needle))
        })
        .slice(0, UNIVERSITY_LIMIT)
    : []

  // localities has no aliases column (unlike universities) — matching is
  // limited to name/name_bn.
  const localityMatches = needle.length >= 2
    ? localities
        .filter((l) => {
          if (normalize(l.name).includes(needle)) return true
          return l.name_bn ? normalize(l.name_bn).includes(needle) : false
        })
        .slice(0, LOCALITY_LIMIT)
    : []

  const hasResults = universityMatches.length > 0 || localityMatches.length > 0 || roomSuggestions.length > 0
  if (!hasResults) return null

  return (
    <div className="absolute left-0 right-16 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
      {universityMatches.map((u) => (
        <button
          key={u.id}
          onClick={() => onSelect({ kind: 'university', id: u.id, slug: u.slug, name: u.name })}
          className="flex w-full items-center gap-2 border-b border-gray-50 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <GraduationCap className="h-4 w-4 shrink-0 text-teal-500" />
          {u.name}
        </button>
      ))}
      {localityMatches.map((l) => (
        <button
          key={l.id}
          onClick={() => onSelect({ kind: 'locality', id: l.id, slug: l.slug, name: l.name })}
          className="flex w-full items-center gap-2 border-b border-gray-50 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <MapPin className="h-4 w-4 shrink-0 text-teal-500" />
          {l.name}
        </button>
      ))}
      {roomSuggestions.map((item) => (
        <button
          key={item}
          onClick={() => onSelect({ kind: 'room', value: item })}
          className="flex w-full items-center gap-2 border-b border-gray-50 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-gray-300" />
          {item}
        </button>
      ))}
    </div>
  )
}
