export type RoomStatus = 'open' | 'partial' | 'booked' | 'closed'
export type RoomType = 'mess' | 'bachelor' | 'sublet'
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
  wifi: boolean
  gas: boolean
  electricity: boolean
  images: string[] | null
  description?: string | null
  created_at?: string

  // ✅ FIX: always single object, never array
  profiles?: RoomOwner | null
}