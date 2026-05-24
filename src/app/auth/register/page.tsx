'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { supabase } from '@/lib/supabase/'

const INITIAL_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
  gender: 'male',
  university: '',
  role: 'student',
}

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleRegister() {
    setError('')

    if (!form.full_name || !form.email || !form.password || !form.university) {
      setError('Please fill in all required fields')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Registration failed')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      gender: form.gender,
      university: form.university,
      role: form.role,
      verification_status: 'pending',
    })

    setLoading(false)

    if (profileError) {
      setError(profileError.message)
      return
    }

    router.push('/auth/login')
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Create Account
        </h1>

        <p className="mb-6 text-sm text-gray-500">
          Register to find or post student rooms
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <input
            placeholder="Full Name *"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={form.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
          />

          <input
            type="email"
            placeholder="Email Address *"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />

          <input
            placeholder="Phone Number"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />

          <input
            placeholder="University Name *"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={form.university}
            onChange={(e) => updateField('university', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={form.gender}
              onChange={(e) => updateField('gender', e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <select
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
            >
              <option value="student">Student</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <input
            type="password"
            placeholder="Password *"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password *"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={form.confirm_password}
            onChange={(e) => updateField('confirm_password', e.target.value)}
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className="rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}