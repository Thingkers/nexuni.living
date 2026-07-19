'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Banknote, Search, Building2, Home,
  BedDouble, Key, Bed, UtensilsCrossed, Pencil,
  Eye, Trash2, ToggleLeft, ToggleRight, X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type RoomOwner = {
  full_name: string | null
  email: string | null
}

type AdminRoom = {
  id: string
  title: string
  rent: number
  location_name: string
  status: string
  type: string
  gender_type: string | null
  created_at: string
  profiles: RoomOwner | null
}

// Shape returned directly from Supabase before normalizing `profiles`
// (Supabase can return a joined relation as an object or an array depending on the relationship)
type RawAdminRoom = Omit<AdminRoom, 'profiles'> & {
  profiles: RoomOwner | RoomOwner[] | null
}

const TYPE_TABS = [
  { key: 'all',            label: 'All Rooms' },
  { key: 'mess',           label: 'Mess' },
  { key: 'bachelor',       label: 'Bachelor' },
  { key: 'sublet',         label: 'Sublet' },
  { key: 'single',         label: 'Single' },
  { key: 'master_bedroom', label: 'Master Bed' },
]

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open:    { label: 'Open',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  partial: { label: 'Partial', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  booked:  { label: 'Booked',  cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  closed:  { label: 'Closed',  cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
}

const GENDER_CONFIG: Record<string, { label: string; cls: string }> = {
  male:   { label: 'Male only',   cls: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
  female: { label: 'Female only', cls: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400' },
  any:    { label: 'Any gender',  cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
}

const TYPE_ICON: Record<string, React.ElementType> = {
  mess:           UtensilsCrossed,
  bachelor:       BedDouble,
  sublet:         Key,
  single:         Bed,
  master_bedroom: Home,
}

const TYPE_LABELS: Record<string, string> = {
  mess:           'Mess',
  bachelor:       'Bachelor',
  sublet:         'Sublet',
  single:         'Single Room',
  master_bedroom: 'Master Bedroom',
}

export default function AdminRoomsPage() {
  const router = useRouter()

  const [rooms, setRooms]         = useState<AdminRoom[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch]       = useState('')

  useEffect(() => {
    async function loadRooms() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const { data: me } = await supabase
        .from('profiles').select('role').eq('id', authData.user.id).single()

      if (me?.role !== 'admin') { router.push('/'); return }

      const { data } = await supabase
        .from('rooms')
        .select('id, title, rent, location_name, status, type, gender_type, created_at, profiles(full_name, email)')
        .order('created_at', { ascending: false })

      const clean = ((data ?? []) as unknown as RawAdminRoom[]).map((item) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles,
      })) as AdminRoom[]

      setRooms(clean)
      setLoading(false)
    }
    loadRooms()
  }, [router])

  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? rooms : rooms.filter((r) => r.type === activeTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.location_name ?? '').toLowerCase().includes(q) ||
          (r.profiles?.full_name ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [rooms, activeTab, search])

  const stats = useMemo(() => ({
    total:  rooms.length,
    open:   rooms.filter((r) => r.status === 'open').length,
    closed: rooms.filter((r) => r.status === 'closed' || r.status === 'booked').length,
  }), [rooms])

  async function toggleStatus(roomId: string, current: string) {
    const next = current === 'open' || current === 'partial' ? 'closed' : 'open'
    const { error } = await supabase.from('rooms').update({ status: next }).eq('id', roomId)
    if (!error) setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, status: next } : r))
  }

  async function deleteRoom(roomId: string) {
    if (!confirm('Delete this room permanently?')) return
    const { error } = await supabase.from('rooms').delete().eq('id', roomId)
    if (!error) setRooms((prev) => prev.filter((r) => r.id !== roomId))
  }

  if (loading) {
    return (
      <div className="page-shell space-y-3 py-10">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  return (
    <main className="page-shell py-8">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rooms Management</h1>
            <p className="text-xs text-gray-400">{stats.total} total · {stats.open} open · {stats.closed} closed</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search rooms or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => {
          const count = tab.key === 'all' ? rooms.length : rooms.filter((r) => r.type === tab.key).length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Room list */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-gray-800">
            <Building2 className="h-7 w-7" />
          </div>
          <p className="text-sm text-gray-400">No rooms found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((room) => {
            const TypeIcon = TYPE_ICON[room.type] ?? Home
            const statusCfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.closed
            const genderCfg = room.gender_type ? GENDER_CONFIG[room.gender_type] : null
            const isOpen = room.status === 'open' || room.status === 'partial'

            return (
              <div
                key={room.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  {/* Left info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/listings/${room.id}`}
                        className="font-semibold text-gray-900 hover:text-teal-600 dark:text-white dark:hover:text-teal-400"
                      >
                        {room.title}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
                      {genderCfg && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${genderCfg.cls}`}>
                          {genderCfg.label}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {room.location_name || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Banknote className="h-3 w-3 shrink-0" />
                        ৳{room.rent.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <TypeIcon className="h-3 w-3 shrink-0" />
                        {TYPE_LABELS[room.type] ?? room.type}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">
                        {room.profiles?.full_name ?? 'Unknown owner'}
                      </span>
                      <span>
                        {new Date(room.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/listings/${room.id}`}
                      title="View listing"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-teal-300 hover:text-teal-600 dark:border-gray-700 dark:text-gray-400"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/listings/${room.id}/edit`}
                      title="Edit listing"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => toggleStatus(room.id, room.status)}
                      title={isOpen ? 'Close listing' : 'Reopen listing'}
                      className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
                        isOpen
                          ? 'border-yellow-200 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400'
                          : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400'
                      }`}
                    >
                      {isOpen ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {isOpen ? 'Close' : 'Reopen'}
                    </button>
                    <button
                      onClick={() => deleteRoom(room.id)}
                      title="Delete permanently"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}