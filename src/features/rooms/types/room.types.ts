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

  // Basic amenities
  wifi: boolean
  gas: boolean
  electricity: boolean

  // Extended facilities
  ac?: boolean
  attached_bath?: boolean
  study_table?: boolean
  parking?: boolean
  laundry?: boolean
  cctv?: boolean

  // Additional monthly costs
  electricity_bill?: number | null
  maid_bill?: number | null
  other_bill?: number | null
  other_bill_label?: string | null

  images: string[] | null
  description?: string | null
  views?: number
  created_at?: string

  profiles?: RoomOwner | null
}

// Helper: rooms where rent = per seat price
export function isSharedRoom(type: RoomType): boolean {
  return type === 'mess' || type === 'bachelor' || type === 'sublet'
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  mess: '🍳 Mess',
  bachelor: '🛋 Bachelor',
  sublet: '🔑 Sublet',
  single: '🛏 Single Room',
  master_bedroom: '🏠 Master Bedroom',
}
