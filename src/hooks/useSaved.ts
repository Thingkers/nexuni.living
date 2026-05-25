'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

export function useSaved(roomId: string) {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSaved() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        setLoading(false)
        return
      }

      setUserId(authData.user.id)

      const { data } = await supabase
        .from('saved_rooms')
        .select('id')
        .eq('user_id', authData.user.id)
        .eq('room_id', roomId)
        .maybeSingle()

      setIsSaved(!!data)
      setLoading(false)
    }

    checkSaved()
  }, [roomId])

  async function toggleSaved() {
    if (!userId) {
      router.push('/auth/login')
      return
    }

    const previous = isSaved
    setIsSaved(!previous)

    if (previous) {
      const { error } = await supabase
        .from('saved_rooms')
        .delete()
        .eq('user_id', userId)
        .eq('room_id', roomId)

      if (error) setIsSaved(previous)
    } else {
      const { error } = await supabase.from('saved_rooms').insert({
        user_id: userId,
        room_id: roomId,
      })

      if (error) setIsSaved(previous)
    }
  }

  return {
    isSaved,
    loading,
    toggleSaved,
  }
}