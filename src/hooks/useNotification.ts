import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

export type ToastType = 'message' | 'booking' | 'success' | 'error'

export type AppToast = {
  id: string
  type: ToastType
  title: string
  body: string
  href?: string
}

export function useNotification() {
  const [toasts, setToasts] = useState<AppToast[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const push = useCallback((toast: Omit<AppToast, 'id'>) => {
    const id = crypto.randomUUID()

    setToasts((previous) => [...previous, { ...toast, id }])

    setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id))
    }, 4500)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((item) => item.id !== id))
  }, [])

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()

      if (data.user) {
        setUserId(data.user.id)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return

    const messageChannel = supabase
      .channel(`notify-message-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const message = payload.new as {
            sender_id: string
            content: string
          }

          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', message.sender_id)
            .maybeSingle()

          push({
            type: 'message',
            title: 'New message',
            body: `${sender?.full_name ?? 'Someone'}: ${message.content.slice(0, 60)}`,
            href: `/inbox/${message.sender_id}`,
          })
        },
      )
      .subscribe()

    const bookingChannel = supabase
      .channel(`notify-booking-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const oldBooking = payload.old as {
            status: string
          }

          const newBooking = payload.new as {
            status: string
            room_id: string
          }

          if (newBooking.status === oldBooking.status) return

          const { data: room } = await supabase
            .from('rooms')
            .select('title')
            .eq('id', newBooking.room_id)
            .maybeSingle()

          push({
            type: 'booking',
            title:
              newBooking.status === 'confirmed'
                ? 'Booking confirmed 🎉'
                : 'Booking status updated',
            body: room?.title ?? 'Your booking request has been updated',
            href: '/profile',
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(bookingChannel)
    }
  }, [userId, push])

  return {
    toasts,
    push,
    dismiss,
  }
}