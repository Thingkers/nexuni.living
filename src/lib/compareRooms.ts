const KEY = 'compare-rooms'

export function getComparedRooms() {
  if (typeof window === 'undefined') {
    return []
  }

  return JSON.parse(
    localStorage.getItem(KEY) || '[]',
  ) as string[]
}

export function toggleCompareRoom(roomId: string) {
  const current = getComparedRooms()

  let updated: string[]

  if (current.includes(roomId)) {
    updated = current.filter(
      (id) => id !== roomId,
    )
  } else {
    updated = [...current, roomId].slice(0, 3)
  }

  localStorage.setItem(
    KEY,
    JSON.stringify(updated),
  )

  return updated
}

export function isCompared(roomId: string) {
  return getComparedRooms().includes(roomId)
}