import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { University } from '@/features/universities/types'

// The universities table is a small, slow-changing reference table (dozens
// of rows even at full national scale) — fetched once here rather than
// re-queried per keystroke like the room-search autocompletes elsewhere in
// the app, which back a large, frequently-changing table instead.
export function useUniversities() {
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('universities')
      .select('id, name, name_bn, slug, aliases, lat, lng')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return
        setUniversities((data ?? []) as University[])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { universities, loading }
}
