'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'

import SearchSuggestions from '@/features/search/components/SearchSuggestions'

export default function HeroSearch() {
  const router = useRouter()
  const t = useTranslations('HeroSearch')
  const [search, setSearch] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(true)

  function handleSearch() {
    const value = search.trim()
    if (value) {
      router.push(`/listings?search=${encodeURIComponent(value)}`)
    } else {
      router.push('/listings')
    }
  }

  return (
    <div className="relative mx-auto flex max-w-xl overflow-visible rounded-2xl bg-white p-1.5 shadow-xl shadow-teal-950/25 ring-1 ring-black/5 transition-shadow focus-within:shadow-2xl focus-within:shadow-teal-950/30">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t('placeholder')}
          className="w-full rounded-xl bg-transparent py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none"
          value={search}
          onFocus={() => setSuggestionsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value)
            setSuggestionsOpen(true)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        {suggestionsOpen && (
          <SearchSuggestions
            query={search}
            onSelect={(result) => {
              if (result.kind === 'university') {
                router.push(`/universities/${result.slug}`)
              } else if (result.kind === 'locality') {
                router.push(`/areas/${result.slug}`)
              } else {
                setSearch(result.value)
                router.push(`/listings?q=${encodeURIComponent(result.value)}`)
              }
            }}
          />
        )}
      </div>
      <button
        onClick={handleSearch}
        className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
      >
        {t('search')}
      </button>
    </div>
  )
}
