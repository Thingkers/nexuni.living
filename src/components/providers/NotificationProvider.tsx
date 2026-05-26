'use client'

import AppToasts from '@/components/ui/AppToasts'
import { useNotification } from '@/hooks/useNotification'
import { useEffect } from 'react'
import { requestNotificationPermission } from '@/lib/notifications/requestPermission'

export default function NotificationProvider() {
  const { toasts, dismiss } = useNotification()

  // ✅ FIX: add useEffect here
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return <AppToasts toasts={toasts} onDismiss={dismiss} />
}