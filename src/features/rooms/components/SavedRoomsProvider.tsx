'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

type SavedRoomsContextValue = {
  userId: string | null
  isSaved: (roomId: string) => boolean
  toggleSaved: (roomId: string) => Promise<void>
}

const SavedRoomsContext = createContext<SavedRoomsContextValue>({
  userId: null,
  isSaved: () => false,
  toggleSaved: async () => {},
})

// One query for the whole session instead of one per RoomCard. Every card on
// screen used to independently call auth.getUser() + its own saved_rooms
// lookup (2×N requests on a 12-card grid); this loads the user's saved room
// ids once and shares them via context.
export default function SavedRoomsProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function loadSaved(uid: string | null) {
      if (!uid) {
        if (!cancelled) {
          setUserId(null)
          setSavedIds(new Set())
        }
        return
      }
      const { data } = await supabase
        .from('saved_rooms')
        .select('room_id')
        .eq('user_id', uid)
      if (cancelled) return
      setUserId(uid)
      setSavedIds(new Set((data ?? []).map((row) => row.room_id as string)))
    }

    // getSession reads the locally stored session (no network round-trip);
    // fine here since this only drives UI state, not authorization.
    supabase.auth.getSession().then(({ data }) => loadSaved(data.session?.user.id ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        loadSaved(session?.user.id ?? null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const isSaved = useCallback((roomId: string) => savedIds.has(roomId), [savedIds])

  const toggleSaved = useCallback(async (roomId: string) => {
    if (!userId) return
    const wasSaved = savedIds.has(roomId)

    // Optimistic update — shared state, so every card for this room stays in sync
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(roomId)
      else next.add(roomId)
      return next
    })

    const { error } = wasSaved
      ? await supabase.from('saved_rooms').delete().eq('user_id', userId).eq('room_id', roomId)
      : await supabase.from('saved_rooms').insert({ user_id: userId, room_id: roomId })

    if (error) {
      // Roll back on failure
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(roomId)
        else next.delete(roomId)
        return next
      })
    }
  }, [userId, savedIds])

  return (
    <SavedRoomsContext.Provider value={{ userId, isSaved, toggleSaved }}>
        {children}
    </SavedRoomsContext.Provider>   
  )
}

export function useSavedRooms() {
  return useContext(SavedRoomsContext)
}
