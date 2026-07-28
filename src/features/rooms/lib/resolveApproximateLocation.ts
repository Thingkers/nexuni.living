import type { Locality } from '@/features/localities/types'

// Most owners skip the optional map picker when posting a room and only type
// a free-text location — so exact latitude/longitude is frequently null. This
// derives an approximate marker position from location_name (or locality_id)
// so the room still shows on a map instead of hiding the whole section.
const AREA_CENTERS: Array<{ terms: string[]; lat: number; lng: number }> = [
  { terms: ['kuratoli', 'kuril'], lat: 23.8259, lng: 90.4204 },
  { terms: ['nikunja'], lat: 23.8315, lng: 90.4153 },
  { terms: ['khilkhet'], lat: 23.8262, lng: 90.4270 },
  { terms: ['bashundhara'], lat: 23.8151, lng: 90.4295 },
  { terms: ['badda'], lat: 23.7805, lng: 90.4266 },
]

function normalizedLocation(value: string | null | undefined) {
  return (value ?? '').normalize('NFC').toLowerCase()
}

// Deterministic small offset so rooms in the same area don't stack on one pin.
function markerOffset(id: string) {
  const hash = [...id].reduce((total, character) => total + character.charCodeAt(0), 0)
  return {
    lat: ((hash % 9) - 4) * 0.00022,
    lng: (((hash * 7) % 9) - 4) * 0.00022,
  }
}

export function resolveApproximateLocation(
  room: { id: string; location_name?: string | null; locality_id?: string | null },
  localities: Locality[],
): { latitude: number; longitude: number } | null {
  const location = normalizedLocation(room.location_name)
  const locality = localities.find((item) => {
    if (room.locality_id && item.id === room.locality_id) return true
    const name = normalizedLocation(item.name)
    return Boolean(name && (location.includes(name) || name.includes(location)))
  })
  const area = AREA_CENTERS.find((item) =>
    item.terms.some((term) => location.includes(term)),
  )
  const lat = locality?.lat ?? area?.lat
  const lng = locality?.lng ?? area?.lng
  if (lat == null || lng == null) return null

  const offset = markerOffset(room.id)
  return { latitude: lat + offset.lat, longitude: lng + offset.lng }
}
