'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus, X } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { ADMIN_MODULE_KEYS, type AdminModuleKey } from '@/config/modules'

const MODULE_LABELS: Record<AdminModuleKey, string> = {
  books: 'Books',
  services: 'Local Services',
  jobs: 'Jobs',
  transport: 'Transport',
}

type Assignment = {
  user_id: string
  module: AdminModuleKey
  profiles: { full_name: string | null; email: string | null } | null
}

type SearchResult = {
  id: string
  full_name: string | null
  email: string | null
}

export default function ModuleAdminsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [actionUserId, setActionUserId] = useState<string | null>(null)

  async function loadAssignments() {
    const { data, error } = await supabase
      .from('module_admins')
      .select('user_id, module, profiles!user_id(full_name, email)')
      .order('module')

    if (error) console.error('load module_admins failed:', error.message)
    setAssignments((data ?? []) as unknown as Assignment[])
  }

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (me?.role !== 'admin') { router.push('/'); return }

      await loadAssignments()
      setLoading(false)
    }

    init()
  }, [router])

  async function search() {
    const q = query.trim()
    if (!q) { setResults([]); return }

    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10)

    setResults((data ?? []) as SearchResult[])
    setSearching(false)
  }

  function modulesFor(userId: string): Set<AdminModuleKey> {
    return new Set(assignments.filter((a) => a.user_id === userId).map((a) => a.module))
  }

  async function assign(userId: string, module: AdminModuleKey) {
    setActionUserId(userId)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('module_admins')
      .insert({ user_id: userId, module, assigned_by: user?.id ?? null })

    if (error) {
      toast.error(error.message)
    } else {
      await loadAssignments()
      toast.success(`Assigned to ${MODULE_LABELS[module]}`)
    }
    setActionUserId(null)
  }

  async function unassign(userId: string, module: AdminModuleKey) {
    setActionUserId(userId)
    const { error } = await supabase
      .from('module_admins')
      .delete()
      .eq('user_id', userId)
      .eq('module', module)

    if (error) {
      toast.error(error.message)
    } else {
      await loadAssignments()
      toast.success(`Removed from ${MODULE_LABELS[module]}`)
    }
    setActionUserId(null)
  }

  if (loading) {
    return (
      <div className="page-shell py-10">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <main className="page-shell py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Module Admins</h1>
        <p className="mt-1 text-sm text-gray-400">
          Assign a user to manage one vertical (Books, Local Services, Jobs, Transport) without making them a global admin.
        </p>
      </div>

      {/* Search + assign */}
      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search by name or email"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <button
            onClick={search}
            disabled={searching}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {searching ? '...' : 'Search'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="flex flex-col gap-3">
            {results.map((profile) => {
              const assignedModules = modulesFor(profile.id)
              return (
                <div key={profile.id} className="flex flex-col gap-2 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{profile.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{profile.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ADMIN_MODULE_KEYS.map((module) => {
                      const isAssigned = assignedModules.has(module)
                      return (
                        <button
                          key={module}
                          disabled={actionUserId === profile.id}
                          onClick={() => (isAssigned ? unassign(profile.id, module) : assign(profile.id, module))}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                            isAssigned
                              ? 'bg-teal-600 text-white hover:bg-teal-700'
                              : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                        >
                          {isAssigned ? <X className="h-3 w-3" aria-hidden /> : <UserPlus className="h-3 w-3" aria-hidden />}
                          {MODULE_LABELS[module]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Current assignments, grouped by module */}
      <div className="grid gap-4 sm:grid-cols-2">
        {ADMIN_MODULE_KEYS.map((module) => {
          const moduleAssignments = assignments.filter((a) => a.module === module)
          return (
            <div key={module} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{MODULE_LABELS[module]}</h2>
              {moduleAssignments.length === 0 ? (
                <p className="text-xs text-gray-400">No admin assigned yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {moduleAssignments.map((a) => (
                    <div key={a.user_id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{a.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{a.profiles?.email}</p>
                      </div>
                      <button
                        onClick={() => unassign(a.user_id, module)}
                        disabled={actionUserId === a.user_id}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
