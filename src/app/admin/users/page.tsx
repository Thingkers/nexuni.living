'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'

type UserProfile = {
  id: string
  full_name: string | null
  email: string | null
  university: string | null
  role: string | null
  is_verified: boolean | null
  verification_status: string | null
  student_id: string | null
  student_id_card_url: string | null
  created_at: string | null
}

export default function AdminUsersPage() {
  const router = useRouter()

  const PAGE_SIZE = 50

  const [users, setUsers]           = useState<UserProfile[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]       = useState(false)
  const [page, setPage]             = useState(0)
  const [activeTab, setActiveTab]   = useState<'pending' | 'all'>('pending')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
  async function loadUsers() {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { router.push('/auth/login'); return }

    const { data: me } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (me?.role !== 'admin') { router.push('/'); return }

    const { data } = await supabase
      .rpc('admin_list_profiles', { p_limit: PAGE_SIZE, p_offset: 0 })

    const result = (data ?? []) as UserProfile[]
    setUsers(result)
    setHasMore(result.length === PAGE_SIZE)
    setLoading(false)
  }

  loadUsers()
}, [router])

  async function loadMore() {
    setLoadingMore(true)
    const nextPage = page + 1
    const from = nextPage * PAGE_SIZE
    const { data } = await supabase
      .rpc('admin_list_profiles', { p_limit: PAGE_SIZE, p_offset: from })

    const result = (data ?? []) as UserProfile[]
    setUsers((prev) => [...prev, ...result])
    setHasMore(result.length === PAGE_SIZE)
    setPage(nextPage)
    setLoadingMore(false)
  }

  async function adminAction(
    userId: string,
    action: 'approve' | 'reject' | 'toggle-verify' | 'toggle-admin',
    optimisticUpdate: (u: UserProfile) => UserProfile,
  ) {
    setActionLoading(userId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { setActionLoading(null); return }

    const res = await fetch('/api/admin/update-user', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, action }),
    })

    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? optimisticUpdate(u) : u))
    } else {
      const data = await res.json()
      toast.error(data.error || 'Action failed')
    }
    setActionLoading(null)
  }

  function approveUser(userId: string) {
    return adminAction(userId, 'approve', (u) => ({ ...u, verification_status: 'approved', is_verified: true }))
  }

  function rejectUser(userId: string) {
    return adminAction(userId, 'reject', (u) => ({ ...u, verification_status: 'rejected', is_verified: false }))
  }

  function toggleVerify(userId: string, current: boolean) {
    return adminAction(userId, 'toggle-verify', (u) => ({
      ...u,
      is_verified: !current,
      verification_status: !current ? 'approved' : 'pending',
    }))
  }

  function toggleAdmin(userId: string, currentRole: string | null) {
    return adminAction(userId, 'toggle-admin', (u) => ({
      ...u,
      role: currentRole === 'admin' ? 'student' : 'admin',
    }))
  }

  async function deleteUser(userId: string) {
    const confirmed = window.confirm('This will permanently delete the user. They will be able to register again with correct info.')
    if (!confirmed) return

    setActionLoading(userId)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ userId }),
    })

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success('User deleted successfully')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Delete failed')
    }

    setActionLoading(null)
  }



  const pendingUsers = users.filter((u) => u.verification_status === 'pending')
  const allUsers     = users

  if (loading) {
    return (
      <div className="page-shell py-10">
        <p className="text-sm text-gray-400">Loading users...</p>
      </div>
    )
  }

  return (
    <main className="page-shell py-8">

      {/* ID Card Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-[80vh] max-w-lg w-full overflow-hidden rounded-2xl bg-white p-2 dark:bg-gray-900">
            <Image
              src={previewUrl}
              alt="Student ID Card"
              width={600}
              height={400}
              className="h-auto w-full rounded-xl object-contain"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Users Management</h1>
          <p className="mt-1 text-sm text-gray-400">Total: {users.length} users</p>
        </div>

        {pendingUsers.length > 0 && (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            ⏳ {pendingUsers.length} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex rounded-xl border border-gray-200 p-1 w-fit gap-1 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('pending')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          ⏳ Pending ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-teal-600 text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          👥 All Users ({allUsers.length})
        </button>
      </div>

      {/* PENDING TAB */}
      {activeTab === 'pending' && (
        <>
          {pendingUsers.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm text-gray-400">No pending verifications</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-yellow-100 bg-white p-5 shadow-sm dark:border-yellow-900/30 dark:bg-gray-800">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Student ID: <span className="font-medium text-gray-700 dark:text-gray-300">{user.student_id || 'Not provided'}</span>
                      </p>
                      {user.created_at && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Registered: {new Date(user.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
                      Pending
                    </span>
                  </div>

                  {/* ID Card */}
                  {user.student_id_card_url ? (
                    <button
                      onClick={() => setPreviewUrl(user.student_id_card_url!)}
                      className="mb-4 w-full overflow-hidden rounded-xl border border-gray-200 hover:border-teal-400 dark:border-gray-700"
                    >
                      <div className="relative h-36 w-full bg-gray-50 dark:bg-gray-700">
                        <Image
                          src={user.student_id_card_url}
                          alt="ID Card"
                          fill
                          className="object-contain"
                        />
                        <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                            Click to enlarge
                          </span>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="mb-4 flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-700">
                      No ID card uploaded
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveUser(user.id)}
                      disabled={actionLoading === user.id}
                      className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === user.id ? '...' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => rejectUser(user.id)}
                      disabled={actionLoading === user.id}
                      className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      {actionLoading === user.id ? '...' : '✕ Reject'}
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      disabled={actionLoading === user.id}
                      className="rounded-xl bg-red-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ALL USERS TAB — card list (no table, works on all screen sizes) */}
      {activeTab === 'all' && (
        <div className="flex flex-col gap-3">
          {allUsers.map((user) => (
            <div key={user.id} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                {/* User info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name || 'Unknown'}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.verification_status === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : user.verification_status === 'rejected'
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {user.verification_status === 'approved' ? '✓ Verified'
                        : user.verification_status === 'rejected' ? '✕ Rejected'
                        : '⏳ Pending'}
                    </span>
                    {user.role === 'admin' && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{user.email}</p>
                  {user.student_id && (
                    <p className="mt-0.5 text-xs text-gray-400">ID: {user.student_id}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {user.student_id_card_url && (
                    <button
                      onClick={() => setPreviewUrl(user.student_id_card_url!)}
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      🪪 ID Card
                    </button>
                  )}

                  <button
                    onClick={() => toggleVerify(user.id, !!user.is_verified)}
                    className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/20"
                  >
                    {user.is_verified ? 'Unverify' : 'Verify'}
                  </button>

                  <button
                    onClick={() => toggleAdmin(user.id, user.role)}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  </button>

                  {user.verification_status === 'rejected' && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      disabled={actionLoading === user.id}
                      className="rounded-xl bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === user.id ? '...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'all' && hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </main>
  )
}
