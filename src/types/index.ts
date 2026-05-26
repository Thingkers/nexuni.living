export type Profile = {
  id: string
  full_name: string
  email: string
  phone?: string
  university?: string
  avatar_url?: string
}

export type Room = {
  id: string
  owner_id: string
  title: string
  type: string
  gender_type: string
  rent: number
  total_seats: number
  available_seats: number
  status: string
  location_name: string
  available_from: string
  wifi: boolean
  gas: boolean
  electricity: boolean
  images: string[]
  description?: string
  profiles?: Profile
}

export type Booking = {
  id: string
  room_id: string
  user_id: string
  status: string
  move_in_date?: string
  message?: string
  expires_at?: string
}