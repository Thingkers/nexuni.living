'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

type UserProfile = {
  id: string
  full_name: string | null
  email: string | null
  university: string | null
  role: string | null
  is_verified: boolean | null
}

export default function AdminUsersPage() {
  const router = useRouter()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.push('/auth/login')
        return
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (me?.role !== 'admin') {
        router.push('/')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          university,
          role,
          is_verified
        `)
        .order('created_at', { ascending: false })

      setUsers((data ?? []) as UserProfile[])
      setLoading(false)
    }

    loadUsers()
  }, [router])

  async function toggleVerify(userId: string, current: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: !current,
      })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, is_verified: !current }
            : user,
        ),
      )
    }
  }

  async function toggleAdmin(userId: string, currentRole: string | null) {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin'

    const { error } = await supabase
      .from('profiles')
      .update({
        role: nextRole,
      })
      .eq('id', userId)

    if (!error) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, role: nextRole }
            : user,
        ),
      )
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-gray-400">
          Loading users...
        </p>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Users Management
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Total users: {users.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  User
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  University
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Role
                </th>

                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Verified
                </th>

                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-50"
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.full_name || 'Unknown User'}
                      </p>

                      <p className="text-xs text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-600">
                    {user.university || 'Not added'}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {user.role || 'user'}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {user.is_verified ? (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600">
                        Verified
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                        Unverified
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          toggleVerify(
                            user.id,
                            !!user.is_verified,
                          )
                        }
                        className="rounded-xl border border-blue-200 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        {user.is_verified
                          ? 'Remove Verify'
                          : 'Verify'}
                      </button>

                      <button
                        onClick={() =>
                          toggleAdmin(
                            user.id,
                            user.role,
                          )
                        }
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                      >
                        {user.role === 'admin'
                          ? 'Remove Admin'
                          : 'Make Admin'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}