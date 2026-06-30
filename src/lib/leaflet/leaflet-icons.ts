import L from 'leaflet'

// Leaflet's default icon setup reaches into a private/internal method that
// isn't part of its public TypeScript types, so we narrow with `unknown`
// instead of `any` to safely delete it.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
})