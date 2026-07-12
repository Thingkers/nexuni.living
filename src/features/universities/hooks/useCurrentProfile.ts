import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Same session-read pattern as SavedRoomsProvider, but scoped to just the
// fields "Near My Campus" needs — not folded into SavedRoomsProvider itself
// since that context's contract (isSaved/toggleSaved) is unrelated, and
// every RoomCard on every page consumes it.
export function useCurrentProfile() {
  const [userId, setUserId] = useState<string | null>(null)
  const [universityId, setUniversityId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load(uid: string | null) {
      if (!uid) {
        if (!cancelled) {
          setUserId(null)
          setUniversityId(null)
        }
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', uid)
        .maybeSingle()
      if (cancelled) return
      setUserId(uid)
      setUniversityId(data?.university_id ?? null)
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        load(session?.user.id ?? null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { userId, universityId }
}
