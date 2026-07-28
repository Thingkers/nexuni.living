import type { RoomType, GenderType } from '@/features/rooms/types/room.types'

export const ROOM_TYPES = ['mess', 'bachelor', 'sublet', 'single', 'master_bedroom'] as const satisfies readonly RoomType[]
export const GENDER_TYPES = ['male', 'female', 'any'] as const satisfies readonly GenderType[]

export const GENDER_TYPE_LABELS: Record<GenderType, string> = {
  male: 'Male',
  female: 'Female',
  any: 'Any',
}

export const AMENITY_KEYS = [
  'wifi', 'gas', 'electricity',
  'attached_bath', 'study_table', 'generator', 'lift', 'fridge',
  'maid_service', 'security', 'water_filter', 'balcony',
] as const

export const HOUSE_RULE_OPTIONS = [
  'No Smoking',
  'No Drugs',
  'No Pets',
  'No Male Visitors',
  'No Female Visitors',
] as const
