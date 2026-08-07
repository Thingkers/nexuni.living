'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, Search } from 'lucide-react'

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
    <div className="relative mx-auto flex max-w-xl items-center overflow-visible rounded-full bg-white p-1.5 pl-5 shadow-xl shadow-teal-950/25 ring-1 ring-black/5 transition-shadow focus-within:shadow-2xl focus-within:shadow-teal-950/30">
      <Search className="pointer-events-none h-4 w-4 shrink-0 text-gray-400" />
      <div className="relative flex-1">
        <input
          type="text"
          placeholder={t('placeholder')}
          className="w-full bg-transparent py-3 pl-3 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none"
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
        aria-label={t('search')}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm transition hover:bg-teal-700"
      >
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
