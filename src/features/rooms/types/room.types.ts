export type RoomStatus = 'open' | 'partial' | 'booked' | 'closed'
export type RoomType = 'mess' | 'bachelor' | 'sublet' | 'single' | 'master_bedroom'
export type GenderType = 'male' | 'female' | 'any'

export type RoomOwner = {
  full_name: string | null
  email: string | null
  avatar_url?: string | null
  university?: string | null
  phone?: string | null
  is_verified?: boolean | null
}

export type Room = {
  id: string
  owner_id: string
  title: string
  type: RoomType
  gender_type: GenderType
  rent: number
  total_seats: number
  available_seats: number
  status: RoomStatus
  available_from: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  locality_id?: string | null
  nearest_university_ids?: string[]

  // Basic amenities
  wifi: boolean
  gas: boolean
  electricity: boolean

  // Extended facilities
  attached_bath?: boolean
  study_table?: boolean
  generator?: boolean
  lift?: boolean
  fridge?: boolean
  maid_service?: boolean
  security?: boolean
  water_filter?: boolean
  balcony?: boolean

  // Additional monthly costs
  electricity_bill?: number | null
  maid_bill?: number | null
  other_bill?: number | null
  other_bill_label?: string | null

  // New fields
  advance_deposit?: string | null
  rent_inclusive?: boolean
  university_priority?: string | null
  house_rules?: string[] | null
  washroom_sharing?: number | null
  meal_available?: boolean
  landmarks?: { name: string; time: string }[] | null

  images: string[] | null
  description?: string | null
  created_at?: string

  profiles?: RoomOwner | null
}

// Helper: rooms where rent = per seat price
export function isSharedRoom(type: RoomType): boolean {
  return type === 'mess' || type === 'bachelor' || type === 'sublet'
}

// Message keys under the "RoomType" namespace in messages/{locale}.json —
// exhaustively typed (satisfies Record<RoomType, string>) so a new RoomType
// added later without updating this map fails to typecheck, rather than
// silently rendering a raw key on screen. Used by RoomCard.tsx, which has
// useTranslations() available; pages not yet converted to next-intl
// (this session only translates the homepage) keep using the plain-English
// ROOM_TYPE_LABELS below.
export const ROOM_TYPE_MESSAGE_KEYS = {
  mess: 'mess',
  bachelor: 'bachelor',
  sublet: 'sublet',
  single: 'single',
  master_bedroom: 'master_bedroom',
} as const satisfies Record<RoomType, string>

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  mess: 'Mess',
  bachelor: 'Bachelor',
  sublet: 'Sublet',
  single: 'Single Room',
  master_bedroom: 'Master Bedroom',
}
