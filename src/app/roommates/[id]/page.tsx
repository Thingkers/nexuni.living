'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, MapPin, Wallet, MessageCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { computeMatchScore } from '@/features/roommates/matching'
import ReportRoommateProfileButton from '@/features/roommates/components/ReportRoommateProfileButton'
import type { RoommateProfile } from '@/features/roommates/types'

const EntityDetailMap = dynamic(
  () => import('@/features/map/components/EntityDetailMap'),
  { ssr: false },
)

// See src/app/roommates/page.tsx for why `university_id` must be explicit.
const ROOMMATE_SELECT = '*, profiles(full_name, avatar_url, is_verified), universities!university_id(name, slug), localities(name, slug, lat, lng)'

const HABIT_LABELS: Record<string, string> = {
  early_bird: 'Early bird', night_owl: 'Night owl', flexible: 'Flexible',
  relaxed: 'Relaxed', moderate: 'Moderate', very_clean: 'Very clean',
  smoker: 'Smoker', non_smoker: 'Non-smoker',
  rarely: 'Rarely', sometimes: 'Sometimes', often: 'Often',
  male: 'Male', female: 'Female', any: 'Any',
}

// Client component, same reasoning as /roommates — roommate_profiles SELECT
// is RLS-gated on auth.uid(), so this can't be an anon-SSR page like
// /universities/[slug].
export default function RoommateDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null)
  const [profile, setProfile] = useState<RoommateProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null
      setCurrentUserId(uid)

      const [{ data: target }, { data: profileRow }, { data: own }] = await Promise.all([
        supabase.from('roommate_profiles').select(ROOMMATE_SELECT).eq('id', params.id).maybeSingle(),
        uid
          ? supabase.from('profiles').select('verification_status').eq('id', uid).maybeSingle()
          : Promise.resolve({ data: null }),
        uid
          ? supabase.from('roommate_profiles').select(ROOMMATE_SELECT).eq('user_id', uid).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      if (!target) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setProfile(target as RoommateProfile)
      setIsVerified(profileRow?.verification_status === 'approved')
      setMyProfile((own ?? null) as RoommateProfile | null)

      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 animate-pulse">
        <div className="mb-4 h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="mb-2 h-5 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-1/4 rounded bg-gray-100 dark:bg-gray-800" />
      </main>
    )
  }

  if (notFound || !profile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Profile not found.</p>
        <Link href="/roommates" className="mt-3 inline-block text-sm text-teal-600 underline">Back to board</Link>
      </main>
    )
  }

  const initials =
    profile.profiles?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'
  const matchScore = myProfile ? computeMatchScore(myProfile, profile) : null
  const isOwnProfile = currentUserId === profile.user_id
  const canMessage = currentUserId && !isOwnProfile && isVerified

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-2xl font-semibold text-teal-700 ring-2 ring-teal-50 dark:bg-teal-900/30 dark:text-teal-400 dark:ring-teal-900/40">
            {profile.profiles?.avatar_url
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
              : initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{profile.profiles?.full_name || 'Student'}</h1>
            {profile.universities && (
              <p className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                {profile.universities.name}
              </p>
            )}
          </div>
          {matchScore != null && (
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{matchScore}%</p>
              <p className="text-[10px] text-gray-400">match</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.localities && (
            <span className="flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
              <MapPin className="h-3.5 w-3.5" /> {profile.localities.name}
            </span>
          )}
          {profile.budget_min != null && profile.budget_max != null && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <Wallet className="h-3.5 w-3.5" />
              ৳{profile.budget_min.toLocaleString('en-US')}–৳{profile.budget_max.toLocaleString('en-US')}
            </span>
          )}
        </div>
      </div>

      {profile.localities?.lat != null && profile.localities?.lng != null && (
        <div className="mb-6 h-56 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700">
          <EntityDetailMap entity={{
            id: profile.id,
            kind: 'roommate',
            title: profile.profiles?.full_name || 'Student',
            latitude: profile.localities.lat,
            longitude: profile.localities.lng,
            href: `/roommates/${profile.id}`,
            locationLabel: profile.localities.name,
            isApproximate: true,
          }} />
        </div>
      )}

      {profile.bio && (
        <div className="mb-6">
          <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">About</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{profile.bio}</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
          <p className="text-xs text-gray-400">Preferred roommate</p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{HABIT_LABELS[profile.preferred_gender ?? ''] ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
          <p className="text-xs text-gray-400">Sleep schedule</p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{HABIT_LABELS[profile.sleep_schedule ?? ''] ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
          <p className="text-xs text-gray-400">Cleanliness</p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{HABIT_LABELS[profile.cleanliness_level ?? ''] ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
          <p className="text-xs text-gray-400">Smoking</p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{HABIT_LABELS[profile.smoking_preference ?? ''] ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
          <p className="text-xs text-gray-400">Guests</p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{HABIT_LABELS[profile.guest_preference ?? ''] ?? '—'}</p>
        </div>
      </div>

      {isOwnProfile ? (
        <Link href="/roommates/new" className="block w-full rounded-xl bg-teal-600 py-3 text-center text-sm font-medium text-white hover:bg-teal-700">
          Edit My Profile
        </Link>
      ) : (
        <div className="flex flex-col gap-2">
          {canMessage && (
            <Link
              href={`/inbox/${profile.user_id}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white hover:bg-teal-700"
            >
              <MessageCircle className="h-4 w-4" /> Message
            </Link>
          )}
          {!currentUserId && (
            <button onClick={() => router.push('/auth/login')} className="rounded-xl border border-gray-200 py-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
              Log in to message
            </button>
          )}
          <ReportRoommateProfileButton roommateProfileId={profile.id} />
        </div>
      )}
    </main>
  )
}
