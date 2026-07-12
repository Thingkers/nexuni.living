'use client'

import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UniversityCombobox } from '@/features/universities/components/UniversityCombobox'
import { useLocalities } from '@/features/localities/hooks/useLocalities'
import type {
  CleanlinessLevel, GuestPreference, PreferredGender,
  RoommateGender, RoommateStatus, SleepSchedule, SmokingPreference,
} from '@/features/roommates/types'

const INITIAL_FORM = {
  bio: '',
  gender: 'male' as RoommateGender,
  age: '',
  university_id: null as string | null,
  locality_id: '',
  budget_min: '',
  budget_max: '',
  preferred_gender: 'any' as PreferredGender,
  preferred_university_id: null as string | null,
  sleep_schedule: 'flexible' as SleepSchedule,
  cleanliness_level: 'moderate' as CleanlinessLevel,
  smoking_preference: 'non_smoker' as SmokingPreference,
  guest_preference: 'sometimes' as GuestPreference,
}

type FormState = typeof INITIAL_FORM

const inputCls = (err?: string) =>
  `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors bg-white dark:bg-gray-800 dark:text-gray-100 ${
    err ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-teal-500 dark:border-gray-700'
  }`

// Only the columns this wizard writes — step-scoped subsets of roommate_profiles.
function basicsPayload(form: FormState) {
  return {
    bio: form.bio || null,
    gender: form.gender,
    age: form.age ? Number(form.age) : null,
    university_id: form.university_id,
    locality_id: form.locality_id || null,
    budget_min: form.budget_min ? Number(form.budget_min) : null,
    budget_max: form.budget_max ? Number(form.budget_max) : null,
  }
}

function preferencesPayload(form: FormState) {
  return {
    preferred_gender: form.preferred_gender,
    preferred_university_id: form.preferred_university_id,
  }
}

function habitsPayload(form: FormState) {
  return {
    sleep_schedule: form.sleep_schedule,
    cleanliness_level: form.cleanliness_level,
    smoking_preference: form.smoking_preference,
    guest_preference: form.guest_preference,
  }
}

// Hand-built like post-room/page.tsx (this repo's only wizard precedent) —
// no shared Wizard/Stepper component exists anywhere in the codebase.
export default function NewRoommateProfilePage() {
  const router = useRouter()
  const { localities } = useLocalities()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [userId, setUserId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(1)

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/auth/login'); return }
      setUserId(userData.user.id)

      // Owner arm of the SELECT policy — resumes an existing draft (or lets
      // the user revisit/edit an already-published profile) regardless of
      // status.
      const { data: existing } = await supabase
        .from('roommate_profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle()

      if (existing) {
        setProfileId(existing.id)
        setForm({
          bio: existing.bio ?? '',
          gender: (existing.gender ?? 'male') as RoommateGender,
          age: existing.age != null ? String(existing.age) : '',
          university_id: existing.university_id,
          locality_id: existing.locality_id ?? '',
          budget_min: existing.budget_min != null ? String(existing.budget_min) : '',
          budget_max: existing.budget_max != null ? String(existing.budget_max) : '',
          preferred_gender: (existing.preferred_gender ?? 'any') as PreferredGender,
          preferred_university_id: existing.preferred_university_id,
          sleep_schedule: (existing.sleep_schedule ?? 'flexible') as SleepSchedule,
          cleanliness_level: (existing.cleanliness_level ?? 'moderate') as CleanlinessLevel,
          smoking_preference: (existing.smoking_preference ?? 'non_smoker') as SmokingPreference,
          guest_preference: (existing.guest_preference ?? 'sometimes') as GuestPreference,
        })
      }
      setLoading(false)
    }
    init()
  }, [router])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e })
  }

  function validateStep1() {
    const e: Record<string, string> = {}
    if (!form.bio.trim()) e.bio = 'A short bio helps others get to know you'
    if (!form.age) e.age = 'Age is required'
    else if (Number(form.age) < 16 || Number(form.age) > 100) e.age = 'Enter a realistic age'
    if (!form.locality_id) e.locality_id = 'Preferred area is required'
    if (!form.budget_min || !form.budget_max) e.budget_min = 'Budget range is required'
    else if (Number(form.budget_min) > Number(form.budget_max)) e.budget_min = 'Min budget must be less than max'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Step 1 → 2: creates the draft row on first Next (upsert on user_id),
  // so progress survives a refresh/new session from here on.
  async function handleStep1Next() {
    if (!validateStep1() || !userId) return
    setSaving(true)

    const { data, error } = await supabase
      .from('roommate_profiles')
      .upsert(
        { user_id: userId, status: 'draft' as RoommateStatus, ...basicsPayload(form) },
        { onConflict: 'user_id' },
      )
      .select('id')
      .single()

    setSaving(false)
    if (error || !data) { toast.error(error?.message ?? 'Failed to save'); return }
    setProfileId(data.id)
    setStep(2)
  }

  async function handleStep2Next() {
    if (!profileId) return
    setSaving(true)
    const { error } = await supabase.from('roommate_profiles').update(preferencesPayload(form)).eq('id', profileId)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setStep(3)
  }

  async function handlePublish() {
    if (!profileId) return
    setSaving(true)
    const { error } = await supabase
      .from('roommate_profiles')
      .update({ ...habitsPayload(form), status: 'active' as RoommateStatus, updated_at: new Date().toISOString() })
      .eq('id', profileId)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Roommate profile published!')
    router.push('/roommates')
  }

  async function handleSaveDraft() {
    if (!profileId) return
    setSaving(true)
    const { error } = await supabase
      .from('roommate_profiles')
      .update({ ...habitsPayload(form), updated_at: new Date().toISOString() })
      .eq('id', profileId)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Draft saved')
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 animate-pulse">
        <div className="mb-2 h-6 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800" />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-white">Create Roommate Profile</h1>
      <p className="mb-4 text-sm text-gray-400">Step {step} of 3</p>

      <div className="mb-8 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-teal-600 transition-all"
          style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
        />
      </div>

      {/* ─── STEP 1: BASICS ─── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Bio *</label>
            <textarea
              rows={3}
              placeholder="Tell potential roommates a bit about yourself..."
              className={inputCls(errors.bio)}
              value={form.bio}
              maxLength={400}
              onChange={(e) => updateField('bio', e.target.value)}
            />
            {errors.bio && <p className="mt-1 text-xs text-red-500">{errors.bio}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Age *</label>
            <input
              type="number"
              min={16}
              max={100}
              className={inputCls(errors.age)}
              value={form.age}
              onChange={(e) => updateField('age', e.target.value)}
            />
            {errors.age && <p className="mt-1 text-xs text-red-500">{errors.age}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Gender</label>
            <select className={inputCls()} value={form.gender} onChange={(e) => updateField('gender', e.target.value as RoommateGender)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">University</label>
            <UniversityCombobox
              value={form.university_id}
              initialText=""
              className={inputCls()}
              onChange={({ id }) => updateField('university_id', id)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Preferred Area *</label>
            <select
              className={inputCls(errors.locality_id)}
              value={form.locality_id}
              onChange={(e) => updateField('locality_id', e.target.value)}
            >
              <option value="">Select an area...</option>
              {localities.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            {errors.locality_id && <p className="mt-1 text-xs text-red-500">{errors.locality_id}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Budget Range (৳/month) *</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                className={inputCls(errors.budget_min)}
                value={form.budget_min}
                onChange={(e) => updateField('budget_min', e.target.value)}
              />
              <input
                type="number"
                placeholder="Max"
                className={inputCls()}
                value={form.budget_max}
                onChange={(e) => updateField('budget_max', e.target.value)}
              />
            </div>
            {errors.budget_min && <p className="mt-1 text-xs text-red-500">{errors.budget_min}</p>}
          </div>

          <button
            onClick={handleStep1Next}
            disabled={saving}
            className="mt-2 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Next: Preferences →'}
          </button>
        </div>
      )}

      {/* ─── STEP 2: PREFERENCES ─── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Preferred Roommate Gender</label>
            <select
              className={inputCls()}
              value={form.preferred_gender}
              onChange={(e) => updateField('preferred_gender', e.target.value as PreferredGender)}
            >
              <option value="any">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Preferred Roommate&apos;s University</label>
            <UniversityCombobox
              value={form.preferred_university_id}
              initialText=""
              className={inputCls()}
              placeholder="Leave blank for no preference"
              onChange={({ id }) => updateField('preferred_university_id', id)}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              ← Back
            </button>
            <button
              onClick={handleStep2Next}
              disabled={saving}
              className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Next: Habits →'}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: HABITS ─── */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Sleep Schedule</label>
            <select className={inputCls()} value={form.sleep_schedule} onChange={(e) => updateField('sleep_schedule', e.target.value as SleepSchedule)}>
              <option value="early_bird">Early Bird</option>
              <option value="night_owl">Night Owl</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Cleanliness Level</label>
            <select className={inputCls()} value={form.cleanliness_level} onChange={(e) => updateField('cleanliness_level', e.target.value as CleanlinessLevel)}>
              <option value="relaxed">Relaxed</option>
              <option value="moderate">Moderate</option>
              <option value="very_clean">Very Clean</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Smoking</label>
            <select className={inputCls()} value={form.smoking_preference} onChange={(e) => updateField('smoking_preference', e.target.value as SmokingPreference)}>
              <option value="non_smoker">Non-smoker</option>
              <option value="smoker">Smoker</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Guests</label>
            <select className={inputCls()} value={form.guest_preference} onChange={(e) => updateField('guest_preference', e.target.value as GuestPreference)}>
              <option value="rarely">Rarely</option>
              <option value="sometimes">Sometimes</option>
              <option value="often">Often</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              ← Back
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Save Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Publishing...' : 'Publish ✓'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
