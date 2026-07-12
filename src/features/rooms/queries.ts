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
  // University uuids (never slugs — slugs are a URL-only encoding resolved
  // to ids before reaching this filter, see resolveUniversityIdsBySlug).
  universityIds: string[]
}

export const EMPTY_FILTERS: RoomFilters = {
  query: '',
  location: '',
  gender: '',
  type: '',
  maxRent: '',
  sort: 'newest',
  availableMonth: '',
  universityIds: [],
}

// PostgREST `.or()` filter strings are comma/paren-delimited, so raw user
// text containing , ( ) or quotes would break out of the intended expression
// (harmless for data exposure — rooms are public — but it turns searches
// into 400/500 errors). Replace those delimiters with spaces.
export function sanitizeFilterText(input: string): string {
  return input.replace(/[,()"'\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Shared between the listings Server Component (initial page load) and the
// client component (filter changes / infinite scroll) so both always build
// the exact same query.
export function buildRoomsQuery(supabase: SupabaseClient, filters: RoomFilters) {
  const { gender, type, maxRent, sort, availableMonth } = filters
  const query = sanitizeFilterText(filters.query)
  const location = sanitizeFilterText(filters.location)

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
  if (filters.universityIds.length > 0) qb = qb.overlaps('nearest_university_ids', filters.universityIds)

  if (sort === 'price_asc') {
    qb = qb.order('rent', { ascending: true })
  } else if (sort === 'price_desc') {
    qb = qb.order('rent', { ascending: false })
  } else {
    qb = qb.order('created_at', { ascending: false })
  }

  return qb
}
