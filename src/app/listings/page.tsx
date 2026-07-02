import { createAnonServerClient } from '@/lib/supabase/server'
import type { Room } from '@/features/rooms/types/room.types'
import { buildRoomsQuery, LISTINGS_PAGE_SIZE, type RoomFilters } from '@/features/rooms/queries'

import ListingsClient from './ListingsClient'

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

// The first page of results is fetched here on the server so the rooms are
// already in the HTML — no blank grid while the client hydrates and fetches.
// Subsequent filtering / infinite scroll stays client-side in ListingsClient.
export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  const filters: RoomFilters = {
    query: first(params.search) || first(params.q),
    location: first(params.location),
    gender: first(params.gender),
    type: first(params.type),
    maxRent: first(params.rent),
    sort: first(params.sort) || 'newest',
    availableMonth: first(params.month),
  }

  let initialRooms: Room[] = []
  let initialCount = 0

  const supabase = createAnonServerClient()
  if (supabase) {
    try {
      // Bounded so a slow/unreachable database degrades to an empty first
      // page (the client can refetch) instead of hanging the whole response.
      const { data, error, count } = await buildRoomsQuery(supabase, filters)
        .range(0, LISTINGS_PAGE_SIZE - 1)
        .abortSignal(AbortSignal.timeout(5000))
      if (!error) {
        initialRooms = (data ?? []) as Room[]
        initialCount = count ?? 0
      }
    } catch {
      // Fall through with empty results — the client can still filter/retry.
    }
  }

  return (
    <ListingsClient
      initialFilters={filters}
      initialRooms={initialRooms}
      initialCount={initialCount}
    />
  )
}
