'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, GraduationCap, Wallet, Search, Users,
  Eye, Trash2, Play, Pause, Archive, X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type RoommateOwner = {
  full_name: string | null
  email: string | null
}

type NamedRef = { name: string | null }

type AdminRoommate = {
  id: string
  status: string
  bio: string | null
  gender: string | null
  age: number | null
  budget_min: number | null
  budget_max: number | null
  created_at: string
  profiles: RoommateOwner | null
  universities: NamedRef | null
  localities: NamedRef | null
}

// Shape returned directly from Supabase before normalizing joined relations
// (Supabase can return a joined relation as an object or an array depending
// on the relationship) — same pattern as admin/rooms/page.tsx's RawAdminRoom.
type RawAdminRoommate = Omit<AdminRoommate, 'profiles' | 'universities' | 'localities'> & {
  profiles: RoommateOwner | RoommateOwner[] | null
  universities: NamedRef | NamedRef[] | null
  localities: NamedRef | NamedRef[] | null
}

const STATUS_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'paused',   label: 'Paused' },
  { key: 'draft',    label: 'Draft' },
  { key: 'archived', label: 'Archived' },
]

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Active',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused:   { label: 'Paused',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  draft:    { label: 'Draft',    cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  archived: { label: 'Archived', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

function normalize<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function AdminRoommatesPage() {
  const router = useRouter()

  const [profiles, setProfiles]   = useState<AdminRoommate[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch]       = useState('')
  const [busyId, setBusyId]       = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    async function loadRoommates() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const { data: me } = await supabase
        .from('profiles').select('role').eq('id', authData.user.id).single()

      if (me?.role !== 'admin') { router.push('/'); return }

      const { data, error } = await supabase
        .from('roommate_profiles')
        .select('id, status, bio, gender, age, budget_min, budget_max, created_at, profiles(full_name, email), universities!university_id(name), localities(name)')
        .order('created_at', { ascending: false })

      if (error) console.error('admin roommates load failed:', error.message)

      const clean = ((data ?? []) as unknown as RawAdminRoommate[]).map((item) => ({
        ...item,
        profiles: normalize(item.profiles),
        universities: normalize(item.universities),
        localities: normalize(item.localities),
      })) as AdminRoommate[]

      setProfiles(clean)
      setLoading(false)
    }
    loadRoommates()
  }, [router])

  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? profiles : profiles.filter((p) => p.status === activeTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          (p.profiles?.full_name ?? '').toLowerCase().includes(q) ||
          (p.profiles?.email ?? '').toLowerCase().includes(q) ||
          (p.bio ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [profiles, activeTab, search])

  const stats = useMemo(() => ({
    total:  profiles.length,
    active: profiles.filter((p) => p.status === 'active').length,
  }), [profiles])

  async function setStatus(id: string, status: string) {
    setBusyId(id)
    const { error } = await supabase.from('roommate_profiles').update({ status }).eq('id', id)
    setBusyId(null)
    if (error) return
    setProfiles((prev) => prev.map((p) => p.id === id ? { ...p, status } : p))
  }

  async function deleteProfile(id: string) {
    setBusyId(id)
    const { error } = await supabase.from('roommate_profiles').delete().eq('id', id)
    setBusyId(null)
    setConfirmDeleteId(null)
    if (error) return
    setProfiles((prev) => prev.filter((p) => p.id !== id))
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Roommates Management</h1>
            <p className="text-xs text-gray-400">{stats.total} total · {stats.active} active</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, or bio..."
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

      {/* Status filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === 'all' ? profiles.length : profiles.filter((p) => p.status === tab.key).length
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-gray-800">
            <Users className="h-7 w-7" />
          </div>
          <p className="text-sm text-gray-400">No roommate profiles found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((profile) => {
            const statusCfg = STATUS_CONFIG[profile.status] ?? STATUS_CONFIG.draft
            const isBusy = busyId === profile.id

            return (
              <div
                key={profile.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  {/* Left info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/roommates/${profile.id}`}
                        className="font-semibold text-gray-900 hover:text-teal-600 dark:text-white dark:hover:text-teal-400"
                      >
                        {profile.profiles?.full_name ?? 'Unknown user'}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
                      {profile.gender && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          profile.gender === 'male' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400'
                        }`}>
                          {profile.gender === 'male' ? 'Male' : 'Female'}{profile.age ? `, ${profile.age}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">{profile.profiles?.email ?? '—'}</span>
                      {profile.universities?.name && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          {profile.universities.name}
                        </span>
                      )}
                      {profile.localities?.name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {profile.localities.name}
                        </span>
                      )}
                      {profile.budget_min != null && profile.budget_max != null && (
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3 w-3 shrink-0" />
                          ৳{profile.budget_min.toLocaleString()}–৳{profile.budget_max.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {profile.bio && (
                      <p className="mt-1.5 line-clamp-1 text-xs text-gray-400">{profile.bio}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/roommates/${profile.id}`}
                      title="View profile"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-teal-300 hover:text-teal-600 dark:border-gray-700 dark:text-gray-400"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>

                    {profile.status !== 'active' && (
                      <button
                        onClick={() => setStatus(profile.id, 'active')}
                        disabled={isBusy}
                        title="Activate"
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-green-200 px-3 text-xs font-medium text-green-600 transition hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-400"
                      >
                        <Play className="h-3.5 w-3.5" /> Activate
                      </button>
                    )}
                    {profile.status === 'active' && (
                      <button
                        onClick={() => setStatus(profile.id, 'paused')}
                        disabled={isBusy}
                        title="Pause"
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-yellow-200 px-3 text-xs font-medium text-yellow-600 transition hover:bg-yellow-50 disabled:opacity-50 dark:border-yellow-800 dark:text-yellow-400"
                      >
                        <Pause className="h-3.5 w-3.5" /> Pause
                      </button>
                    )}
                    {profile.status !== 'archived' && (
                      <button
                        onClick={() => setStatus(profile.id, 'archived')}
                        disabled={isBusy}
                        title="Archive"
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-500 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                    )}

                    {confirmDeleteId === profile.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteProfile(profile.id)} disabled={isBusy} className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50">{isBusy ? '...' : 'Sure?'}</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(profile.id)}
                        title="Delete permanently"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
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
