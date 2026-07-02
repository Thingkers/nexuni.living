import type { SupabaseClient } from '@supabase/supabase-js'

export const LISTINGS_PAGE_SIZE = 12

export type RoomFilters = {
  query: string
  location: string
  gender: string
  type: string
  maxRent: string
  sort: string
  availableMonth: string
}

export const EMPTY_FILTERS: RoomFilters = {
  query: '',
  location: '',
  gender: '',
  type: '',
  maxRent: '',
  sort: 'newest',
  availableMonth: '',
}

// Shared between the listings Server Component (initial page load) and the
// client component (filter changes / infinite scroll) so both always build
// the exact same query.
export function buildRoomsQuery(supabase: SupabaseClient, filters: RoomFilters) {
  const { query, location, gender, type, maxRent, sort, availableMonth } = filters

  let qb = supabase.from('rooms').select(`
    *,
    profiles(full_name, phone, avatar_url, is_verified)
  `, { count: 'exact' })
    .neq('status', 'booked')
    .neq('status', 'closed')

  if (query.trim()) {
    const words = query.trim().split(/\s+/)
    if (words.length > 1) {
      qb = qb.textSearch('search_vector', query, { type: 'websearch', config: 'simple' })
    } else {
      qb = qb.or(`title.ilike.%${query}%,location_name.ilike.%${query}%`)
    }
  }
  if (location.trim()) {
    qb = qb.ilike('location_name', `%${location.trim()}%`)
  }
  if (gender) qb = qb.eq('gender_type', gender)
  if (type) qb = qb.eq('type', type)
  if (maxRent) qb = qb.lte('rent', Number(maxRent))
  if (availableMonth) qb = qb.lte('available_from', `${availableMonth}-01`)

  if (sort === 'price_asc') {
    qb = qb.order('rent', { ascending: true })
  } else if (sort === 'price_desc') {
    qb = qb.order('rent', { ascending: false })
  } else {
    qb = qb.order('created_at', { ascending: false })
  }

  return qb
}
