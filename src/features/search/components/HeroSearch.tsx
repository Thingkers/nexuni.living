'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import SearchSuggestions from '@/features/search/components/SearchSuggestions'

export default function HeroSearch() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  function handleSearch() {
    const value = search.trim()
    if (value) {
      router.push(`/listings?search=${encodeURIComponent(value)}`)
    } else {
      router.push('/listings')
    }
  }

  return (
    <div className="relative mx-auto flex max-w-xl overflow-visible rounded-2xl bg-white/10 p-1.5 backdrop-blur-sm ring-1 ring-white/20 focus-within:ring-white/40">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <input
          type="text"
          placeholder="Search by area, university or room type..."
          className="w-full rounded-xl bg-transparent py-3 pl-10 pr-4 text-sm text-white placeholder-white/50 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <SearchSuggestions
          query={search}
          onSelect={(value) => {
            setSearch(value)
            router.push(`/listings?q=${encodeURIComponent(value)}`)
          }}
        />
      </div>
      <button
        onClick={handleSearch}
        className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 shadow transition hover:bg-teal-50"
      >
        Search
      </button>
    </div>
  )
}
