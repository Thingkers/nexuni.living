'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/'

export default function LoginPage() {
  const router   = useRouter()
  const [loginType, setLoginType] = useState<'email' | 'id'>('email')
  const [email, setEmail]         = useState('')
  const [studentId, setStudentId] = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleLogin() {
    setError('')

    if (loginType === 'email') {
      if (!email || !password) {
        setError('Please enter email and password')
        return
      }
      if (!email.endsWith('@student.aiub.edu')) {
        setError('Only AIUB email (@aiub.edu.bd) is accepted.')
        return
      }
    } else {
      if (!studentId || !password) {
        setError('Please enter Student ID and password')
        return
      }
    }

    setLoading(true)

    let loginEmail = email

    // Student ID দিয়ে login হলে email lookup করতে হবে
    if (loginType === 'id') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('student_id', studentId.trim())
        .single()

      if (!profile?.email) {
        setError('Student ID not found. Please check and try again.')
        setLoading(false)
        return
      }

      loginEmail = profile.email
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (loginError) {
      setError('Invalid credentials. Please try again.')
      setLoading(false)
      return
    }

    // Verification status check
    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('email', loginEmail)
      .single()

    setLoading(false)

    if (profile?.verification_status === 'pending') {
      router.push('/auth/pending')
      return
    }

    router.push('/listings')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        {/* Header */}
        <div className="mb-6 text-center">

          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center">
          <Image
            src="/aiub_logo.png"
            alt="AIUB Logo"
            width={80}
            height={80}
            className="mx-auto"
          />
        </div>
          
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-1 text-sm text-gray-500">AIUB Student Hostel System</p>
        </div>

        {/* Login Type Toggle */}
        <div className="mb-5 flex rounded-xl border border-gray-200 p-1">
          <button
            onClick={() => { setLoginType('email'); setError('') }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              loginType === 'email'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📧 AIUB Email
          </button>
          <button
            onClick={() => { setLoginType('id'); setError('') }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              loginType === 'id'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🪪 Student ID
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {loginType === 'email' ? (
            <div>
              <label className="mb-1 block text-xs text-gray-500">AIUB Email</label>
              <input
                type="email"
                placeholder="xx-xxxxx-x@student.aiub.edu"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Student ID</label>
              <input
                placeholder="e.g. 22-46000-1"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-gray-500">Password</label>
            <input
              type="password"
              placeholder="Your password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login →'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-medium text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
