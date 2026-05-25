'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReports() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profile?.role !== 'admin') {
        window.location.href = '/'
        return
      }

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
    const { error } = await supabase
      .from('reports')
      .update({ status: 'reviewed' })
      .eq('id', reportId)

    if (!error) {
      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? { ...report, status: 'reviewed' }
            : report,
        ),
      )
    }
  }

  async function deleteListing(roomId?: string) {
    if (!roomId) return

    const confirmed = confirm('Are you sure you want to delete this listing?')

    if (!confirmed) return

    const { error } = await supabase.from('rooms').delete().eq('id', roomId)

    if (!error) {
      setReports((prev) =>
        prev.map((report) =>
          report.rooms?.id === roomId
            ? { ...report, rooms: null, status: 'reviewed' }
            : report,
        ),
      )
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-gray-400">Loading reports...</p>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Reported Listings
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Total reports: {reports.length}
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <p className="text-gray-400">No reports submitted yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-gray-100 bg-white p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-red-500">
                      {report.reason}
                    </p>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        report.status === 'reviewed'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {report.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                    </span>
                  </div>

                  <Link
                    href={`/listings/${report.rooms?.id}`}
                    className="mt-1 block text-lg font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {report.rooms?.title || 'Deleted room'}
                  </Link>
                </div>

                <span className="text-xs text-gray-400">
                  {new Date(report.created_at).toLocaleString()}
                </span>
              </div>

              {report.details && (
                <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                  {report.details}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div>
                  <p className="text-xs text-gray-400">Reported by</p>

                  <p className="text-sm font-medium text-gray-700">
                    {report.profiles?.full_name || 'Unknown User'}
                  </p>

                  <p className="text-xs text-gray-400">
                    {report.profiles?.email}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => markReviewed(report.id)}
                    disabled={report.status === 'reviewed'}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {report.status === 'reviewed'
                      ? 'Reviewed'
                      : 'Mark Reviewed'}
                  </button>

                  <button
                    onClick={() => deleteListing(report.rooms?.id)}
                    disabled={!report.rooms?.id}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete Listing
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}