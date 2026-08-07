'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { IdCard, Eye, EyeOff } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'
import { supabase } from '@/lib/supabase/'
import { UniversityCombobox } from '@/features/universities/components/UniversityCombobox'

const INITIAL_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
  gender: 'male',
  student_id: '',
  university: '',
  university_id: null as string | null,
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' }
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-yellow-400' }
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-teal-500' }
  return { score: 4, label: 'Strong', color: 'bg-green-500' }
}

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordStrength = getPasswordStrength(form.password)

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleIdCardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const compressed = await compressImage(file)
    setIdCardFile(compressed)
    setIdCardPreview(URL.createObjectURL(compressed))
  }

  // Returns the storage path, not a URL. The bucket is private as of
  // supabase/migrations/20260806123000_private_student_id_cards_bucket.sql,
  // so there is no public URL to hand out any more — admins read the card
  // through a short-lived signed URL minted by /api/admin/student-id-card.
  //
  // The filename is random rather than the old fixed `id-card.<ext>`: with a
  // constant name, knowing a user's uuid (anon-readable from /rest/v1/profiles)
  // was enough to construct the exact object path. That mattered when the
  // bucket was public and it still removes a guessable identifier now.
  // compressImage() always re-encodes to webp, so the extension is fixed.
  async function uploadIdCard(userId: string): Promise<string | null> {
    if (!idCardFile) return null

    const path = `${userId}/${crypto.randomUUID()}.webp`

    const { error } = await supabase.storage
      .from('student-id-cards')
      .upload(path, idCardFile, { contentType: 'image/webp' })

    if (error) throw new Error(error.message)

    return path
  }

  async function handleRegister() {
    setError('')

    if (!form.full_name || !form.email || !form.password || !form.student_id) {
      setError('Please fill in all required fields')
      return
    }

    if (!idCardFile) {
      setError('Please upload your Student ID card')
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

    const { data: existingStudent } = await supabase
      .from('profiles')
      .select('id')
      .eq('student_id', form.student_id)
      .single()

    if (existingStudent) {
      setError('This Student ID is already registered.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Registration failed')
      setLoading(false)
      return
    }

    let idCardPath: string | null = null
    try {
      idCardPath = await uploadIdCard(data.user.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError('ID card upload failed: ' + message)
      setLoading(false)
      return
    }

    // role / verification_status / is_verified are deliberately NOT sent.
    // They are set by the guard_profiles_privileged_fields_insert trigger
    // (supabase/migrations/20260806120000_guard_profile_privileged_fields_on_insert.sql),
    // and `authenticated` no longer holds an INSERT grant on those columns —
    // sending them would now fail the request outright. Previously the client
    // supplied them, which is what made it possible to self-assign
    // role: 'admin' by calling the REST API directly.
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      gender: form.gender,
      university: form.university || null,
      university_id: form.university_id,
      student_id: form.student_id,
      student_id_card_url: idCardPath,
    })

    setLoading(false)

    if (profileError) {
      setError(profileError.message)
      return
    }

    router.push('/auth/pending')
  }

  const inputClass =
    'rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,.12),transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-slate-900/5 dark:border-gray-800 dark:bg-gray-800 dark:shadow-none">

        <div className="mb-6 text-center">
          <Image
            src="/icon.jpeg"
            alt="nexUni.living"
            width={52}
            height={52}
            priority
            className="mx-auto mb-3 h-[52px] w-[52px] object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Register</h1>
          <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-gray-500 dark:text-gray-400">
            nexUni.living
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Full Name *</label>
            <input
              placeholder="Your full name"
              className={inputClass + ' w-full'}
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Email *</label>
            <input
              type="email"
              placeholder="your@gmail.com"
              className={inputClass + ' w-full'}
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">University</label>
            <UniversityCombobox
              value={form.university_id}
              initialText={form.university}
              className={inputClass + ' w-full'}
              onChange={({ id, name, rawText }) =>
                setForm((prev) => ({ ...prev, university_id: id, university: name ?? rawText }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Student ID *</label>
            <input
              placeholder="e.g. xx-xxxxx-x"
              className={inputClass + ' w-full'}
              value={form.student_id}
              onChange={(e) => updateField('student_id', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Phone Number</label>
            <input
              placeholder="01XXXXXXXXX"
              className={inputClass + ' w-full'}
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Gender</label>
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
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Student ID Card * <span className="text-gray-400 dark:text-gray-500">(photo/scan)</span>
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center hover:border-teal-400 hover:bg-teal-50 dark:border-gray-600 dark:hover:border-teal-500 dark:hover:bg-teal-900/20">
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
                  <IdCard className="h-6 w-6 text-gray-400 dark:text-gray-500" aria-hidden />
                  <span className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">Upload ID Card</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">JPG or PNG</span>
                </>
              )}
            </label>

            {idCardPreview && (
              <button
                type="button"
                onClick={() => { setIdCardFile(null); setIdCardPreview(null) }}
                className="mt-1 text-xs text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                className={inputClass + ' w-full pr-10'}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="h-5.5 w-5.5" aria-hidden /> : <Eye className="h-5.5 w-5.5" aria-hidden />}
              </button>
            </div>

            {/* Password strength bar */}
            {form.password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`mt-1 text-xs ${
                  passwordStrength.score <= 1 ? 'text-red-500' :
                  passwordStrength.score === 2 ? 'text-yellow-500' :
                  passwordStrength.score === 3 ? 'text-teal-500' : 'text-green-600'
                }`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repeat password"
                className={inputClass + ' w-full pr-10'}
                value={form.confirm_password}
                onChange={(e) => updateField('confirm_password', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff className="h-5.5 w-5.5" aria-hidden /> : <Eye className="h-5.5 w-5.5" aria-hidden />}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-yellow-50 px-4 py-3 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
            After registering, your account will be reviewed by admin. You&apos;ll get access once verified.
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register →'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-teal-600 hover:underline dark:text-teal-400">
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}