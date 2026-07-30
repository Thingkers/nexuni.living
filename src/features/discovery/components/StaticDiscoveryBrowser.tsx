'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Grid2X2, ListFilter, Map as MapIcon, Search, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import BookCard from '@/features/discovery/components/BookCard'
import ServiceCard from '@/features/discovery/components/ServiceCard'
import JobCard from '@/features/discovery/components/JobCard'
import type { LocalizedDiscoveryItem } from '@/features/discovery/types'
import type { MapEntity } from '@/features/map/types'
import BrandedPreloader from '@/components/ui/BrandedPreloader'

const EntityMap = dynamic(() => import('@/features/map/components/EntityMap'), {
  ssr: false,
  loading: () => <BrandedPreloader fullScreen={false} label="Preparing the map…" />,
})

type ViewMode = 'list' | 'map'
type SortMode = 'featured' | 'price-low' | 'title'

export default function StaticDiscoveryBrowser({
  items,
}: {
  items: LocalizedDiscoveryItem[]
}) {
  const t = useTranslations('Discovery')
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState(searchParams.get('category') ?? 'all')
  const [area, setArea] = useState(searchParams.get('area') ?? 'all')
  const [sort, setSort] = useState<SortMode>((searchParams.get('sort') as SortMode) || 'featured')
  const [view, setView] = useState<ViewMode>(searchParams.get('view') === 'map' ? 'map' : 'list')

  const categories = useMemo(
    () => [...new Map(items.map((item) => [item.category, item.categoryLabel])).entries()],
    [items],
  )
  const areas = useMemo(
    () => [...new Set(items.map((item) => item.area))],
    [items],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items
      .filter((item) => !normalizedQuery || item.searchText.includes(normalizedQuery))
      .filter((item) => category === 'all' || item.category === category)
      .filter((item) => area === 'all' || item.area === area)
      .sort((a, b) => {
        if (sort === 'price-low') return (a.priceBdt ?? Number.MAX_SAFE_INTEGER) - (b.priceBdt ?? Number.MAX_SAFE_INTEGER)
        if (sort === 'title') return a.title.localeCompare(b.title)
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      })
  }, [area, category, items, query, sort])

  const mapEntities = useMemo<MapEntity[]>(() => filteredItems.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    latitude: item.location.latitude,
    longitude: item.location.longitude,
    href: `/${item.kind === 'book' ? 'books' : item.kind === 'service' ? 'services' : 'jobs'}/${item.slug}`,
    locationLabel: `${item.area} · ${item.campus}`,
    priceLabel: item.priceLabel,
    statusLabel: item.categoryLabel,
    isApproximate: item.location.approximate,
  })), [filteredItems])

  function syncUrl(next: Partial<{
    q: string
    category: string
    area: string
    sort: SortMode
    view: ViewMode
  }>) {
    const values = { q: query, category, area, sort, view, ...next }
    const params = new URLSearchParams()
    if (values.q) params.set('q', values.q)
    if (values.category !== 'all') params.set('category', values.category)
    if (values.area !== 'all') params.set('area', values.area)
    if (values.sort !== 'featured') params.set('sort', values.sort)
    if (values.view !== 'list') params.set('view', values.view)
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`)
  }

  function reset() {
    setQuery('')
    setCategory('all')
    setArea('all')
    setSort('featured')
    syncUrl({ q: '', category: 'all', area: 'all', sort: 'featured' })
  }

  return (
    <div className="page-shell pb-16">
      <div className="sticky top-[68px] z-30 -mx-4 border-y border-slate-200/80 bg-[#eef3f1]/95 px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                syncUrl({ q: event.target.value })
              }}
              placeholder={t('searchPlaceholder')}
              className="h-12 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-3 xl:flex">
            <label className="relative">
              <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value)
                  syncUrl({ category: event.target.value })
                }}
                className="h-12 w-full appearance-none rounded-full border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 xl:w-44"
              >
                <option value="all">{t('allCategories')}</option>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <select
              value={area}
              onChange={(event) => {
                setArea(event.target.value)
                syncUrl({ area: event.target.value })
              }}
              className="h-12 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 xl:w-44"
            >
              <option value="all">{t('allAreas')}</option>
              {areas.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>

            <label className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={sort}
                onChange={(event) => {
                  const value = event.target.value as SortMode
                  setSort(value)
                  syncUrl({ sort: value })
                }}
                className="h-12 w-full appearance-none rounded-full border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 xl:w-40"
              >
                <option value="featured">{t('sortFeatured')}</option>
                <option value="price-low">{t('sortPrice')}</option>
                <option value="title">{t('sortTitle')}</option>
              </select>
            </label>
          </div>

          <div className="flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            {([
              { value: 'list', label: t('listView'), Icon: Grid2X2 },
              { value: 'map', label: t('mapView'), Icon: MapIcon },
            ] as const).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setView(value)
                  syncUrl({ view: value })
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition ${
                  view === value ? 'bg-[#071c19] text-white dark:bg-teal-400 dark:text-slate-950' : 'text-slate-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-7">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('resultCount', { count: filteredItems.length })}
        </p>
        {(query || category !== 'all' || area !== 'all' || sort !== 'featured') && (
          <button type="button" onClick={reset} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
            <X className="h-3.5 w-3.5" />
            {t('clearFilters')}
          </button>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 px-6 py-24 text-center dark:border-slate-700">
          <p className="font-semibold">{t('emptyTitle')}</p>
          <p className="mt-2 text-sm text-slate-500">{t('emptyText')}</p>
          <button type="button" onClick={reset} className="mt-5 rounded-full bg-[#071c19] px-5 py-2.5 text-xs font-bold text-white dark:bg-teal-400 dark:text-slate-950">
            {t('clearFilters')}
          </button>
        </div>
      ) : view === 'map' ? (
        <div className="h-[min(680px,72dvh)] overflow-hidden rounded-[28px] border border-slate-200 shadow-sm dark:border-slate-700">
          <EntityMap entities={mapEntities} nearbyControl={false} />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredItems.map((item) => {
            if (item.kind === 'book') return <BookCard key={item.id} item={item} />
            if (item.kind === 'service') return <ServiceCard key={item.id} item={item} />
            return <JobCard key={item.id} item={item} />
          })}
        </div>
      )}
    </div>
  )
}
