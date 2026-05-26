const KEY = 'recently-viewed-rooms'

export function saveRecentlyViewed(roomId: string) {
  if (typeof window === 'undefined') return

  const current: string[] = JSON.parse(
    localStorage.getItem(KEY) || '[]',
  )

  const updated = [
    roomId,
    ...current.filter((id) => id !== roomId),
  ].slice(0, 12)

  localStorage.setItem(
    KEY,
    JSON.stringify(updated),
  )
}

export function getRecentlyViewed() {
  if (typeof window === 'undefined') return []

  return JSON.parse(
    localStorage.getItem(KEY) || '[]',
  ) as string[]
}