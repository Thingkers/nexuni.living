'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

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

  const [users, setUsers]           = useState<UserProfile[]>([])
  const [loading, setLoading]       = useState(true)
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
        .from('profiles')
        .select('id, full_name, email, university, role, is_verified, verification_status, student_id, student_id_card_url, created_at')
        .order('created_at', { ascending: false })

      setUsers((data ?? []) as UserProfile[])
      setLoading(false)
    }

    loadUsers()
  }, [router])

  async function approveUser(userId: string) {
    setActionLoading(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: 'approved', is_verified: true })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, verification_status: 'approved', is_verified: true }
            : u,
        ),
      )
    }
    setActionLoading(null)
  }

  async function rejectUser(userId: string) {
    setActionLoading(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: 'rejected', is_verified: false })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, verification_status: 'rejected', is_verified: false }
            : u,
        ),
      )
    }
    setActionLoading(null)
  }

  async function toggleVerify(userId: string, current: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !current, verification_status: !current ? 'approved' : 'pending' })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, is_verified: !current, verification_status: !current ? 'approved' : 'pending' }
            : u,
        ),
      )
    }
  }

  async function toggleAdmin(userId: string, currentRole: string | null) {
    const nextRole = currentRole === 'admin' ? 'student' : 'admin'
    const { error } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, role: nextRole } : u),
      )
    }
  }

  const pendingUsers = users.filter((u) => u.verification_status === 'pending')
  const allUsers     = users

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-gray-400">Loading users...</p>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">

      {/* ID Card Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-[80vh] max-w-lg w-full overflow-hidden rounded-2xl bg-white p-2">
            <Image
              src={previewUrl}
              alt="Student ID Card"
              width={600}
              height={400}
              className="h-auto w-full rounded-xl object-contain"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow text-gray-600 hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users Management</h1>
          <p className="mt-1 text-sm text-gray-400">Total: {users.length} users</p>
        </div>

        {pendingUsers.length > 0 && (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            ⏳ {pendingUsers.length} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex rounded-xl border border-gray-200 p-1 w-fit gap-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⏳ Pending ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          👥 All Users ({allUsers.length})
        </button>
      </div>

      {/* PENDING TAB */}
      {activeTab === 'pending' && (
        <>
          {pendingUsers.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm text-gray-400">No pending verifications</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-yellow-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{user.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Student ID: <span className="font-medium text-gray-700">{user.student_id || 'Not provided'}</span>
                      </p>
                      {user.created_at && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Registered: {new Date(user.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-600">
                      Pending
                    </span>
                  </div>

                  {/* ID Card */}
                  {user.student_id_card_url ? (
                    <button
                      onClick={() => setPreviewUrl(user.student_id_card_url!)}
                      className="mb-4 w-full overflow-hidden rounded-xl border border-gray-200 hover:border-blue-400"
                    >
                      <div className="relative h-36 w-full bg-gray-50">
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
                    <div className="mb-4 flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
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
                      className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {actionLoading === user.id ? '...' : '✕ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ALL USERS TAB */}
      {activeTab === 'all' && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600">
                      {user.student_id || '—'}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.verification_status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : user.verification_status === 'rejected'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {user.verification_status === 'approved' ? '✓ Approved'
                          : user.verification_status === 'rejected' ? '✕ Rejected'
                          : '⏳ Pending'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role || 'student'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {user.student_id_card_url && (
                          <button
                            onClick={() => setPreviewUrl(user.student_id_card_url!)}
                            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            🪪 ID
                          </button>
                        )}
                        <button
                          onClick={() => toggleVerify(user.id, !!user.is_verified)}
                          className="rounded-xl border border-blue-200 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                        >
                          {user.is_verified ? 'Unverify' : 'Verify'}
                        </button>
                        <button
                          onClick={() => toggleAdmin(user.id, user.role)}
                          className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                        >
                          {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
