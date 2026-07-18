'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

export type ViewerCapabilities = {
  loading: boolean
  user: User | null
  isAuthenticated: boolean
  isVerified: boolean
  isModerator: boolean
  isAdmin: boolean
  canPost: boolean
}

const ANONYMOUS: ViewerCapabilities = {
  loading: true,
  user: null,
  isAuthenticated: false,
  isVerified: false,
  isModerator: false,
  isAdmin: false,
  canPost: false,
}

export default function useViewerCapabilities(): ViewerCapabilities {
  const [capabilities, setCapabilities] = useState(ANONYMOUS)

  useEffect(() => {
    let active = true

    async function resolve(user: User | null) {
      if (!active) return
      if (!user) {
        setCapabilities({ ...ANONYMOUS, loading: false })
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return
      const role = profile?.role ?? 'student'
      const isVerified = profile?.verification_status === 'approved'
      setCapabilities({
        loading: false,
        user,
        isAuthenticated: true,
        isVerified,
        isModerator: role === 'moderator' || role === 'admin',
        isAdmin: role === 'admin',
        canPost: isVerified,
      })
    }

    void supabase.auth.getSession().then(({ data }) => resolve(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolve(session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return capabilities
}
