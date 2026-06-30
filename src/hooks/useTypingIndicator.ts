'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Props = {
  roomId: string
  currentUserId: string
}

export function useTypingIndicator({ roomId, currentUserId }: Props) {
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!roomId || !currentUserId) return

    const channel = supabase
      .channel(`typing-${roomId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === currentUserId) return

        setTypingUsers((prev) => {
          if (prev.includes(payload.userName)) return prev
          return [...prev, payload.userName]
        })

        setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((name) => name !== payload.userName),
          )
        }, 2000)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, currentUserId])

  function sendTyping(userName: string) {
    if (!channelRef.current) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUserId,
        userName,
      },
    })
  }

  return { typingUsers, sendTyping }
}