import Link from 'next/link'
import { GraduationCap, MapPin, Wallet } from 'lucide-react'
import type { RoommateProfile } from '@/features/roommates/types'

type RoommateCardProps = {
  profile: RoommateProfile
  matchScore?: number
}

// New component, not a RoomCard variant — RoomCard's internals (image
// carousel, rent, amenities) are room-specific and out of scope — but
// matches its established visual conventions (card shell, avatar-fallback
// pattern, pill styles) so it reads as part of the same platform.
export default function RoommateCard({ profile, matchScore }: RoommateCardProps) {
  const initials =
    profile.profiles?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  const shortBio = profile.bio
    ? profile.bio.length > 90 ? profile.bio.slice(0, 90) + '...' : profile.bio
    : null

  return (
    <Link
      href={`/roommates/${profile.id}`}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-teal-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-teal-700"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-sm font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
          {profile.profiles?.avatar_url
            ? // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profiles.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            : initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900 group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
            {profile.profiles?.full_name || 'Student'}
          </p>
          {profile.universities && (
            <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
              <GraduationCap className="h-3 w-3 shrink-0" />
              {profile.universities.name}
            </p>
          )}
        </div>
        {matchScore != null && (
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{matchScore}%</p>
            <p className="text-[10px] text-gray-400">match</p>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {profile.localities && (
          <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
            <MapPin className="h-3 w-3 shrink-0" />
            {profile.localities.name}
          </span>
        )}
        {profile.budget_min != null && profile.budget_max != null && (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            <Wallet className="h-3 w-3 shrink-0" />
            ৳{profile.budget_min.toLocaleString('en-US')}–৳{profile.budget_max.toLocaleString('en-US')}
          </span>
        )}
        {profile.gender === 'male' && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            Male
          </span>
        )}
        {profile.gender === 'female' && (
          <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-600 dark:bg-pink-900/20 dark:text-pink-400">
            Female
          </span>
        )}
      </div>

      {shortBio && (
        <p className="line-clamp-2 text-xs leading-relaxed text-gray-400 dark:text-gray-500">{shortBio}</p>
      )}
    </Link>
  )
}
