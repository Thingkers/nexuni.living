// Unlike universities, localities has no `aliases` column — Bangla/English
// matching here can only use name/name_bn substring matching.
export type Locality = {
  id: string
  name: string
  name_bn: string | null
  slug: string
  lat: number | null
  lng: number | null
}
