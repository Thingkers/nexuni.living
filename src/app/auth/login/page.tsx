'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, IdCard, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/'

export default function LoginPage() {
  const router   = useRouter()
  const [loginType, setLoginType] = useState<'email' | 'id'>('email')
  const [email, setEmail]         = useState('')
  const [studentId, setStudentId] = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin() {
    setError('')

    if (loginType === 'email') {
      if (!email || !password) {
        setError('Please enter email and password')
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

    // Student ID দিয়ে login হলে email lookup করতে হবে — email কলাম anon-এর
    // জন্য readable না, তাই নির্দিষ্ট এই লুকআপের জন্য বানানো RPC ব্যবহার হয়।
    if (loginType === 'id') {
      const { data: foundEmail } = await supabase
        .rpc('get_email_by_student_id', { p_student_id: studentId.trim() })

      if (!foundEmail) {
        setError('Student ID not found. Please check and try again.')
        setLoading(false)
        return
      }

      loginEmail = foundEmail
    }

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (loginError || !loginData.user) {
      setError('Invalid credentials. Please try again.')
      setLoading(false)
      return
    }

    // Verification status check. Filtered by id, not email — `email` is
    // revoked from `authenticated` (see 20260702180000_lock_down_authenticated_
    // sensitive_columns.sql), so filtering on it fails silently and this
    // check never actually fired for pending/rejected users.
    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('id', loginData.user.id)
      .single()

    setLoading(false)

    if (profile?.verification_status === 'rejected') {
      await supabase.auth.signOut()
      setError('Your account has been rejected by admin. Please contact support.')
      return
    }

    if (profile?.verification_status === 'pending') {
      router.push('/auth/pending')
      return
    }

    router.push('/listings')

  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 dark:bg-gray-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,.12),transparent_60%)]" />

      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-slate-900/5 dark:border-gray-800 dark:bg-gray-800 dark:shadow-none">

        {/* Header */}
        <div className="mb-6 text-center">
          <Image
            src="/icon.svg"
            alt="nexUni.living"
            width={52}
            height={52}
            priority
            className="mx-auto mb-3 h-[52px] w-[52px]"
          />

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-gray-500 dark:text-gray-400">
            nexUni.living
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className="mb-5 flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
          <button
            onClick={() => { setLoginType('email'); setError('') }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
              loginType === 'email'
                ? 'bg-teal-600 text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Mail className="h-4 w-4" aria-hidden />
            Email
          </button>
          <button
            onClick={() => { setLoginType('id'); setError('') }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
              loginType === 'id'
                ? 'bg-teal-600 text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <IdCard className="h-4 w-4" aria-hidden />
            Student ID
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {loginType === 'email' ? (
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Email</label>
              <input
                type="email"
                placeholder="your@gmail.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Student ID</label>
              <input
                placeholder="Your university student ID"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
          )}

          <div>

            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Password</label>

            <div className="relative">

              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="h-5.5 w-5.5" aria-hidden /> : <Eye className="h-5.5 w-5.5" aria-hidden />}
              </button>

            </div>

          </div>

          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-teal-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="rounded-xl bg-teal-600 py-3 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login →'}
          </button>

          
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-medium text-teal-600 hover:underline dark:text-teal-400">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
