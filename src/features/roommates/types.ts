export type RoommateStatus = 'draft' | 'active' | 'paused' | 'archived'
export type RoommateGender = 'male' | 'female'
export type PreferredGender = 'male' | 'female' | 'any'
export type SleepSchedule = 'early_bird' | 'night_owl' | 'flexible'
export type CleanlinessLevel = 'relaxed' | 'moderate' | 'very_clean'
export type SmokingPreference = 'smoker' | 'non_smoker'
export type GuestPreference = 'rarely' | 'sometimes' | 'often'

export type RoommateProfileOwner = {
  full_name: string | null
  avatar_url: string | null
  is_verified?: boolean | null
}

export type RoommateProfile = {
  id: string
  user_id: string
  status: RoommateStatus

  bio: string | null
  gender: RoommateGender | null
  age: number | null

  university_id: string | null
  locality_id: string | null

  budget_min: number | null
  budget_max: number | null

  sleep_schedule: SleepSchedule | null
  cleanliness_level: CleanlinessLevel | null
  smoking_preference: SmokingPreference | null
  guest_preference: GuestPreference | null

  preferred_gender: PreferredGender | null
  preferred_university_id: string | null

  created_at: string
  updated_at: string

  profiles?: RoommateProfileOwner | null
  universities?: { name: string; slug: string } | null
  localities?: { name: string; slug: string } | null
}
