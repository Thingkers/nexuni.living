import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { pushNotification } from '@/lib/notifications/pushNotification'

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

    // =========================
    // MESSAGE NOTIFICATION
    // =========================
    const messageChannel = supabase
      .channel(`notify-message-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const message = payload.new as { sender_id: string; content: string }
          const { data: sender } = await supabase
            .from('profiles').select('full_name').eq('id', message.sender_id).maybeSingle()
          const name = sender?.full_name ?? 'Someone'
          push({
            type: 'message',
            title: `💬 ${name}`,
            body: message.content.slice(0, 80),
            href: `/inbox/${message.sender_id}`,
          })
          pushNotification({ title: `New message from ${name}`, body: message.content.slice(0, 80) })
        },
      )
      .subscribe()

    // =========================
    // TENANT: booking status changed
    // Server-side filter on UPDATE requires REPLICA IDENTITY FULL — use client-side filter instead
    // =========================
    const bookingStatusChannel = supabase
      .channel(`notify-booking-status-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        async (payload) => {
          const newBooking = payload.new as { status: string; room_id: string; user_id: string }
          if (newBooking.user_id !== userId) return

          const map: Record<string, { label: string; emoji: string }> = {
            confirmed: { label: 'Booking Confirmed', emoji: '🎉' },
            rejected:  { label: 'Booking Rejected',  emoji: '❌' },
            cancelled: { label: 'Booking Cancelled', emoji: '🚫' },
          }
          const info = map[newBooking.status]
          if (!info) return

          const { data: room } = await supabase
            .from('rooms').select('title').eq('id', newBooking.room_id).maybeSingle()
          const title = room?.title ?? 'Your booking'

          push({
            type: newBooking.status === 'confirmed' ? 'booking' : 'error',
            title: `${info.emoji} ${info.label}`,
            body: title,
            href: '/dashboard/my-bookings',
          })
          pushNotification({ title: `${info.emoji} ${info.label}`, body: title })
        },
      )
      .subscribe()

    // =========================
    // OWNER: new booking request on my rooms
    // =========================
    let ownerBookingChannel: ReturnType<typeof supabase.channel> | null = null

    supabase.from('rooms').select('id').eq('owner_id', userId).then(({ data: myRooms }) => {
      if (!myRooms || myRooms.length === 0) return

      const roomIds = myRooms.map((r) => r.id)

      ownerBookingChannel = supabase
        .channel(`notify-owner-booking-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bookings' },
          async (payload) => {
            const booking = payload.new as { room_id: string; user_id: string }
            if (!roomIds.includes(booking.room_id)) return

            const [{ data: room }, { data: tenant }] = await Promise.all([
              supabase.from('rooms').select('title').eq('id', booking.room_id).maybeSingle(),
              supabase.from('profiles').select('full_name').eq('id', booking.user_id).maybeSingle(),
            ])

            push({
              type: 'booking',
              title: '📋 New Booking Request',
              body: `${tenant?.full_name ?? 'Someone'} → ${room?.title ?? 'your room'}`,
              href: '/dashboard/bookings',
            })
            pushNotification({
              title: 'New Booking Request',
              body: `${tenant?.full_name ?? 'Someone'} wants to book ${room?.title ?? 'your room'}`,
            })
          },
        )
        .subscribe()
    })

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(bookingStatusChannel)
      if (ownerBookingChannel) supabase.removeChannel(ownerBookingChannel)
    }
  }, [userId, push])

  return {
    toasts,
    push,
    dismiss,
  }
}