'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UniversityMultiSelectFilter } from '@/features/universities/components/UniversityMultiSelectFilter'
import { LocalityMultiSelectFilter } from '@/features/localities/components/LocalityMultiSelectFilter'
import RoommateCard from '@/features/roommates/components/RoommateCard'
import { computeMatchScore, passesGenderFilter } from '@/features/roommates/matching'
import type { RoommateGender, RoommateProfile } from '@/features/roommates/types'

// `universities!university_id(...)` disambiguates the embed: roommate_profiles
// has two FKs into universities (university_id, preferred_university_id), so
// an unqualified `universities(...)` is ambiguous and PostgREST returns 300
// Multiple Choices — which the caller's `data ?? []` silently swallowed as
// "no profiles" instead of surfacing an error.
const ROOMMATE_SELECT = '*, profiles(full_name, avatar_url, is_verified), universities!university_id(name, slug), localities(name, slug)'

// Client component, not the /universities/[slug]-style anon-SSR pattern —
// roommate_profiles SELECT is RLS-gated on auth.uid(), so an anon server
// fetch would return nothing for every visitor regardless of who's
// actually browsing. See docs/playbook.md Sprint 4 plan.
export default function RoommatesBoardPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null)
  const [profiles, setProfiles] = useState<RoommateProfile[]>([])
  const [loading, setLoading] = useState(true)

  const [universityIds, setUniversityIds] = useState<string[]>([])
  const [localityIds, setLocalityIds] = useState<string[]>([])
  const [gender, setGender] = useState<'' | RoommateGender>('')
  const [minMatch, setMinMatch] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null
      setUserId(uid)

      const [{ data: active }, { data: own }] = await Promise.all([
        supabase.from('roommate_profiles').select(ROOMMATE_SELECT).eq('status', 'active').order('created_at', { ascending: false }),
        uid
          ? supabase.from('roommate_profiles').select(ROOMMATE_SELECT).eq('user_id', uid).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      setProfiles((active ?? []) as RoommateProfile[])
      setMyProfile((own ?? null) as RoommateProfile | null)
      setLoading(false)
    }
    load()
  }, [])

  const candidates = useMemo(() => {
    let list = profiles.filter((p) => p.user_id !== userId)

    if (universityIds.length > 0) list = list.filter((p) => p.university_id && universityIds.includes(p.university_id))
    if (localityIds.length > 0) list = list.filter((p) => p.locality_id && localityIds.includes(p.locality_id))
    if (gender) list = list.filter((p) => p.gender === gender)
    if (myProfile) list = list.filter((p) => passesGenderFilter(myProfile, p))

    const withScore = list.map((p) => ({
      profile: p,
      score: myProfile ? computeMatchScore(myProfile, p) : undefined,
    }))

    const filtered = myProfile ? withScore.filter((c) => (c.score ?? 0) >= minMatch) : withScore

    filtered.sort((a, b) => {
      if (a.score != null && b.score != null && a.score !== b.score) return b.score - a.score
      return new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime()
    })

    return filtered
  }, [profiles, userId, universityIds, localityIds, gender, minMatch, myProfile])

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Find a Roommate</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Browse verified students looking for roommates</p>
        </div>
        <Link href="/roommates/new" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          {myProfile ? 'Edit My Profile' : '+ Create Profile'}
        </Link>
      </div>

      {!myProfile && userId && (
        <div className="mb-4 rounded-xl bg-teal-50 px-4 py-3 text-xs text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
          💡 Create your own roommate profile to see compatibility % with everyone below.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
        <UniversityMultiSelectFilter selectedIds={universityIds} onChange={setUniversityIds} />
        <LocalityMultiSelectFilter selectedIds={localityIds} onChange={setLocalityIds} />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as '' | RoommateGender)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">Any Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        {myProfile && (
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            Min match: {minMatch}%
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={minMatch}
              onChange={(e) => setMinMatch(Number(e.target.value))}
              className="w-28"
            />
          </label>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 h-11 w-11 rounded-full bg-gray-100 dark:bg-gray-700" />
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
              <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-gray-800">
            <Users className="h-7 w-7" />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">No roommate profiles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map(({ profile, score }) => (
            <RoommateCard key={profile.id} profile={profile} matchScore={score} />
          ))}
        </div>
      )}
    </main>
  )
}
