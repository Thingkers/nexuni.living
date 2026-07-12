import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Locality } from '@/features/localities/types'

// Mirrors useUniversities() — localities is a small, slow-changing
// reference table, fetched once rather than re-queried per keystroke.
export function useLocalities() {
  const [localities, setLocalities] = useState<Locality[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('localities')
      .select('id, name, name_bn, slug, lat, lng')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return
        setLocalities((data ?? []) as Locality[])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { localities, loading }
}
