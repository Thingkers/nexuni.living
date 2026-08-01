'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'
import type { AdminModuleKey } from '@/config/modules'

export type ViewerCapabilities = {
  loading: boolean
  user: User | null
  isAuthenticated: boolean
  isVerified: boolean
  isModerator: boolean
  isAdmin: boolean
  canPost: boolean
  moduleAdmin: AdminModuleKey[]
}

const ANONYMOUS: ViewerCapabilities = {
  loading: true,
  user: null,
  isAuthenticated: false,
  isVerified: false,
  isModerator: false,
  isAdmin: false,
  canPost: false,
  moduleAdmin: [],
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

      const [{ data: profile }, { data: moduleRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('role, verification_status')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('module_admins')
          .select('module')
          .eq('user_id', user.id),
      ])

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
        moduleAdmin: (moduleRows ?? []).map((row) => row.module as AdminModuleKey),
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
