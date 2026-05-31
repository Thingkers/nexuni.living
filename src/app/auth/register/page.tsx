'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { supabase } from '@/lib/supabase/'

const INITIAL_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
  gender: 'male',
  student_id: '',
}

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null)

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleIdCardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIdCardFile(file)
    setIdCardPreview(URL.createObjectURL(file))
  }

  async function uploadIdCard(userId: string): Promise<string | null> {
    if (!idCardFile) return null

    const ext = idCardFile.name.split('.').pop()
    const path = `${userId}/id-card.${ext}`

    const { error } = await supabase.storage
      .from('student-id-cards')
      .upload(path, idCardFile, { upsert: true })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage
      .from('student-id-cards')
      .getPublicUrl(path)

    return data.publicUrl
  }

  async function handleRegister() {
    setError('')

    // ✅ AIUB email validation
    if (!form.email.endsWith('@student.aiub.edu')) {
      setError('Only AIUB students can register. Please use your xx-xxxxx-x@student.aiub.edu email.')
      return
    }

    if (!form.full_name || !form.email || !form.password || !form.student_id) {
      setError('Please fill in all required fields')
      return
    }

    if (!idCardFile) {
      setError('Please upload your AIUB Student ID card')
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

    // 1. Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Registration failed')
      setLoading(false)
      return
    }

    // 2. Upload ID card
    let idCardUrl: string | null = null
    try {
      idCardUrl = await uploadIdCard(data.user.id)
    } catch (err: any) {
      setError('ID card upload failed: ' + err.message)
      setLoading(false)
      return
    }

    // 3. Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      gender: form.gender,
      university: 'AIUB',
      student_id: form.student_id,
      student_id_card_url: idCardUrl,
      role: 'student',
      verification_status: 'pending',
      is_verified: false,
    })

    setLoading(false)

    if (profileError) {
      setError(profileError.message)
      return
    }

    router.push('/auth/pending')
  }

  const inputClass =
    'rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500'

  return (

    <main className="min-h-screen bg-gray-50 px-4 py-10">

      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        <div className="mb-6 text-center">

          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl">
            🎓
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AIUB Student Register</h1>
          <p className="mt-1 text-sm text-gray-500">Only xx-xxxxx-x@student.aiub.edu email is accepted</p>

        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {/* Full Name */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Full Name *</label>
            <input
              placeholder="Your full name"
              className={inputClass + ' w-full'}
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
            />
          </div>

          {/* AIUB Email */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">AIUB Email *</label>
            <input
              type="email"
              placeholder="xx-xxxxx-x@student.aiub.edu"
              className={inputClass + ' w-full'}
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            {form.email && !form.email.endsWith('@student.aiub.edu') && (
              <p className="mt-1 text-xs text-red-500">Must be xx-xxxxx-x@student.aiub.edu email</p>
            )}
            {form.email && form.email.endsWith('@student.aiub.edu') && (
              <p className="mt-1 text-xs text-green-600">✓ Valid AIUB email</p>
            )}
          </div>

          {/* Student ID */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Student ID *</label>
            <input
              placeholder="e.g. xx-xxxxx-x"
              className={inputClass + ' w-full'}
              value={form.student_id}
              onChange={(e) => updateField('student_id', e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Phone Number</label>
            <input
              placeholder="01XXXXXXXXX"
              className={inputClass + ' w-full'}
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>

          {/* Gender */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Gender</label>
            <select
              className={inputClass + ' w-full'}
              value={form.gender}
              onChange={(e) => updateField('gender', e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* ID Card Upload */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Student ID Card * <span className="text-gray-400">(photo/scan)</span>
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center hover:border-blue-400 hover:bg-blue-50">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIdCardChange}
              />
              {idCardPreview ? (
                <div className="relative h-32 w-full overflow-hidden rounded-lg">
                  <Image src={idCardPreview} alt="ID Card" fill className="object-contain" />
                </div>
              ) : (
                <>
                  <span className="text-2xl">🪪</span>
                  <span className="mt-2 text-sm font-medium text-gray-600">Upload ID Card</span>
                  <span className="text-xs text-gray-400">JPG or PNG</span>
                </>
              )}
            </label>

            {idCardPreview && (
              <button
                type="button"
                onClick={() => { setIdCardFile(null); setIdCardPreview(null) }}
                className="mt-1 text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Password *</label>
            <input
              type="password"
              placeholder="Min 6 characters"
              className={inputClass + ' w-full'}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Confirm Password *</label>
            <input
              type="password"
              placeholder="Repeat password"
              className={inputClass + ' w-full'}
              value={form.confirm_password}
              onChange={(e) => updateField('confirm_password', e.target.value)}
            />
          </div>

          {/* Notice */}
          <div className="rounded-xl bg-yellow-50 px-4 py-3 text-xs text-yellow-700">
            ⏳ After registering, your account will be reviewed by admin. You'll get access once verified.
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register →'}
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
