'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Check, CheckCircle2, ClipboardList, Eye, Flag, Hourglass, Pause, Sparkles,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { fetchUserContacts, type UserContact } from '@/lib/adminContacts'

// Mirrors src/app/admin/reports/page.tsx, the room-report screen, so an admin
// who knows one knows the other. The difference is the extra moderation step:
// a room report can be resolved by deleting the room, but a roommate profile
// is a person's own listing, so the equivalent action is pausing it — which is
// reversible from /admin/roommates — rather than destroying it.
type RoommateReport = {
  id: string
  reason: string
  details: string | null
  status: string
  created_at: string
  reporter_id: string

  // full_name only; the email comes from admin_get_user_contacts because
  // `authenticated` cannot read profiles.email (see src/lib/adminContacts.ts).
  profiles: { full_name: string | null } | null

  roommate_profiles: {
    id: string
    status: string
    bio: string | null
    user_id: string
  } | null
}

const STATUS_BADGE: Record<string, string> = {
  reviewed:  'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  dismissed: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  pending:   'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
}

const STATUS_LABEL: Record<string, string> = {
  reviewed:  'Reviewed',
  dismissed: 'Dismissed',
  pending:   'Pending',
}

export default function AdminRoommateReportsPage() {
  const router = useRouter()

  const [reports, setReports]   = useState<RoommateReport[]>([])
  const [contacts, setContacts] = useState<Record<string, UserContact>>({})
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<string | null>(null)
  const [filter, setFilter]     = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    async function loadReports() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/auth/login'); return }

      const { data: me } = await supabase
        .from('profiles').select('role').eq('id', authData.user.id).single()

      if (me?.role !== 'admin') { router.push('/'); return }

      // reporter_id disambiguates the embed: roommate_profile_reports has two
      // paths to profiles — reporter_id directly, and roommate_profile_id ->
      // roommate_profiles.user_id — so an unqualified profiles(...) is
      // ambiguous and PostgREST answers 300 Multiple Choices.
      const { data, error } = await supabase
        .from('roommate_profile_reports')
        .select(`
          id,
          reason,
          details,
          status,
          created_at,
          reporter_id,
          profiles!reporter_id (full_name),
          roommate_profiles (id, status, bio, user_id)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load reports: ' + error.message)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as unknown as RoommateReport[]
      setReports(rows)

      // Both sides of each report: who complained, and who was complained about.
      setContacts(
        await fetchUserContacts(
          rows.flatMap((r) => [r.reporter_id, r.roommate_profiles?.user_id]),
        ),
      )
      setLoading(false)
    }

    loadReports()
  }, [router])

  async function setReportStatus(reportId: string, status: 'reviewed' | 'dismissed') {
    setActing(reportId)
    const { error } = await supabase
      .from('roommate_profile_reports')
      .update({ status })
      .eq('id', reportId)
    setActing(null)

    if (error) { toast.error(error.message); return }

    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)))
    toast.success(status === 'reviewed' ? 'Marked as reviewed' : 'Report dismissed')
  }

  // Pause, not delete. roommate_profiles' DELETE policy is admin-only and
  // permanent (20260805090000); pausing takes the profile out of the public
  // board immediately and can be undone from /admin/roommates if the report
  // turns out to be unfounded. Marking the report reviewed in the same action
  // keeps the queue honest — an admin who acted should not have to remember a
  // second click.
  async function pauseProfile(report: RoommateReport) {
    const profileId = report.roommate_profiles?.id
    if (!profileId) return

    setActing(report.id)
    const { error } = await supabase
      .from('roommate_profiles')
      .update({ status: 'paused' })
      .eq('id', profileId)

    if (error) { setActing(null); toast.error(error.message); return }

    const { error: reportError } = await supabase
      .from('roommate_profile_reports')
      .update({ status: 'reviewed' })
      .eq('id', report.id)
    setActing(null)

    if (reportError) { toast.error(reportError.message); return }

    setReports((prev) =>
      prev.map((r) =>
        r.roommate_profiles?.id === profileId
          ? {
              ...r,
              status: r.id === report.id ? 'reviewed' : r.status,
              roommate_profiles: r.roommate_profiles
                ? { ...r.roommate_profiles, status: 'paused' }
                : null,
            }
          : r,
      ),
    )
    toast.success('Profile paused and report resolved')
  }

  const pendingCount = useMemo(
    () => reports.filter((r) => r.status === 'pending').length,
    [reports],
  )

  const visible = filter === 'pending'
    ? reports.filter((r) => r.status === 'pending')
    : reports

  if (loading) {
    return (
      <div className="page-shell space-y-3 py-10">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400">
          <Flag className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reported Roommate Profiles</h1>
          <p className="text-xs text-gray-400">{reports.length} total · {pendingCount} pending</p>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        {[
          { key: 'pending', label: 'Pending', Icon: Hourglass },
          { key: 'all',     label: 'All',     Icon: ClipboardList },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as 'pending' | 'all')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              filter === tab.key
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'
            }`}
          >
            <tab.Icon className="h-3.5 w-3.5" aria-hidden /> {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
          <Sparkles className="mx-auto mb-2 h-9 w-9 text-teal-400" aria-hidden />
          <p className="text-gray-400">
            {filter === 'pending' ? 'No reports waiting for review' : 'No reports submitted yet'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((report) => {
            const target      = report.roommate_profiles
            const targetOwner = target?.user_id ? contacts[target.user_id] : undefined
            const isBusy      = acting === report.id

            return (
              <div
                key={report.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-red-500 dark:text-red-400">{report.reason}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[report.status] ?? STATUS_BADGE.pending}`}>
                        {STATUS_LABEL[report.status] ?? 'Pending'}
                      </span>
                      {target?.status === 'paused' && (
                        <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                          Profile paused
                        </span>
                      )}
                    </div>

                    {target ? (
                      <Link
                        href={`/roommates/${target.id}`}
                        className="mt-1 block truncate text-base font-semibold text-gray-900 hover:text-teal-600 dark:text-white dark:hover:text-teal-400 sm:text-lg"
                      >
                        {targetOwner?.full_name ?? 'Reported profile'}
                      </Link>
                    ) : (
                      <p className="mt-1 text-base font-semibold text-gray-400 sm:text-lg">
                        Profile already deleted
                      </p>
                    )}

                    {target?.bio && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{target.bio}</p>
                    )}
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
                      {report.profiles?.full_name || 'Unknown user'}
                    </p>
                    <p className="text-xs text-gray-400">{contacts[report.reporter_id]?.email}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {target && (
                      <Link
                        href={`/roommates/${target.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden /> View
                      </Link>
                    )}

                    {report.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => setReportStatus(report.id, 'reviewed')}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                          {isBusy ? '...' : <><Check className="h-3.5 w-3.5" aria-hidden /> Mark Reviewed</>}
                        </button>

                        <button
                          onClick={() => setReportStatus(report.id, 'dismissed')}
                          disabled={isBusy}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                          {isBusy ? '...' : 'Dismiss'}
                        </button>

                        {target && target.status !== 'paused' && (
                          <button
                            onClick={() => pauseProfile(report)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/20"
                          >
                            {isBusy ? '...' : <><Pause className="h-3.5 w-3.5" aria-hidden /> Pause Profile</>}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {report.status === 'reviewed'
                          ? <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Reviewed</>
                          : '— Dismissed'}
                      </span>
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
