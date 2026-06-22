'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'

type Report = {
  id: string
  reason: string
  details: string | null
  status: string
  created_at: string

  rooms: {
    id: string
    title: string
  } | null

  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    async function loadReports() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profile?.role !== 'admin') { router.push('/'); return }

      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          reason,
          details,
          status,
          created_at,

          rooms (
            id,
            title
          ),

          profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setReports(data as any)
      }

      setLoading(false)
    }

    loadReports()
  }, [])

  async function markReviewed(reportId: string) {
    setActing(reportId)
    const { error } = await supabase
      .from('reports')
      .update({ status: 'reviewed' })
      .eq('id', reportId)

    if (error) {
      toast.error(error.message)
    } else {
      setReports((prev) =>
        prev.map((r) => r.id === reportId ? { ...r, status: 'reviewed' } : r),
      )
      toast.success('Marked as reviewed')
    }
    setActing(null)
  }

  async function deleteListing(reportId: string, roomId?: string) {
    if (!roomId) return
    const confirmed = window.confirm('Delete this listing permanently?')
    if (!confirmed) return

    setActing(reportId)
    const { error } = await supabase.from('rooms').delete().eq('id', roomId)

    if (error) {
      toast.error(error.message)
    } else {
      setReports((prev) =>
        prev.map((r) =>
          r.rooms?.id === roomId ? { ...r, rooms: null, status: 'reviewed' } : r,
        ),
      )
      toast.success('Listing deleted and report resolved')
    }
    setActing(null)
  }

  async function dismissReport(reportId: string) {
    setActing(reportId)
    const { error } = await supabase
      .from('reports')
      .update({ status: 'dismissed' })
      .eq('id', reportId)

    if (error) {
      toast.error(error.message)
    } else {
      setReports((prev) =>
        prev.map((r) => r.id === reportId ? { ...r, status: 'dismissed' } : r),
      )
      toast.success('Report dismissed')
    }
    setActing(null)
  }

  const filteredReports = filter === 'pending'
    ? reports.filter((r) => r.status === 'pending')
    : reports

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-gray-400">Loading reports...</p>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reported Listings</h1>
          <p className="mt-1 text-sm text-gray-400">Total: {reports.length} · Pending: {reports.filter((r) => r.status === 'pending').length}</p>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        {[
          { key: 'pending', label: '⏳ Pending' },
          { key: 'all',     label: '📋 All' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as 'pending' | 'all')}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              filter === tab.key
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-4xl mb-2">🧹</p>
          <p className="text-gray-400">No reports submitted yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-red-500 dark:text-red-400">
                      {report.reason}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      report.status === 'reviewed'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {report.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                    </span>
                  </div>

                  <Link
                    href={`/listings/${report.rooms?.id}`}
                    className="mt-1 block truncate text-base font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 sm:text-lg"
                  >
                    {report.rooms?.title || 'Deleted room'}
                  </Link>
                </div>

                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(report.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {report.details && (
                <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  {report.details}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-gray-400">Reported by</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {report.profiles?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-400">{report.profiles?.email}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={() => markReviewed(report.id)}
                        disabled={acting === report.id}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        {acting === report.id ? '...' : '✓ Mark Reviewed'}
                      </button>
                      <button
                        onClick={() => dismissReport(report.id)}
                        disabled={acting === report.id}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-700"
                      >
                        {acting === report.id ? '...' : 'Dismiss'}
                      </button>
                      <button
                        onClick={() => deleteListing(report.id, report.rooms?.id)}
                        disabled={!report.rooms?.id || acting === report.id}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        {acting === report.id ? '...' : 'Delete Listing'}
                      </button>
                    </>
                  )}
                  {report.status !== 'pending' && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {report.status === 'reviewed' ? '✓ Reviewed' : '— Dismissed'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}