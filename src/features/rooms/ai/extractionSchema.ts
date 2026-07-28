import { z } from 'zod'
import { AMENITY_KEYS, GENDER_TYPES, HOUSE_RULE_OPTIONS, ROOM_TYPES } from '@/features/rooms/constants'

// Shape mirrors `INITIAL_FORM` in src/app/post-room/page.tsx (string-typed
// numeric fields, not the raw `rooms` DB column types) — the API route's
// response is merged directly into that form's React state via
// `setForm(prev => ({ ...prev, ...extracted }))`. Every field is optional:
// the model only fills in what it actually found in the pasted text.
export const roomExtractionSchema = z.object({
  title: z.string().max(100).optional(),
  type: z.enum(ROOM_TYPES).optional(),
  gender_type: z.enum(GENDER_TYPES).optional(),
  rent: z.string().optional(),
  total_seats: z.string().optional(),
  location_name: z.string().max(200).optional(),
  available_from: z.string().optional(), // yyyy-mm-dd
  description: z.string().max(1000).optional(),
  advance_deposit: z.string().max(100).optional(),
  rent_inclusive: z.boolean().optional(),
  meal_available: z.boolean().optional(),
  washroom_sharing: z.string().optional(),
  electricity_bill: z.string().optional(),
  maid_bill: z.string().optional(),
  other_bill: z.string().optional(),
  other_bill_label: z.string().max(50).optional(),
  house_rules: z.array(z.enum(HOUSE_RULE_OPTIONS)).optional(),
  landmarks: z.array(z.object({ name: z.string(), time: z.string() })).max(6).optional(),
  ...Object.fromEntries(AMENITY_KEYS.map((key) => [key, z.boolean().optional()])),
})

export type RoomExtractionResult = z.infer<typeof roomExtractionSchema>

// Anthropic tool input_schema (JSON Schema), built from the same constants
// as the zod schema above so the two can't drift apart.
export const ROOM_EXTRACTION_TOOL = {
  name: 'extract_room_listing',
  description:
    'Extract structured student-housing listing fields from a raw, unstructured post (Bangla and/or English). Only include a field if the text actually supports it — omit anything not mentioned rather than guessing.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'A short, clear listing title (max ~100 chars).' },
      type: { type: 'string', enum: ROOM_TYPES, description: 'mess/bachelor/sublet = shared seat-based rooms; single/master_bedroom = one private room.' },
      gender_type: { type: 'string', enum: GENDER_TYPES },
      rent: { type: 'string', description: 'Monthly rent as digits only, no currency symbol or commas.' },
      total_seats: { type: 'string', description: 'Number of seats if a shared room; omit for single/master_bedroom.' },
      location_name: { type: 'string', description: 'Free-text location/address as written (area, block, road).' },
      available_from: { type: 'string', description: 'Date in yyyy-mm-dd. If only a month/year is given, use day 01. If year is omitted, infer the nearest future occurrence relative to the given current date.' },
      description: { type: 'string', description: 'A short clean paragraph covering anything notable not already captured in the other fields. Never include phone numbers or "inbox/contact me" instructions.' },
      advance_deposit: { type: 'string', description: 'Advance/deposit terms as free text, e.g. "1 month advance".' },
      rent_inclusive: { type: 'boolean', description: 'true only if the text says utilities (gas/electricity/water) are included in rent.' },
      meal_available: { type: 'boolean', description: 'true only for mess-type listings that mention a meal/food system.' },
      washroom_sharing: { type: 'string', description: 'Number of people sharing the attached washroom, if mentioned.' },
      electricity_bill: { type: 'string' },
      maid_bill: { type: 'string' },
      other_bill: { type: 'string' },
      other_bill_label: { type: 'string' },
      house_rules: { type: 'array', items: { type: 'string', enum: HOUSE_RULE_OPTIONS } },
      landmarks: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, time: { type: 'string' } },
          required: ['name', 'time'],
        },
        description: 'Nearby landmarks with a distance/time, e.g. {"name":"AIUB main gate","time":"5 min"}.',
      },
      ...Object.fromEntries(
        AMENITY_KEYS.map((key) => [key, { type: 'boolean', description: `true only if "${key.replace('_', ' ')}" is explicitly mentioned.` }]),
      ),
    },
    required: [],
  },
}
